## StealthPay – Private Payments with Selective Disclosure on Aleo

`stealthpay.aleo` is an Aleo program that enables **private invoice-based payments** on top of Aleo Credits. Merchants create invoices by commitment hash; payers pay privately; only the merchant receives a **private `Payment` record** (receipt) for verification. No protocol fees in the MVP—focus is on private-by-default, verifiable-by-design payments with selective disclosure.

**Network:** Aleo Testnet (or mainnet when deployed).

---

### 1. High-Level Overview

- **Private value transfer** uses Aleo’s native `credits.aleo` program via `transfer_private`.
- **StealthPay** adds an **invoice layer** on top:
  - **Create invoice** – Merchant commits to (merchant, amount, salt) via a hash; only the hash and status are stored on-chain.
  - **Pay invoice** – Payer transfers credits privately to the merchant, receives a private `Payment` record (receipt) owned by the merchant, and the program enforces invoice hash, expiry, and replay protection via a receipt key.
  - **Settle invoice** – Merchant can mark multi-pay invoices as settled.
  - **Get invoice status** – Clients/indexers can query status by invoice hash.
- **Legacy path** – `make_payment` allows a direct private transfer + `Payment` receipt without an invoice.
- The program is **upgradable** under an **admin-controlled policy** (`@admin` constructor).

References:

- [Leo – Structure of a Program](https://docs.leo-lang.org/language/structure)
- [Aleo – Credits & transfers](https://developer.aleo.org/concepts/fundamentals/credits)
- [Leo – Upgrading Programs](https://docs.leo-lang.org/guides/upgradability)

---

### 2. Contract Design

**Import**

- `import credits.aleo;` – Native credits program for balances and private transfers.

**Program**

- `program stealthpay.aleo { ... }` – On-chain program ID.

**Upgradable constructor**

- `@admin(address="<ADMIN_ADDRESS>")` with `async constructor() {}`
- Only the designated admin can submit upgrades. Constructor logic is immutable after first deployment.

---

#### Records & state

**`Payment`** – Private receipt owned by the merchant.

```leo
record Payment {
    owner: address,   // merchant
    amount: u64,
    payer: address,
}
```

All fields are private at the record level. Only the merchant (or holder of the merchant’s view key) can decrypt the receipt for selective disclosure.

**`InvoiceData`** – On-chain invoice metadata (by commitment hash only).

```leo
struct InvoiceData {
    expiry_height: u32,
    status: u8,       // 0 = Open, 1 = Settled
    invoice_type: u8, // 0 = Standard (single pay), 1 = Multi-pay
}
```

**Mappings**

- `invoices: field => InvoiceData` – Invoice hash → metadata.
- `salt_to_invoice: field => field` – Salt → invoice hash (used to look up and verify invoice on pay/settle).
- `payment_receipts: field => u64` – Receipt key (commitment) → amount; enforces one payment per receipt key (replay protection).

---

#### Transitions

**`create_invoice`**

- **Private inputs:** `merchant`, `amount`, `salt`.
- **Public inputs:** `expiry_hours`, `invoice_type` (0 = Standard, 1 = Multi-pay).
- **Output:** `(public field, Future)` – the invoice hash and a future that finalizes state.
- **Logic:** Computes `invoice_hash = BHP256(merchant) + BHP256(amount) + BHP256(salt)`. Finalizer stores `InvoiceData` in `invoices` and `salt_to_invoice`.

**`pay_invoice`**

- **Inputs:** `pay_record` (credits), `merchant`, `amount`, `salt`, `payment_secret` (private), `message` (public).
- **Output:** `(Payment, credits.aleo/credits, credits.aleo/credits, Future)` – Payment record for merchant, merchant credits, change credits, and finalizer future.
- **Logic:**
  1. Calls `credits.aleo/transfer_private(pay_record, merchant, amount)` → merchant credits + change.
  2. Builds `Payment { owner: merchant, amount, payer: self.caller }`.
  3. Recomputes `invoice_hash` from merchant, amount, salt and in the finalizer:
     - Asserts `invoice_hash` matches `salt_to_invoice.get(salt)`.
     - Checks expiry (if `expiry_height != 0`).
     - For standard invoices (`invoice_type == 0`), asserts status is Open and sets status to Settled.
     - Computes `receipt_key` from `payment_secret` and salt; asserts `payment_receipts` does not already contain it; sets `payment_receipts[receipt_key] = amount` for replay protection.

**`settle_invoice`**

- **Inputs:** `salt` (public), `amount` (private).
- **Logic:** Caller is treated as merchant. Recomputes invoice hash from `self.caller`, `amount`, `salt`; in finalizer asserts hash exists and sets invoice status to Settled (used for multi-pay invoices).

**`get_invoice_status`**

- **Input:** `invoice_hash` (public).
- **Output:** Future that reads and returns (for the client) `invoices.get(invoice_hash)` so indexers/clients can see status.

**`make_payment`** (legacy – no invoice)

- **Inputs:** `sender_record`, `amount`, `merchant`.
- **Output:** `(Payment, credits.aleo/credits, credits.aleo/credits)` – Payment receipt, merchant credits, change.
- Direct private transfer + single `Payment` record; no invoice or receipt-key tracking.

---

### 3. Threat Model & Privacy Properties

- **Value privacy** – All transfers use `credits.aleo/transfer_private`. No public balance or mapping is updated; amounts and balances stay in private records.
- **Payer & merchant privacy** – Invoice is stored by hash only (merchant and amount never plaintext on-chain). `Payment` is a private record owned by the merchant; only the merchant (or view key holder) can decrypt it.
- **Replay protection** – `payment_receipts` ensures one payment per receipt key (derived from payment secret and salt).
- **Selective disclosure** – Merchant can reveal specific `Payment` records or fields (amount, payer) for audits, refunds, or compliance via standard Aleo record viewing.

---

### 4. Upgradability & Governance

- **Upgrade policy** – `@admin` constructor: only the configured admin address can submit valid program upgrades.
- **What can change in upgrades** – Transition logic, new transitions, new records/structs/mappings.
- **What cannot change** – Existing transition signatures (inputs/outputs), existing record layouts, constructor logic (immutable after first deploy).

---

### 5. Local Development & Deployment

**Prerequisites**

- Leo CLI (v3.x).
- Aleo account with testnet credits.

**Environment**

Create `.env` in the contract directory (`contracts/stealthpay/.env`):

```bash
NETWORK=testnet
PRIVATE_KEY=<YOUR_PRIVATE_KEY>
ENDPOINT=https://api.explorer.provable.com/v1
```

Do not commit `PRIVATE_KEY` or share it.

**Build**

From `contracts/stealthpay/`:

```bash
leo build
```

**Deploy to testnet**

```bash
leo deploy --broadcast
```

After deployment you can verify:

```bash
leo query program stealthpay.aleo
```

Or via explorer: `https://explorer.provable.com/program/stealthpay.aleo` (or your network’s explorer).

---

### 6. Contract Details (Verification)

| Item        | Value |
|------------|--------|
| **Program ID** | `stealthpay.aleo` |
| **Network**    | Aleo Testnet |
| **Dependencies** | `credits.aleo` (network) |

Replace or add the deployment transaction link here after each deploy for verification.
