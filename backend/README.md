# StealthPay Backend

API and database for StealthPay invoice metadata. Uses **Neon** (PostgreSQL).

## Setup

### 1. Create a Neon database

1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a project
3. Copy the connection string (Connection details → Connection string)

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` — Neon connection string (e.g. `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
- `ENCRYPTION_KEY` — 64-char hex key for encrypting addresses (generate with `openssl rand -hex 32`)

### 3. Create tables

Run the schema (uses `DATABASE_URL` from `.env`):

```bash
npm run setup-db
```

Or paste the contents of `db_schema.sql` into the Neon SQL Editor.

### 4. Install and run

```bash
npm install
npm run dev
```

API runs at `http://localhost:3000`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invoices` | List invoices (query: `status`, `limit`, `merchant`) |
| GET | `/api/invoices/merchant/:address` | Invoices by merchant |
| GET | `/api/invoices/recent` | Recent invoices |
| GET | `/api/invoice/:hash` | Single invoice by hash |
| POST | `/api/invoices` | Create/upsert invoice |
| PATCH | `/api/invoices/:hash` | Update invoice (status, payment_tx_ids, payer_address) |
