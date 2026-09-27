const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrShort = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });
const count = new Intl.NumberFormat('en-IN');

export const money = (value) => inr.format(Number(value) || 0);
export const moneyShort = (value) => inrShort.format(Number(value) || 0);
export const number = (value) => count.format(Number(value) || 0);

export const date = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

/** "Today", "Yesterday", or a date — for lists people scan by recency. */
export function relativeDay(value) {
  const d = new Date(value);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return date(value);
}

/** YYYY-MM-DD for <input type="date">, in local time. */
export const isoDay = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

/**
 * A date-picker day as the server should store it: today means "now" (so the
 * time of sale is kept), any other day means local noon on that day. Sending a
 * bare YYYY-MM-DD would be read as UTC midnight — 5:30 am in India.
 */
export const dayToISO = (day) => (!day || day === isoDay() ? undefined : new Date(`${day}T12:00:00`).toISOString());
