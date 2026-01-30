# StealthPay - Product Design Documentation

## Problem Definition & Market Relevance

### The Privacy Paradox in Digital Payments
- **Surveillance**: All transaction data (sender, receiver, amount) is permanently public on transparent blockchains, exposing users to targeted advertising, extortion, and behavior profiling
- **Compliance Gap**: Privacy tools (mixers, tumblers) often break audit trails and prevent users from proving a payment occurred for refunds, disputes, or tax reporting
- **Trust Friction**: Merchants need to verify payments, but payers shouldn't have to expose their entire financial history to buy a coffee or donate to a cause
- **Payment Friction**: Current systems force a binary choice—total transparency or total obscurity—with no middle ground for selective disclosure

### Aleo Relevance
StealthPay directly addresses Aleo's vision of programmable privacy by creating a payment ecosystem where every transaction is private-by-default yet verifiable on-demand. Merchants receive cryptographic receipts without exposing payer identities or balances to the public ledger.

## Solution & Value Proposition

### Core Innovation: Receipts-as-Private-Records on Aleo
Transform traditional payment receipts into zero-knowledge records with embedded payment metadata, leveraging Aleo's Record model and View Key architecture for selective disclosure.

### Value Propositions:
1. **For Merchants**: Reduce payment disputes with verifiable proofs, attract privacy-conscious consumers, automate settlement verification without exposing customer data
2. **For Payers**: Private-by-default transactions, selective disclosure for refunds or audits, no financial history leakage
3. **For Auditors/Compliance**: On-demand proof of payment via Transaction View Keys (TVK) without access to unrelated transactions

## Technical Architecture with Aleo

### Deep Integration Strategy

#### 1. credits.aleo (Native Transfer Layer)
```leo
// Private transfer via Aleo's native credits program
let (merchant_credits, change_credits): (credits.aleo/credits, credits.aleo/credits) =
    credits.aleo/transfer_private(sender_record, merchant, amount);
```

**Privacy Guarantee**: All value movements use `transfer_private`—no public balance or mapping is updated; everything stays in private `credits` records.

#### 2. Payment Record (Receipt Layer)
```leo
record Payment {
    owner: address,   // merchant who receives payment and owns the receipt
    amount: u64,      // paid amount (microcredits)
    payer: address,   // selectively revealable payer address
}
```

**Selective Disclosure**: The `Payment` record is a private record owned by the merchant. Only the merchant (or someone with the merchant's viewing key) can decrypt the full receipt. Third parties can receive a Transaction View Key (TVK) for specific payments without access to others.

#### 3. make_payment Transition (Core Flow)
```leo
transition make_payment(
    sender_record: credits.aleo/credits,
    amount: u64,
    merchant: address
) -> (Payment, credits.aleo/credits, credits.aleo/credits) {
    // 1. Private transfer to merchant
    let (merchant_credits, change_credits) =
        credits.aleo/transfer_private(sender_record, merchant, amount);

    // 2. Create app-level receipt owned by merchant
    let payment: Payment = Payment {
        owner: merchant,
        amount: amount,
        payer: self.caller,
    };

    return (payment, merchant_credits, change_credits);
}
```

**Streaming Verification**: Merchants can scan for incoming `Payment` records and match them to invoices without exposing payer identities to the public chain.

#### 4. Client-Side Integration (Worker + SDK)
```typescript
// StealthPay worker client - execute private payment
const makeStealthPayment = async (
  senderRecord: string,
  amount: u64,
  merchantAddress: string
) => {
  const result = await worker.make_payment(
    senderRecord,
    amount,
    merchantAddress
  );
  // Returns: Payment record, merchant_credits, change_credits
  return result;
};

// Merchant scans for Payment records via View Key
const scanPayments = async (merchantViewKey: string) => {
  const records = await client.requestRecords('stealthpay.aleo');
  return records.filter(r => r.owner === merchantAddress);
};
```

## Market Opportunity & GTM Alignment

### Target Market
- **Primary**: Freelancers and merchants accepting crypto who need private invoicing ($2T+ gig economy)
- **Secondary**: NGOs and donors requiring anonymous giving for sensitive causes
- **Tertiary**: DAOs and organizations needing on-chain privacy for payroll and vendor payments with audit capability

### Go-to-Market Strategy
1. **Phase 1 (MVP)**: Basic peer-to-peer private transfer with "Proof of Payment" generation—deployed on Aleo testnet
2. **Phase 2 (Merchant Tools)**: SDK for auto-detection of payments and invoice matching
3. **Phase 3 (Ecosystem)**: Plugins for e-commerce platforms and DAO payroll integrations

### Revenue Model (Future)
- **Transaction Fees**: 0.5–1% on verified private payments (Stripe/Polar style)
- **Subscription Tiers**: Pro/Enterprise for lower fees and higher limits
- **No fees initially**: Focus on user adoption and network effects

## Competitive Advantages with Aleo

1. **Privacy-by-Default**: Aleo's ZKP model keeps all transaction data private—no optional privacy layer
2. **Selective Disclosure**: View Keys and TVKs enable compliance without sacrificing default privacy
3. **Programmable Receipts**: `Payment` records are first-class on-chain data, not off-chain metadata
4. **Developer Experience**: Leo's type-safe program model and Aleo's record model simplify integration

## Success Metrics & Validation

### Wave 1–2 Goals
- stealthpay.aleo deployed and verified on Aleo testnet
- Landing page with faucet-style wallet address input (no extension dependency)
- Basic make_payment flow documented and tested

### PMF Indicators
- 70%+ merchant activation (unique merchants receiving at least one private payment)
- $10+ average transaction value in pilot programs
- 50%+ disclosure rate (transactions where a receipt/proof was generated)

## Aleo Ecosystem Feedback & Painpoints

### Strengths
- **Record Model**: Private records with owner-based decryption are ideal for receipts
- **View Keys**: Selective disclosure is built into the architecture, not bolted on
- **credits.aleo**: Native private transfers eliminate custom token logic
- **Leo Language**: Type-safe, readable, and upgradable programs


---

*This document represents our commitment to building production-ready private payment infrastructure that validates Aleo's product-market fit through real customer problems in the $2T+ digital payments and gig economy market.*
