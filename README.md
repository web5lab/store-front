# Stockbook — Inventory (React + Express + MongoDB)

A rewrite of `../python-project` (Flask + SQLite) as a React frontend and an
Express API on MongoDB, laid out the same way as the Infographic AI project.

```
react-project/
  backend/    Express 5 API · Mongoose · JWT        → see backend/README.md
  frontend/   React 19 · Vite · Tailwind 4 · Redux Toolkit
```

## Run it

MongoDB must be running locally (`brew services start mongodb-community`).

```bash
cd backend && npm install && npm run dev      # API on http://localhost:5050
cd frontend && npm install && npm run dev     # app on http://localhost:5173
```

Sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `backend/.env`, then change
the password under **Settings**. Fill in your shop name and GSTIN there too —
they print at the top of every bill.

### Bring over the old data
```bash
cd backend && npm run migrate:sqlite -- ../../python-project/data/inventory.db
```
Categories, customers, suppliers, products, sales, purchases, photos and
attachments are copied. Party ledgers are rebuilt from the invoices (see below).

## Frontend structure
```
src/
  axios/axiosInstance.js    token header, sign-out on 401
  lib/api.js                every API call; errors carry the server's message
  lib/format.js             ₹ and date formatting (en-IN)
  lib/useApi.js             fetch-on-mount hook, debounced search
  store/                    Redux: only who is signed in
  layouts/DashboardLayout   sidebar shell
  components/ui/            Button, Field, Modal/Drawer, Confirm, Combobox, Stamp, StockGauge…
  pages/                    Dashboard, products/, parties/, transactions/, Accounts, Reports, Settings
```

## What changed from the Python version
- **Ledger fix.** The old app posted only the unpaid part of a bill as a debit
  and the paid part as a credit, so a ₹500 sale with ₹400 paid showed the
  customer at −₹300. Bills now post the full total, payments post separately.
- **Stock safety.** Sales decrement stock with a conditional update, so two
  tills cannot sell the last unit twice. Stock is only changed by bills or a
  recorded adjustment with a reason — each has a history line.
- **Payments against bills**, customer/supplier statements with running
  balance, edit/delete for every record, staff accounts, sequential invoice
  numbers (SAL-000001), shop details on printed bills.
- **Uploads** are checked by extension, MIME type and file signature.
# store-front
