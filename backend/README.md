# Inventory API — Express + MongoDB

## Structure
```
backend/
  index.js                 # app wiring, boot
  config/                  # env.js (loads .env first), db.js
  schemas/                 # Mongoose models
  controllers/             # request → response, thin
  services/                # business rules: billing, ledger, reports, exports
  routes/                  # URL → middleware → controller
  middlewares/             # auth (JWT), errors, rate limits, uploads
  lib/validate.js          # money rounding and input checks
  scripts/                 # seed admin, migrate from the old SQLite DB
  uploads/                 # stored files (random names)
```

## Run
```bash
cp .env.example .env   # set JWT_SECRET and ADMIN_PASSWORD
npm install
npm run dev            # http://localhost:5050
```
The first administrator is created from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on first boot.

## Import data from the Python version
```bash
npm run migrate:sqlite -- ../../python-project/data/inventory.db
```

## API (all under /api, Bearer token except login)
| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`, `GET/POST /auth/users`, `PATCH /auth/users/:id` (admin) |
| Dashboard | `GET /dashboard` |
| Categories | `GET/POST /categories`, `PUT/DELETE /categories/:id` |
| Products | `GET/POST /products`, `GET/PUT/DELETE /products/:id`, `POST /products/:id/adjust` |
| Customers / Suppliers | `GET/POST /customers`, `GET/PUT/DELETE /customers/:id`, `GET/POST /customers/:id/ledger` (same for `/suppliers`) |
| Sales / Purchases | `GET/POST /sales`, `GET /sales/:id`, `POST /sales/:id/payments` (same for `/purchases`) |
| Settings | `GET /settings/shop`, `PUT /settings/shop` (admin) — shop name, address, GSTIN printed on bills |
| Reports | `GET /reports/:kind?format=json|pdf|docx|xlsx&from=&to=&party=` — kinds: `sales`, `purchases`, `stock`, `ledger` |
