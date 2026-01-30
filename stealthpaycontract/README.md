## StealthPay – Private Payments with Selective Disclosure on Aleo 

`stealthpay.aleo` is an Aleo program that enables users to make **fully private payments** to merchants while generating a **separate private “receipt” record** that can later be selectively revealed for compliance, refunds, or analytics.

**Revenue model** (Stripe/Polar style):
1. **Protocol fee** – Deducted before crediting merchant (1% Free, 0.5% Pro, 0.25% Enterprise).
2. **Subscription tiers** – Merchants subscribe to Pro or Enterprise for lower fees (monthly/annual).

The program is deployed on **Aleo testnet**.

#### Contract details (verification)

| Item | Value |
|------|--------|
| **Program ID** | `stealthpay.aleo` |
| **Network** | Aleo Testnet |
| **Deployment transaction** | [at14zh9t304vcx5mgugm2q4hz8p3ugq3w0h3t8prec6nqjetafvmgqs6shf8v](https://testnet.explorer.provable.com/transaction/at14zh9t304vcx5mgugm2q4hz8p3ugq3w0h3t8prec6nqjetafvmgqs6shf8v) |

You can verify the on-chain program and deployment via the links above.

---

### 1. High‑Level Overview

- **Private value transfer** is handled by Aleo’s native `credits.aleo` program.
- **StealthPay’s role** is to sit on top of `credits.aleo` and:
  - Call `credits.aleo/transfer_private` to move funds privately from a customer to a merchant.
  - Create a separate **`Payment` record** (a private “receipt”) owned by the merchant:
    - `owner`: merchant address
    - `amount`: paid amount
    - `payer`: address of the caller that initiated the payment
- The program is **upgradable** under an **admin-controlled policy** (using Leo’s `@admin` constructor annotation), so future protocol changes can be rolled out without forcing users onto a new program ID.

Relevant documentation:

- Leo program/layout: [Leo docs – Structure of a Leo Program](https://docs.leo-lang.org/language/structure)  
- Aleo credits & private transfers: [Aleo docs – Aleo Credits & transfers](https://developer.aleo.org/concepts/fundamentals/credits)
- Program upgradability model: [Leo docs – Upgrading Programs](https://docs.leo-lang.org/guides/upgradability)

---

### 2. Contract Design

**Imports**

- `import credits.aleo;`  
  - Brings in the native `credits.aleo` program, which manages balances and private/public transfers of Aleo Credits.

**Program declaration**

- `program stealthpay.aleo { ... }`  
  - Declares a Leo program with the on‑chain ID `stealthpay.aleo` per the standard `program {name}.aleo` syntax.

**Upgradable constructor**

- The constructor uses Leo’s admin-based upgrade policy:
  - `@admin(address="<ADMIN_ADDRESS>")`
  - `async constructor() {}`  
- Semantics:
  - The constructor is executed on each **deploy or upgrade**.
  - The `@admin` annotation generates a check that the **program owner** equals the specified admin address.
  - Only transactions from that admin address can successfully upgrade the program.
  - The constructor logic itself is **immutable** once deployed (per Leo upgradability rules).

**Core record type – `Payment`**

```leo
record Payment {
    owner: address,
    amount: u64,
    payer: address,
    fee: u64,  // protocol fee deducted
}
```

- Represents an **application-level payment receipt**, owned by the merchant:
  - `owner`: merchant address who receives the payment and owns the receipt.
  - `amount`: gross amount paid (in microcredits).
  - `payer`: address of the payer (`self.caller` at execution time).
  - `fee`: protocol fee deducted (credited to treasury).
- On-chain (via `leo query program`), this appears as:
  - `owner as address.private`
  - `amount as u64.private`
  - `payer as address.private`  
  meaning all fields are stored as **private** components.

**Core transition – `make_payment`** (with protocol fee)

Signature:

```leo
async transition make_payment(
    sender_record: credits.aleo/credits,
    amount: u64,
    merchant: address,
    effective_fee_bps: u64  // 100=1%, 50=0.5%, 25=0.25%
) -> (Payment, credits.aleo/credits, credits.aleo/credits, credits.aleo/credits, Future)
```

Runtime behavior:

1. **Compute fee** – `fee = amount * effective_fee_bps / 10_000`; verified on-chain against merchant subscription.
2. **Private transfers** – Transfer `amount - fee` to merchant, `fee` to treasury, change to payer via `credits.aleo/transfer_private`.
3. **Return values** – `(payment, merchant_credits, treasury_credits, change_credits)` – merchant gets net amount, protocol gets fee.

**Subscription transition – `subscribe`**

```leo
async transition subscribe(payment_record, plan: u8, duration: u8)
// plan: 1=Pro, 2=Enterprise. duration: 0=monthly, 1=annual
```

**Admin withdrawal – `admin_withdraw`**

```leo
transition admin_withdraw(treasury_record, amount, recipient)
```

- Only the treasury address (admin) can call this.
- Transfers accumulated fees to an address (exchange, bank, etc.).
- Admin uses wallet with treasury private key to view fee records, then calls this to withdraw.

**Fee tiers**

| Tier       | Fee (bps) | Per tx | Subscription |
|------------|-----------|--------|---------------|
| Free       | 100       | 1%     | —             |
| Pro        | 50        | 0.5%   | 10 credits/mo |
| Enterprise | 25        | 0.25%  | 100 credits/mo |

---

### 3. Threat Model & Privacy Properties

- **Value privacy**
  - Transfers are executed via `credits.aleo/transfer_private`, which uses Aleo’s record model to keep balances and transfer amounts hidden.
  - No public balance or mapping is updated; everything stays in private `credits` records.

- **Payer & merchant privacy**
  - `Payment` is a **private record** owned by the merchant.
  - Only the merchant (or someone with the merchant’s viewing key) can see the full receipt.

- **Selective disclosure**
  - The merchant can choose to reveal:
    - The existence of certain `Payment` records.
    - Specific fields (`amount`, `payer`) as needed for audits, refunds, or analytics.
  - At the protocol level, this is supported by standard Aleo record viewing and proof patterns (off-chain wallet / app logic).

---

### 4. Upgradability & Governance

- **Upgrade policy**
  - The program uses `@admin` constructor semantics:
    - Only the designated admin address (the initial deployer) can submit valid upgrades.
    - The constructor enforces `assert.eq program_owner <ADMIN_ADDRESS>`.

- **What can change in future upgrades (per Leo rules)**
  - Transition logic (e.g., additional checks, fee routing, new transitions).
  - New records / structs / mappings can be added.

- **What cannot change**
  - Existing transition signatures (inputs/outputs).
  - Existing record component layout.
  - The constructor logic itself (immutable after first deployment).

---

### 5. Local Development & Deployment Guide

**Prerequisites**

- Leo CLI installed (v3.x).
- An Aleo account with testnet credits.

**Environment configuration**

Create a `.env` file at the project root (`stealthpaycontract/.env`):

```bash
NETWORK=testnet
PRIVATE_KEY=<YOUR_PRIVATE_KEY>
ENDPOINT=https://api.explorer.provable.com/v1
```

> The private key is used **locally only** to sign deploy and execute transactions. It should never be committed to version control or shared.

**Build**

From `stealthpaycontract/`:

```bash
leo build
```

**Deploy to Aleo testnet**

```bash
leo deploy --broadcast
```

The CLI will:

- Show a deployment plan and cost breakdown.
- Ask for confirmation before:
  - Creating the deployment transaction.
  - Broadcasting it to the configured endpoint.

After confirmation, you should see:

- Transaction ID for the deployment.
- Confirmation once the transaction is accepted in a block.

You can verify the program on-chain with:

```bash
leo query program stealthpay.aleo
```

Or via the official explorer:

- Program page: `https://explorer.provable.com/program/stealthpay.aleo`

---



