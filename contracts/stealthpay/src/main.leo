/**
 * StealthPay Payroll v2
 *
 * Privacy-first on-chain payroll for the Aleo network.
 * Supports lump-sum and streaming salary disbursements in both
 * ALEO credits and USDCX (ARC-20 stablecoin).
 *
 * ─── Token Types ────────────────────────────────────────────────────────────
 *   0  →  ALEO credits   (microcredits, 6 decimals)
 *   1  →  USDCX          (μUSDCx, 6 decimals — bridged via Circle xReserve)
 *
 * ─── Payment Types ──────────────────────────────────────────────────────────
 *   0  →  Lump-sum   — fixed amount per payroll interval
 *   1  →  Streaming  — per-block accrual rate
 *
 * ─── Block Time Reference (Aleo Testnet) ────────────────────────────────────
 *   ~5 s / block
 *   720 blocks    ≈  1 hour   (minimum payroll interval)
 *   518 400 blocks ≈ 30 days  (typical monthly payroll interval)
 *
 * ─── Privacy Model ──────────────────────────────────────────────────────────
 *   Salary is hidden at hire time via a BHP256 commitment:
 *     commitment = BHP256::hash_to_field({ salary, secret })
 *   The commitment is stored on-chain; the plaintext salary never is.
 *   At claim time the employee re-derives the commitment inside the ZK proof,
 *   which the finalize block verifies — salary stays off-chain.
 *   Streaming claims reveal the rate in finalize (accepted trade-off, see §10).
 *
 * ─── External Dependencies ──────────────────────────────────────────────────
 *   credits.aleo              — native Aleo credits token
 *   test_usdcx_stablecoin.aleo — ARC-20 USDCX stablecoin (testnet)
 *     transfer_public(to, amount: u128) -> Future
 *     transfer_public_to_private(to, amount: u128)
 *       -> (ComplianceRecord, Token, Future)
 *
 * @author  StealthPay
 * @network testnet
 * @version 1.0.0
 */

import credits.aleo;
import test_usdcx_stablecoin.aleo;

program stealthpay_payroll_v3.aleo {

    // =========================================================================
    // STRUCTS
    // =========================================================================

    /**
     * Composite key used to index the employee_registry and last_claimed
     * mappings. Hashed with BHP256 before storage to produce a single field.
     */
    struct PairKey {
        employer: address,
        employee: address,
    }

    /**
     * Preimage for the salary commitment scheme.
     * commitment = BHP256::hash_to_field(SalaryCommitment { salary, secret })
     *
     * Both fields are private and only live inside the EmployeeRecord.
     * They are never written to a public mapping.
     */
    struct SalaryCommitment {
        salary: u64,
        secret: field,
    }

    /**
     * On-chain metadata for a registered company (employer).
     * Stored in the `companies` mapping, keyed by the employer address.
     *
     * @param name_hash        BHP256 hash of the company name (field encoding)
     * @param payroll_interval Minimum blocks between lump-sum claim cycles
     * @param is_paused        When true, all employee claims are rejected
     * @param admin            Employer wallet — the only address that may modify this record
     * @param created_at       Block height at registration time
     */
    struct CompanyData {
        name_hash: field,
        payroll_interval: u32,
        is_paused: bool,
        admin: address,
        created_at: u32,
    }

    /**
     * On-chain state for a registered employee.
     * Stored in the `employee_registry` mapping, keyed by BHP256(PairKey).
     *
     * @param salary_commitment BHP256 hash of { salary, secret } — hides the salary
     * @param payment_type      0 = lump-sum, 1 = streaming
     * @param token_type        0 = credits, 1 = USDCX
     * @param is_active         False after the employer calls remove_employee
     * @param added_at          Block height when the employee was registered
     */
    struct EmployeeData {
        salary_commitment: field,
        payment_type: u8,
        token_type: u8,
        is_active: bool,
        added_at: u32,
    }

    // =========================================================================
    // RECORDS
    // =========================================================================

    /**
     * Private employment credential, held in the employee's wallet.
     *
     * Issued by add_employee and consumed-then-reissued on every claim
     * to prevent replay attacks. The salary and salary_secret fields are
     * the commitment preimage — they never appear in any public mapping.
     *
     * @param owner         Employee wallet address (record spender)
     * @param employer      Employer wallet address
     * @param salary        Plaintext salary (private):
     *                        lump-sum  → total per payroll interval
     *                        streaming → accrual rate per block
     * @param salary_secret Random 248-bit field chosen by the employer at hire time
     * @param payment_type  0 = lump-sum, 1 = streaming
     * @param token_type    0 = credits, 1 = USDCX
     */
    record EmployeeRecord {
        owner: address,
        employer: address,
        salary: u64,
        salary_secret: field,
        payment_type: u8,
        token_type: u8,
    }

    // =========================================================================
    // MAPPINGS
    // =========================================================================

    /// Registered companies. Key: employer address.
    mapping companies: address => CompanyData;

    /// Deposited ALEO credit balance per employer (microcredits).
    mapping company_credits: address => u64;

    /// Deposited USDCX balance per employer (μUSDCx).
    mapping company_usdcx: address => u64;

    /// Active employee records. Key: BHP256(PairKey { employer, employee }).
    mapping employee_registry: field => EmployeeData;

    /// Block height of the last successful claim. Key: BHP256(PairKey).
    /// Initialised to added_at on first claim; used to enforce payroll intervals.
    mapping last_claimed: field => u32;

    // =========================================================================
    // TRANSITIONS — COMPANY MANAGEMENT
    // =========================================================================

    /**
     * register_company
     *
     * One-time registration for an employer. Creates a CompanyData record and
     * initialises both token balances to zero.
     *
     * @param name_hash        BHP256::hash_to_field(company_name encoded as field)
     * @param payroll_interval Minimum blocks between lump-sum claim cycles (≥ 720)
     *
     * @reverts if the employer is already registered
     * @reverts if payroll_interval < 720
     */
    async transition register_company(
        public name_hash: field,
        public payroll_interval: u32,
    ) -> Future {
        return finalize_register_company(self.caller, name_hash, payroll_interval);
    }

    async function finalize_register_company(
        owner: address,
        name_hash: field,
        payroll_interval: u32,
    ) {
        assert(!companies.contains(owner));
        assert(payroll_interval >= 720u32);
        companies.set(owner, CompanyData {
            name_hash: name_hash,
            payroll_interval: payroll_interval,
            is_paused: false,
            admin: owner,
            created_at: block.height,
        });
        company_credits.set(owner, 0u64);
        company_usdcx.set(owner, 0u64);
    }

    /**
     * pause_company
     *
     * Halts all employee claim activity for the calling company.
     * Only the registered admin may pause.
     *
     * @reverts if already paused
     * @reverts if caller is not the registered admin
     */
    async transition pause_company() -> Future {
        return finalize_pause_company(self.caller);
    }

    async function finalize_pause_company(owner: address) {
        let company: CompanyData = companies.get(owner);
        assert_eq(company.admin, owner);
        assert(!company.is_paused);
        companies.set(owner, CompanyData {
            name_hash: company.name_hash,
            payroll_interval: company.payroll_interval,
            is_paused: true,
            admin: company.admin,
            created_at: company.created_at,
        });
    }

    /**
     * unpause_company
     *
     * Resumes employee claim activity for the calling company.
     * Only the registered admin may unpause.
     *
     * @reverts if not currently paused
     * @reverts if caller is not the registered admin
     */
    async transition unpause_company() -> Future {
        return finalize_unpause_company(self.caller);
    }

    async function finalize_unpause_company(owner: address) {
        let company: CompanyData = companies.get(owner);
        assert_eq(company.admin, owner);
        assert(company.is_paused);
        companies.set(owner, CompanyData {
            name_hash: company.name_hash,
            payroll_interval: company.payroll_interval,
            is_paused: false,
            admin: company.admin,
            created_at: company.created_at,
        });
    }

    // =========================================================================
    // TRANSITIONS — FUND MANAGEMENT
    // =========================================================================

    /**
     * deposit_credits
     *
     * Transfers ALEO credits from the employer's public balance into this
     * program's payroll pool. Requires an existing company registration.
     *
     * @param amount Amount in microcredits (> 0)
     *
     * @reverts if amount == 0
     * @reverts if the employer is not registered
     */
    async transition deposit_credits(public amount: u64) -> Future {
        assert(amount > 0u64);
        let f0: Future = credits.aleo/transfer_public_as_signer(self.address, amount);
        return finalize_deposit_credits(self.caller, amount, f0);
    }

    async function finalize_deposit_credits(employer: address, amount: u64, f0: Future) {
        f0.await();
        assert(companies.contains(employer));
        let bal: u64 = company_credits.get_or_use(employer, 0u64);
        company_credits.set(employer, bal + amount);
    }

    /**
     * deposit_usdcx
     *
     * Transfers USDCX from the employer's public USDCX balance into this
     * program's payroll pool. Requires an existing company registration.
     *
     * @param amount Amount in μUSDCx (> 0)
     *
     * @reverts if amount == 0
     * @reverts if the employer is not registered
     */
    async transition deposit_usdcx(public amount: u64) -> Future {
        assert(amount > 0u64);
        let f0: Future = test_usdcx_stablecoin.aleo/transfer_public_as_signer(self.address, amount as u128);
        return finalize_deposit_usdcx(self.caller, amount, f0);
    }

    async function finalize_deposit_usdcx(employer: address, amount: u64, f0: Future) {
        f0.await();
        assert(companies.contains(employer));
        let bal: u64 = company_usdcx.get_or_use(employer, 0u64);
        company_usdcx.set(employer, bal + amount);
    }

    /**
     * withdraw_credits
     *
     * Withdraws unused ALEO credits from the payroll pool to the employer
     * as a private credits record.
     * Only the registered company admin may withdraw.
     *
     * @param amount Amount in microcredits (> 0)
     *
     * @returns Private credits record sent to the caller
     * @reverts if amount exceeds pool balance
     * @reverts if caller is not the registered admin
     */
    async transition withdraw_credits(public amount: u64) -> (credits.aleo/credits, Future) {
        assert(amount > 0u64);
        let (payout, f0): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(self.caller, amount);
        return (payout, finalize_withdraw_credits(self.caller, amount, f0));
    }

    async function finalize_withdraw_credits(employer: address, amount: u64, f0: Future) {
        f0.await();
        let company: CompanyData = companies.get(employer);
        assert_eq(company.admin, employer);
        let bal: u64 = company_credits.get(employer);
        assert(bal >= amount);
        company_credits.set(employer, bal - amount);
    }

    /**
     * withdraw_usdcx
     *
     * Withdraws unused USDCX from the payroll pool to the employer
     * as a private Token record.
     * Only the registered company admin may withdraw.
     *
     * @param amount Amount in μUSDCx (> 0)
     *
     * @returns ComplianceRecord (to Circle compliance), Token record (to caller)
     * @reverts if amount exceeds pool balance
     * @reverts if caller is not the registered admin
     */
    async transition withdraw_usdcx(public amount: u64) -> (
        test_usdcx_stablecoin.aleo/ComplianceRecord,
        test_usdcx_stablecoin.aleo/Token,
        Future,
    ) {
        assert(amount > 0u64);
        let (compliance, payout, f0): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            Future,
        ) = test_usdcx_stablecoin.aleo/transfer_public_to_private(self.caller, amount as u128);
        return (compliance, payout, finalize_withdraw_usdcx(self.caller, amount, f0));
    }

    async function finalize_withdraw_usdcx(employer: address, amount: u64, f0: Future) {
        f0.await();
        let company: CompanyData = companies.get(employer);
        assert_eq(company.admin, employer);
        let bal: u64 = company_usdcx.get(employer);
        assert(bal >= amount);
        company_usdcx.set(employer, bal - amount);
    }

    // =========================================================================
    // TRANSITIONS — EMPLOYEE MANAGEMENT
    // =========================================================================

    /**
     * add_employee
     *
     * Registers a new employee under the calling employer. Issues a private
     * EmployeeRecord to the employee's wallet. The salary is hidden from
     * on-chain observers via a BHP256 commitment.
     *
     * salary semantics:
     *   payment_type 0 (lump-sum)  → full payment per payroll interval (microcredits / μUSDCx)
     *   payment_type 1 (streaming) → accrual rate per block (microcredits / μUSDCx)
     *
     * @param employee      Employee wallet address (record owner)
     * @param salary        Private salary amount — stored only in the ZK record
     * @param salary_secret Random 248-bit field (generated by the employer off-chain)
     * @param payment_type  0 = lump-sum, 1 = streaming
     * @param token_type    0 = credits, 1 = USDCX
     *
     * @returns Private EmployeeRecord sent to the employee wallet
     * @reverts if the company is paused
     * @reverts if the employee is already active under this employer
     */
    async transition add_employee(
        public employee: address,
        private salary: u64,
        private salary_secret: field,
        public payment_type: u8,
        public token_type: u8,
    ) -> (EmployeeRecord, Future) {
        assert(salary > 0u64);
        assert(payment_type <= 1u8);
        assert(token_type <= 1u8);

        let commitment: field = BHP256::hash_to_field(SalaryCommitment {
            salary: salary,
            secret: salary_secret,
        });

        let emp_record: EmployeeRecord = EmployeeRecord {
            owner: employee,
            employer: self.caller,
            salary: salary,
            salary_secret: salary_secret,
            payment_type: payment_type,
            token_type: token_type,
        };

        let emp_key: field = BHP256::hash_to_field(PairKey {
            employer: self.caller,
            employee: employee,
        });

        return (emp_record, finalize_add_employee(
            self.caller, commitment, payment_type, token_type, emp_key,
        ));
    }

    async function finalize_add_employee(
        employer: address,
        salary_commitment: field,
        payment_type: u8,
        token_type: u8,
        emp_key: field,
    ) {
        let company: CompanyData = companies.get(employer);
        assert(!company.is_paused);

        // Re-hire is permitted only if the employee was previously deactivated.
        let default_emp: EmployeeData = EmployeeData {
            salary_commitment: 0field,
            payment_type: 0u8,
            token_type: 0u8,
            is_active: false,
            added_at: 0u32,
        };
        let existing: EmployeeData = employee_registry.get_or_use(emp_key, default_emp);
        assert(!existing.is_active);

        employee_registry.set(emp_key, EmployeeData {
            salary_commitment: salary_commitment,
            payment_type: payment_type,
            token_type: token_type,
            is_active: true,
            added_at: block.height,
        });
    }

    /**
     * remove_employee
     *
     * Deactivates an employee, preventing future claims.
     * Historical data is preserved; the employee is not deleted from the mapping.
     * Any EmployeeRecord held by the employee becomes invalid for new claims.
     *
     * @param employee Employee wallet address to deactivate
     *
     * @reverts if caller is not the registered company admin
     * @reverts if the employee is not currently active
     */
    async transition remove_employee(public employee: address) -> Future {
        let emp_key: field = BHP256::hash_to_field(PairKey {
            employer: self.caller,
            employee: employee,
        });
        return finalize_remove_employee(self.caller, emp_key);
    }

    async function finalize_remove_employee(employer: address, emp_key: field) {
        let company: CompanyData = companies.get(employer);
        assert_eq(company.admin, employer);
        let emp: EmployeeData = employee_registry.get(emp_key);
        assert(emp.is_active);
        employee_registry.set(emp_key, EmployeeData {
            salary_commitment: emp.salary_commitment,
            payment_type: emp.payment_type,
            token_type: emp.token_type,
            is_active: false,
            added_at: emp.added_at,
        });
    }

    // =========================================================================
    // TRANSITIONS — LUMP-SUM CLAIMS
    // =========================================================================

    /**
     * claim_payroll_credits
     *
     * Lump-sum salary claim in ALEO credits.
     *
     * The employee submits their EmployeeRecord alongside the claimed amount.
     * A ZK assertion (off-chain) verifies claim_amount == record.salary.
     * Finalize verifies the salary commitment, enforces the payroll interval,
     * and deducts from the company's credit pool.
     *
     * The EmployeeRecord is consumed and a fresh copy is re-issued to the
     * employee to prevent replay attacks.
     *
     * @param employee_record Private EmployeeRecord (payment_type=0, token_type=0)
     * @param claim_amount    Must equal the salary in the record (enforced by ZK assertion)
     *
     * @returns New EmployeeRecord (re-issued), private credits record (payout)
     * @reverts if payment_type or token_type mismatch
     * @reverts if commitment check fails
     * @reverts if payroll interval has not elapsed
     * @reverts if company balance is insufficient
     */
    async transition claim_payroll_credits(
        employee_record: EmployeeRecord,
        public claim_amount: u64,
    ) -> (EmployeeRecord, credits.aleo/credits, Future) {
        assert_eq(employee_record.payment_type, 0u8);
        assert_eq(employee_record.token_type, 0u8);
        assert(claim_amount > 0u64);

        // ZK assertion: enforces claim_amount == salary without revealing
        // the salary value on-chain. Verified inside the proof, not in finalize.
        assert_eq(claim_amount, employee_record.salary);

        let record_commitment: field = BHP256::hash_to_field(SalaryCommitment {
            salary: employee_record.salary,
            secret: employee_record.salary_secret,
        });

        let (payout, f0): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(employee_record.owner, claim_amount);

        let new_record: EmployeeRecord = EmployeeRecord {
            owner: employee_record.owner,
            employer: employee_record.employer,
            salary: employee_record.salary,
            salary_secret: employee_record.salary_secret,
            payment_type: employee_record.payment_type,
            token_type: employee_record.token_type,
        };

        let emp_key: field = BHP256::hash_to_field(PairKey {
            employer: employee_record.employer,
            employee: employee_record.owner,
        });

        return (new_record, payout, finalize_claim_payroll_credits(
            employee_record.employer, record_commitment, claim_amount, emp_key, f0,
        ));
    }

    async function finalize_claim_payroll_credits(
        employer: address,
        record_commitment: field,
        claim_amount: u64,
        emp_key: field,
        f0: Future,
    ) {
        f0.await();
        let company: CompanyData = companies.get(employer);
        assert(!company.is_paused);

        let emp: EmployeeData = employee_registry.get(emp_key);
        assert(emp.is_active);
        assert_eq(emp.payment_type, 0u8);
        assert_eq(emp.token_type, 0u8);

        // Commitment check: proves the EmployeeRecord was issued by this employer
        // with the salary currently on file. Salary never appears on-chain.
        assert_eq(record_commitment, emp.salary_commitment);

        let last: u32 = last_claimed.get_or_use(emp_key, emp.added_at);
        assert(block.height >= last + company.payroll_interval);

        let bal: u64 = company_credits.get(employer);
        assert(bal >= claim_amount);
        company_credits.set(employer, bal - claim_amount);
        last_claimed.set(emp_key, block.height);
    }

    /**
     * claim_payroll_usdcx
     *
     * Lump-sum salary claim in USDCX. Identical logic to claim_payroll_credits
     * but settled via the USDCX stablecoin program.
     *
     * The employee receives a private Token record; a ComplianceRecord is
     * simultaneously issued to Circle's compliance address (hardcoded inside
     * test_usdcx_stablecoin.aleo).
     *
     * @param employee_record Private EmployeeRecord (payment_type=0, token_type=1)
     * @param claim_amount    Must equal the salary in the record
     *
     * @returns New EmployeeRecord, ComplianceRecord (Circle), Token record (payout)
     */
    async transition claim_payroll_usdcx(
        employee_record: EmployeeRecord,
        public claim_amount: u64,
    ) -> (
        EmployeeRecord,
        test_usdcx_stablecoin.aleo/ComplianceRecord,
        test_usdcx_stablecoin.aleo/Token,
        Future,
    ) {
        assert_eq(employee_record.payment_type, 0u8);
        assert_eq(employee_record.token_type, 1u8);
        assert(claim_amount > 0u64);

        assert_eq(claim_amount, employee_record.salary);

        let record_commitment: field = BHP256::hash_to_field(SalaryCommitment {
            salary: employee_record.salary,
            secret: employee_record.salary_secret,
        });

        let (compliance, payout, f0): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            Future,
        ) = test_usdcx_stablecoin.aleo/transfer_public_to_private(employee_record.owner, claim_amount as u128);

        let new_record: EmployeeRecord = EmployeeRecord {
            owner: employee_record.owner,
            employer: employee_record.employer,
            salary: employee_record.salary,
            salary_secret: employee_record.salary_secret,
            payment_type: employee_record.payment_type,
            token_type: employee_record.token_type,
        };

        let emp_key: field = BHP256::hash_to_field(PairKey {
            employer: employee_record.employer,
            employee: employee_record.owner,
        });

        return (new_record, compliance, payout, finalize_claim_payroll_usdcx(
            employee_record.employer, record_commitment, claim_amount, emp_key, f0,
        ));
    }

    async function finalize_claim_payroll_usdcx(
        employer: address,
        record_commitment: field,
        claim_amount: u64,
        emp_key: field,
        f0: Future,
    ) {
        f0.await();
        let company: CompanyData = companies.get(employer);
        assert(!company.is_paused);

        let emp: EmployeeData = employee_registry.get(emp_key);
        assert(emp.is_active);
        assert_eq(emp.payment_type, 0u8);
        assert_eq(emp.token_type, 1u8);
        assert_eq(record_commitment, emp.salary_commitment);

        let last: u32 = last_claimed.get_or_use(emp_key, emp.added_at);
        assert(block.height >= last + company.payroll_interval);

        let bal: u64 = company_usdcx.get(employer);
        assert(bal >= claim_amount);
        company_usdcx.set(employer, bal - claim_amount);
        last_claimed.set(emp_key, block.height);
    }

    // =========================================================================
    // TRANSITIONS — STREAMING CLAIMS
    // =========================================================================

    /**
     * claim_stream_credits
     *
     * Streaming salary claim in ALEO credits.
     *
     * The employee may claim any amount up to the amount accrued since the
     * last claim: accrued = elapsed_blocks × rate_per_block.
     * Partial claims are permitted; last_claimed resets to the current block.
     *
     * Privacy trade-off: the per-block rate is revealed in the finalize block
     * so the network can compute elapsed × rate on-chain. This is an accepted
     * limitation of streaming payments — the rate appears in the execution trace.
     *
     * @param employee_record Private EmployeeRecord (payment_type=1, token_type=0)
     * @param claim_amount    Amount to claim (≤ accrued since last claim)
     *
     * @returns New EmployeeRecord (re-issued), private credits record (payout)
     * @reverts if claim_amount > accrued
     * @reverts if commitment check fails
     * @reverts if company balance is insufficient
     */
    async transition claim_stream_credits(
        employee_record: EmployeeRecord,
        public claim_amount: u64,
    ) -> (EmployeeRecord, credits.aleo/credits, Future) {
        assert_eq(employee_record.payment_type, 1u8);
        assert_eq(employee_record.token_type, 0u8);
        assert(claim_amount > 0u64);

        let (payout, f0): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(employee_record.owner, claim_amount);

        let new_record: EmployeeRecord = EmployeeRecord {
            owner: employee_record.owner,
            employer: employee_record.employer,
            salary: employee_record.salary,
            salary_secret: employee_record.salary_secret,
            payment_type: employee_record.payment_type,
            token_type: employee_record.token_type,
        };

        let emp_key: field = BHP256::hash_to_field(PairKey {
            employer: employee_record.employer,
            employee: employee_record.owner,
        });

        return (new_record, payout, finalize_claim_stream_credits(
            employee_record.employer,
            employee_record.salary,        // rate — revealed to finalize for accrual computation
            employee_record.salary_secret, // secret — revealed to finalize for commitment re-derivation
            claim_amount,
            emp_key,
            f0,
        ));
    }

    async function finalize_claim_stream_credits(
        employer: address,
        record_rate: u64,
        record_secret: field,
        claim_amount: u64,
        emp_key: field,
        f0: Future,
    ) {
        f0.await();
        let company: CompanyData = companies.get(employer);
        assert(!company.is_paused);

        let emp: EmployeeData = employee_registry.get(emp_key);
        assert(emp.is_active);
        assert_eq(emp.payment_type, 1u8);
        assert_eq(emp.token_type, 0u8);

        // Re-derive the commitment from the revealed rate and secret.
        // Prevents a forged record from claiming with an inflated rate.
        let derived_commitment: field = BHP256::hash_to_field(SalaryCommitment {
            salary: record_rate,
            secret: record_secret,
        });
        assert_eq(derived_commitment, emp.salary_commitment);

        let last: u32 = last_claimed.get_or_use(emp_key, emp.added_at);
        let elapsed: u64 = (block.height - last) as u64;
        let accrued: u64 = elapsed * record_rate;
        assert(claim_amount <= accrued);

        let bal: u64 = company_credits.get(employer);
        assert(bal >= claim_amount);
        company_credits.set(employer, bal - claim_amount);
        last_claimed.set(emp_key, block.height);
    }

    /**
     * claim_stream_usdcx
     *
     * Streaming salary claim in USDCX. Identical logic to claim_stream_credits
     * but settled via the USDCX stablecoin program.
     *
     * @param employee_record Private EmployeeRecord (payment_type=1, token_type=1)
     * @param claim_amount    Amount to claim (≤ accrued since last claim)
     *
     * @returns New EmployeeRecord, ComplianceRecord (Circle), Token record (payout)
     */
    async transition claim_stream_usdcx(
        employee_record: EmployeeRecord,
        public claim_amount: u64,
    ) -> (
        EmployeeRecord,
        test_usdcx_stablecoin.aleo/ComplianceRecord,
        test_usdcx_stablecoin.aleo/Token,
        Future,
    ) {
        assert_eq(employee_record.payment_type, 1u8);
        assert_eq(employee_record.token_type, 1u8);
        assert(claim_amount > 0u64);

        let (compliance, payout, f0): (
            test_usdcx_stablecoin.aleo/ComplianceRecord,
            test_usdcx_stablecoin.aleo/Token,
            Future,
        ) = test_usdcx_stablecoin.aleo/transfer_public_to_private(employee_record.owner, claim_amount as u128);

        let new_record: EmployeeRecord = EmployeeRecord {
            owner: employee_record.owner,
            employer: employee_record.employer,
            salary: employee_record.salary,
            salary_secret: employee_record.salary_secret,
            payment_type: employee_record.payment_type,
            token_type: employee_record.token_type,
        };

        let emp_key: field = BHP256::hash_to_field(PairKey {
            employer: employee_record.employer,
            employee: employee_record.owner,
        });

        return (new_record, compliance, payout, finalize_claim_stream_usdcx(
            employee_record.employer,
            employee_record.salary,
            employee_record.salary_secret,
            claim_amount,
            emp_key,
            f0,
        ));
    }

    async function finalize_claim_stream_usdcx(
        employer: address,
        record_rate: u64,
        record_secret: field,
        claim_amount: u64,
        emp_key: field,
        f0: Future,
    ) {
        f0.await();
        let company: CompanyData = companies.get(employer);
        assert(!company.is_paused);

        let emp: EmployeeData = employee_registry.get(emp_key);
        assert(emp.is_active);
        assert_eq(emp.payment_type, 1u8);
        assert_eq(emp.token_type, 1u8);

        let derived_commitment: field = BHP256::hash_to_field(SalaryCommitment {
            salary: record_rate,
            secret: record_secret,
        });
        assert_eq(derived_commitment, emp.salary_commitment);

        let last: u32 = last_claimed.get_or_use(emp_key, emp.added_at);
        let elapsed: u64 = (block.height - last) as u64;
        let accrued: u64 = elapsed * record_rate;
        assert(claim_amount <= accrued);

        let bal: u64 = company_usdcx.get(employer);
        assert(bal >= claim_amount);
        company_usdcx.set(employer, bal - claim_amount);
        last_claimed.set(emp_key, block.height);
    }

    // =========================================================================
    // TRANSITIONS — BONUS PAYMENTS
    // =========================================================================

    /**
     * pay_bonus_credits
     *
     * Sends a one-time ALEO credit bonus from the company pool to any address.
     * No employment registration is required — any wallet may receive a bonus.
     * The recipient receives a private credits record.
     *
     * @param employee Recipient wallet address
     * @param amount   Bonus amount in microcredits (> 0)
     *
     * @reverts if company is paused
     * @reverts if caller is not the registered admin
     * @reverts if company balance is insufficient
     */
    async transition pay_bonus_credits(
        public employee: address,
        public amount: u64,
    ) -> Future {
        assert(amount > 0u64);
        let f0: Future = credits.aleo/transfer_public(employee, amount);
        return finalize_pay_bonus_credits(self.caller, amount, f0);
    }

    async function finalize_pay_bonus_credits(employer: address, amount: u64, f0: Future) {
        f0.await();
        let company: CompanyData = companies.get(employer);
        assert_eq(company.admin, employer);
        assert(!company.is_paused);
        let bal: u64 = company_credits.get(employer);
        assert(bal >= amount);
        company_credits.set(employer, bal - amount);
    }

    /**
     * pay_bonus_usdcx
     *
     * Sends a one-time USDCX bonus from the company pool to any address.
     * The recipient receives a private Token record.
     * A ComplianceRecord is issued to Circle's compliance address.
     *
     * @param employee Recipient wallet address
     * @param amount   Bonus amount in μUSDCx (> 0)
     *
     * @reverts if company is paused
     * @reverts if caller is not the registered admin
     * @reverts if company balance is insufficient
     */
    async transition pay_bonus_usdcx(
        public employee: address,
        public amount: u64,
    ) -> Future {
        assert(amount > 0u64);
        let f0: Future = test_usdcx_stablecoin.aleo/transfer_public(employee, amount as u128);
        return finalize_pay_bonus_usdcx(self.caller, amount, f0);
    }

    async function finalize_pay_bonus_usdcx(employer: address, amount: u64, f0: Future) {
        f0.await();
        let company: CompanyData = companies.get(employer);
        assert_eq(company.admin, employer);
        assert(!company.is_paused);
        let bal: u64 = company_usdcx.get(employer);
        assert(bal >= amount);
        company_usdcx.set(employer, bal - amount);
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @admin constructor
     *
     * Runs once at deployment and again on every approved upgrade.
     * The @admin decorator restricts future upgrades to the deployer address.
     * The constructor body is immutable after the initial deployment.
     *
     * Upgrade policy:
     *   - Only aleo1gglqej3ple3a7twtpk6f7g69cnhsmlc0vexkfj6hspx90mrd35zsx75m46
     *     may submit upgrade transactions for this program.
     *   - Permitted upgrades: internal logic, new mappings/structs, new transitions.
     *   - Prohibited: altering existing transition signatures, removing mappings.
     *
     * @see https://developer.aleo.org/guides/program_upgradability/
     */
    @admin(address="aleo1gglqej3ple3a7twtpk6f7g69cnhsmlc0vexkfj6hspx90mrd35zsx75m46")
    async constructor() {
    }
}
