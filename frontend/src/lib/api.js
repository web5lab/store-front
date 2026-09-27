import axiosInstance from '@/axios/axiosInstance';
import { saveFile } from '@/lib/platform';

/**
 * Every server call, in one place.
 *
 * Failures come back as an ApiError carrying the server's own wording, so the
 * UI shows "Not enough stock for Tee. 3 left" rather than "Request failed".
 */

export class ApiError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function readBlobError(error) {
  const blob = error.response?.data;
  if (blob instanceof Blob) {
    try {
      return JSON.parse(await blob.text());
    } catch {
      return null;
    }
  }
  return blob;
}

async function call(method, url, { body, params, responseType } = {}) {
  try {
    const response = await axiosInstance.request({ method, url, data: body, params, responseType });
    return responseType === 'blob' ? response : response.data;
  } catch (error) {
    const data = await readBlobError(error);
    throw new ApiError(data?.message || (error.response ? 'The request failed.' : 'Cannot reach the server. Check that the API is running.'), {
      code: data?.code,
      status: error.response?.status,
      details: data?.details,
    });
  }
}

const get = (url, params) => call('get', url, { params }).then((r) => r.data);
const post = (url, body) => call('post', url, { body });
const put = (url, body) => call('put', url, { body });
const patch = (url, body) => call('patch', url, { body });
const del = (url) => call('delete', url);

/** Build multipart form data, skipping empty values. Files ride along as-is. */
export function toForm(values) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !(value instanceof Blob)) form.append(key, JSON.stringify(value));
    else form.append(key, value);
  }
  return form;
}

const partyApi = (base) => ({
  list: (params) => get(`/${base}`, params),
  get: (id) => get(`/${base}/${id}`),
  create: (values) => post(`/${base}`, toForm(values)),
  update: (id, values) => put(`/${base}/${id}`, toForm(values)),
  remove: (id) => del(`/${base}/${id}`),
  ledger: (id) => get(`/${base}/${id}/ledger`),
  addEntry: (id, body) => post(`/${base}/${id}/ledger`, body),
});

const transactionApi = (base) => ({
  list: (params) => get(`/${base}`, params),
  get: (id) => get(`/${base}/${id}`),
  create: (values) => post(`/${base}`, toForm(values)),
  pay: (id, body) => post(`/${base}/${id}/payments`, body),
});

export const api = {
  auth: {
    login: (body) => post('/auth/login', body),
    me: () => get('/auth/me'),
    changePassword: (body) => post('/auth/change-password', body),
    users: () => get('/auth/users'),
    createUser: (body) => post('/auth/users', body),
    updateUser: (id, body) => patch(`/auth/users/${id}`, body),
  },

  dashboard: () => get('/dashboard'),

  shop: {
    get: () => get('/settings/shop'),
    update: (body) => put('/settings/shop', body),
  },

  categories: {
    list: () => get('/categories'),
    create: (body) => post('/categories', body),
    update: (id, body) => put(`/categories/${id}`, body),
    remove: (id) => del(`/categories/${id}`),
  },

  products: {
    list: (params) => get('/products', params),
    get: (id) => get(`/products/${id}`),
    create: (values) => post('/products', toForm(values)),
    update: (id, values) => put(`/products/${id}`, toForm(values)),
    adjust: (id, body) => post(`/products/${id}/adjust`, body),
    remove: (id) => del(`/products/${id}`),
  },

  customers: partyApi('customers'),
  suppliers: partyApi('suppliers'),
  sales: transactionApi('sales'),
  purchases: transactionApi('purchases'),

  reports: {
    preview: (kind, params) => get(`/reports/${kind}`, { ...params, format: 'json' }),
    /** Downloads through the authenticated client, then hands the file to the browser. */
    download: async (kind, format, params) => {
      const response = await call('get', `/reports/${kind}`, { params: { ...params, format }, responseType: 'blob' });
      const disposition = response.headers['content-disposition'] || '';
      const name = disposition.match(/filename="([^"]+)"/)?.[1] || `${kind}-report.${format}`;
      await saveFile(response.data, name);
      return name;
    },
  },
};

/** The API for a party type or a transaction kind, by the name used in URLs. */
export const partyBook = (type) => (type === 'customer' ? api.customers : api.suppliers);
export const tradeBook = (kind) => (kind === 'sale' ? api.sales : api.purchases);
