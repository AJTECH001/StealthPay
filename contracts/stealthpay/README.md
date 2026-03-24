# StealthPay Payroll — `stealthpay_payroll_v1.aleo`

Private on-chain payroll on Aleo. Employers deposit ALEO credits or USDCX and pay employees via lump-sum or streaming. All payouts are delivered as **private records** — nobody on-chain can see who received money or how much. Salary amounts are hidden at hire time using a commitment scheme.

**Network:** Aleo Testnet
**Dependencies:** `credits.aleo`, `test_usdcx_stablecoin.aleo`

---

## Overview

| Token | Type | Description |
|---|---|---|
| ALEO | `credits.aleo` | Native Aleo microcredits (1 ALEO = 1,000,000 microcredits) |
| USDCX | `test_usdcx_stablecoin.aleo` | Circle USDC bridged from Ethereum Sepolia via xReserve (1 USDC = 1,000,000 μUSDCx) |

| Payment Type | Value | Description |
|---|---|---|
| Lump-sum | `0` | Fixed amount paid per payroll interval |
| Streaming | `1` | Per-block accrual rate — claim any time up to accrued amount |

---

## Privacy Model

### What is public
- Employer wallet address
- Employee wallet address
- Payment type and token type
- Company registration
- Deposit / withdrawal amounts
- Streaming salary rate (revealed in finalize — required to compute `elapsed × rate`)

### What is private
- Salary amount at hire time (stored as a `BHP256` commitment hash)
- Payout amount received by the employee (delivered as a private record)
- Employee’s payment history

### Salary Commitment Scheme
At hire time the employer provides a `salary` and a random `salary_secret`. The contract stores only:

```
commitment = BHP256::hash_to_field({ salary, secret })
```

For **lump-sum** claims, the ZK proof asserts `claim_amount == salary` off-chain. Finalize only verifies the commitment hash — salary never appears on-chain.

For **streaming** claims, the rate must be revealed in finalize to compute `elapsed × rate`. This is an accepted trade-off; the payout record itself remains private.

---

## Functions

### Company Management

| Function | Caller | Description |
|---|---|---|
| `register_company(name_hash, payroll_interval)` | Employer | Register a company. `payroll_interval` ≥ 720 blocks (~1 hr) |
| `deposit_credits(amount)` | Employer | Deposit ALEO into the payroll pool |
| `deposit_usdcx(amount)` | Employer | Deposit USDCX into the payroll pool |
| `withdraw_credits(amount)` | Employer | Withdraw unused ALEO (returned as private record) |
| `withdraw_usdcx(amount)` | Employer | Withdraw unused USDCX (returned as private record) |
| `pause_company()` | Employer | Halt all employee claims |
| `unpause_company()` | Employer | Resume employee claims |

### Employee Management

| Function | Caller | Description |
|---|---|---|
| `add_employee(employee, salary, salary_secret, payment_type, token_type)` | Employer | Register employee and issue a private `EmployeeRecord`. `salary` and `salary_secret` are private |
| `remove_employee(employee)` | Employer | Deactivate employee — existing record becomes invalid |

### Claims

| Function | Caller | Description |
|---|---|---|
| `claim_payroll_credits(record, claim_amount)` | Employee | Lump-sum ALEO claim. Enforces payroll interval |
| `claim_payroll_usdcx(record, claim_amount)` | Employee | Lump-sum USDCX claim |
| `claim_stream_credits(record, claim_amount)` | Employee | Streaming ALEO claim — up to accrued amount |
| `claim_stream_usdcx(record, claim_amount)` | Employee | Streaming USDCX claim |
| `pay_bonus_credits(employee, amount)` | Employer | One-time ALEO bonus to any address |
| `pay_bonus_usdcx(employee, amount)` | Employer | One-time USDCX bonus to any address |

---

## Records & Mappings

### `EmployeeRecord` (private)
Held by the employee. Consumed and re-issued on every claim to prevent replay.

```leo
record EmployeeRecord {
    owner: address,        // employee wallet
    employer: address,
    salary: u64,           // private — commitment preimage
    salary_secret: field,  // private — commitment preimage
    payment_type: u8,
    token_type: u8,
}
```

### Mappings (public)

| Mapping | Key | Value |
|---|---|---|
| `companies` | `employer address` | `CompanyData` — name hash, interval, paused, admin |
| `company_credits` | `employer address` | ALEO pool balance (microcredits) |
| `company_usdcx` | `employer address` | USDCX pool balance (μUSDCx) |
| `employee_registry` | `BHP256(employer, employee)` | `EmployeeData` — commitment, payment type, active flag |
| `last_claimed` | `BHP256(employer, employee)` | Block height of last claim |

---

## Local Development

**Prerequisites:** Leo CLI v3.x, funded Aleo testnet wallet.

**Environment** — create `contracts/stealthpay/.env`:

```bash
NETWORK=testnet
PRIVATE_KEY=<YOUR_PRIVATE_KEY>
ENDPOINT=https://api.explorer.provable.com/v1
```

**Build:**
```bash
leo build
```

**Run unit tests (no network required):**
```bash
bash run_tests.sh
```

**Run integration tests (requires funded testnet wallet):**
```bash
bash run_tests.sh --integration
```

**Deploy:**
```bash
bash deploy.sh
```

---

## Contract Details

| Item | Value |
|---|---|
| **Program ID** | `stealthpay_payroll_v1.aleo` |
| **Network** | Aleo Testnet |
| **Leo version** | 3.4.0 |
| **Dependencies** | `credits.aleo` (network), `test_usdcx_stablecoin.aleo` (network) |
| **Deployment tx** | — (not yet deployed) |
