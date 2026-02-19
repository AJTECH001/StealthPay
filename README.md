# StealthPay

**Privacy-first payments on Aleo** — private-by-default transactions with selective disclosure for compliance and verification.

---

## What is StealthPay?

StealthPay is a decentralized payment system built on [Aleo](https://aleo.org) that enables **private invoice-based payments** on top of Aleo Credits. Merchants create invoices and receive payments privately; payers stay off the public ledger; only the merchant receives a cryptographic `Payment` record (receipt) for verification. StealthPay adds an **invoice layer**—commitment hashes, expiry, replay protection—on top of Aleo's native private transfers.

**Program ID:** `stealthpay.aleo` · **Network:** Aleo Testnet

---

## Why StealthPay-App?

**stealthpay-app** is the full-stack application that brings StealthPay from on-chain program to a usable product. The Leo contract (`stealthpay.aleo`) defines the payment logic; the app provides:

- **Web UI** — Create invoices, pay via links, view activity, settle multi-pay campaigns
- **Backend API** — Invoice indexing, stats, merchant lookups (Neon PostgreSQL)
- **Wallet integration** — Leo Wallet adapter for signing and executing private transactions

Without the app, users would need to interact with the contract via CLI or custom scripts. The app makes StealthPay accessible to merchants and payers who want a familiar web experience while preserving full on-chain privacy.

---

## Problem We Are Solving

### The Transparency Paradox

On public blockchains (Ethereum, Bitcoin, etc.), every transaction is visible to everyone. Balances, addresses, and amounts are permanently public. Users face a choice:

- **Total surveillance** — Accept that all spending and holdings are visible to anyone
- **Total obscurity** — Use mixers or privacy coins that sacrifice verifiability

Merchants need **proof of payment** (for accounting, refunds, audits). Payers want **financial privacy** (no public transaction graph). Traditional blockchains force a trade-off: you can't have both without trust in intermediaries.

### The StealthPay Angle

Aleo uses **zero-knowledge proofs** to execute programs privately. State and logic run off-chain; only validity proofs are published. StealthPay builds on this to give:

- **Private by default** — Sender identity and balances stay off the public ledger
- **Verifiable by design** — Merchants get cryptographic proof of payment
- **Selectively disclosable** — Merchants can reveal specific payments for audits or refunds without exposing unrelated history

---

## StealthPay Approach

### 1. Invoice Flow (Commitment + Replay Protection)

| Step | What happens |
|------|--------------|
| **Create invoice** | Merchant commits to (merchant, amount, salt) via hash. Only the hash and status go on-chain—amount and merchant stay private. |
| **Pay invoice** | Payer uses `pay_invoice` with a private credits record. The program transfers credits to the merchant and emits a private `Payment` record. Replay protection uses a receipt key (payment secret + salt). |
| **Settle** | Standard invoices auto-settle on pay. Multi-pay invoices are settled manually by the merchant when the campaign ends. |

### 2. Private Records

- **`Payment`** — Private receipt owned by the merchant (owner, amount, payer). Only the merchant can decrypt it.
- **Invoice metadata** — Stored by commitment hash only. No plaintext merchant or amount on-chain.

### 3. Two Payment Paths

- **Invoice path** — `create_invoice` → share payment link → `pay_invoice`. Full invoice semantics (expiry, status, replay protection).
- **Direct path** — `make_payment`. No invoice; direct private transfer + `Payment` receipt. Good for tips or simple one-off payments.

### 4. Backend as Indexer

The backend does **not** read from the chain. The frontend pushes invoice data after `create_invoice` and updates status after `pay_invoice` or `settle_invoice`. This keeps the app responsive while the chain remains the source of truth.

---

## Project Structure

```
stealthpay-app/
├── frontend/                # React + Vite web app
│   ├── src/
│   │   ├── desktop/         # Pages (Explorer, CreateInvoice, PaymentPage, Profile)
│   │   ├── components/      # UI components
│   │   ├── hooks/           # useStealthPay (contract calls)
│   │   ├── providers/       # Aleo wallet adapter
│   │   └── services/        # API client, stealthpay helpers
│   └── vite.config.ts       # Proxy /api → backend
├── backend/                 # Express API + Neon PostgreSQL
│   ├── index.js             # REST endpoints (invoices, stats, by-salt)
│   ├── db_schema.sql        # Invoices table
│   ├── setup-db.js          # Schema setup (no psql required)
│   └── encryption.js        # Encrypt merchant/payer addresses
├── contracts/
│   └── stealthpay/          # Leo program (stealthpay.aleo)
│       ├── src/main.leo     # create_invoice, pay_invoice, settle_invoice, make_payment
│       └── deploy.sh
├── docs/
│   └── TESTING_WALKTHROUGH.md
└── README.md
```

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Leo Wallet](https://www.leo.app/) (or compatible Aleo wallet)
- [Leo CLI](https://leo-lang.org/) (for contract development/deployment)

### 1. Backend (Neon PostgreSQL + API)

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL (Neon), ENCRYPTION_KEY (openssl rand -hex 32)
npm install
npm run setup-db   # Creates tables
npm run dev       # Runs on port 3000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev       # Runs on http://localhost:5173
```

### 3. Connect wallet

Use **Connect Wallet** in the navbar. Ensure `stealthpay.aleo` is deployed on your network and you have private credits for paying invoices.

### 4. Contract deployment (if needed)

```bash
cd contracts/stealthpay
cp .env.example .env
# Edit .env: NETWORK, PRIVATE_KEY
leo build
leo deploy --broadcast
```

See [contracts/stealthpay/README.md](contracts/stealthpay/README.md) for details.

---

## Features

| Feature | Description |
|--------|-------------|
| **Private transfers** | Uses `credits.aleo/transfer_private` — no public balance updates |
| **Payment receipts** | Private `Payment` records owned by merchants |
| **Invoice flow** | `create_invoice` / `pay_invoice` with commitment hash, expiry, replay protection |
| **Multi-pay invoices** | Campaign-style invoices; merchant settles manually |
| **Direct payment** | `make_payment` — no invoice, just private transfer + receipt |
| **Selective disclosure** | Merchants can reveal specific receipts for audits or refunds |
| **Zero protocol fees (MVP)** | Pay only network costs |

---

## Documentation

- **[docs/TESTING_WALKTHROUGH.md](docs/TESTING_WALKTHROUGH.md)** — End-to-end testing guide for all functions
- **[contracts/stealthpay/README.md](contracts/stealthpay/README.md)** — Leo program design, build, deploy

---

## Roadmap

| Phase | Focus |
|-------|-------|
| **Phase 1 (MVP)** | Private transfer + Payment receipt + invoice flow — *current* |
| **Phase 2** | SDK for auto-detection of payments and invoice matching |
| **Phase 3** | E-commerce plugins, DAO integrations |
