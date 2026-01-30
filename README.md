# StealthPay

**Privacy-first payments on Aleo** — private-by-default transactions with selective disclosure for compliance and verification.

---

## Overview

StealthPay is a decentralized payment gateway built on [Aleo](https://aleo.org) that solves the transparency paradox of public blockchains. Instead of choosing between total surveillance or total obscurity, users get:

- **Private by default** — Sender identity and balances stay off the public ledger
- **Verifiable by design** — Merchants receive cryptographic proof of payment without exposing payer history
- **Selectively disclosable** — Transaction View Keys (TVKs) enable receipts for refunds, audits, or tax reporting

---

## Features

| Feature | Description |
|--------|-------------|
| **Private transfers** | Uses Aleo's native `credits.aleo/transfer_private` — no public balance updates |
| **Payment receipts** | Private `Payment` records owned by merchants for settlement verification |
| **Selective disclosure** | Merchants decrypt incoming records via View Keys; TVKs for third-party proofs |
| **Zero fees (MVP)** | No protocol fees — focus on adoption and network effects |

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Leo CLI](https://leo-lang.org/) (for contract development)

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the landing page.

### Connect Wallet

StealthPay uses a **faucet-style** address input — no browser extension required. Enter your Aleo address in the Connect Wallet modal to get started.

---

## Project Structure

```
stealthpay-app/
├── src/
│   ├── components/landing/   # Landing page (Hero, Features, Footer, etc.)
│   ├── providers/           # WalletContext (address state)
│   ├── workers/             # Aleo worker client for make_payment
│   └── main.tsx
├── stealthpaycontract/      # Leo program (stealthpay.aleo)
│   ├── src/main.leo         # Payment record + make_payment transition
│   └── deploy.sh
├── ProductDesign.md         # Product vision, architecture, GTM
└── README.md
```

---

## Technical Architecture

### On-Chain (Leo)

The `stealthpay.aleo` program:

1. **Imports** `credits.aleo` for native private transfers
2. **Defines** a `Payment` record: `owner`, `amount`, `payer`
3. **Exposes** `make_payment(sender_record, amount, merchant)` — transfers credits privately and creates a merchant-owned receipt

```leo
transition make_payment(
    sender_record: credits.aleo/credits,
    amount: u64,
    merchant: address
) -> (Payment, credits.aleo/credits, credits.aleo/credits)
```

### Client-Side

- **Worker** (`src/workers/`): Web Worker + Comlink for executing `make_payment` via Aleo SDK
- **WalletContext**: Stores Aleo address from manual input (faucet-style)
- **Landing page**: React + Vite; Connect Wallet modal, feature cards, merchant section

---

## Contract Deployment

The program is deployed on **Aleo testnet**:

| Item | Value |
|------|-------|
| **Program ID** | `stealthpay.aleo` |
| **Network** | Aleo Testnet |

See [`stealthpaycontract/README.md`](./stealthpaycontract/README.md) for build, deploy, and verification steps.

---

## Documentation

- **[ProductDesign.md](./ProductDesign.md)** — Problem definition, solution, market, GTM, success metrics
- **[stealthpaycontract/README.md](./stealthpaycontract/README.md)** — Leo program details, threat model, local development

---

## Roadmap

| Phase | Focus |
|-------|-------|
| **Phase 1 (MVP)** | Peer-to-peer private transfer + Proof of Payment — *current* |
| **Phase 2** | SDK for auto-detection of payments and invoice matching |
| **Phase 3** | E-commerce plugins, DAO payroll integrations |

---


