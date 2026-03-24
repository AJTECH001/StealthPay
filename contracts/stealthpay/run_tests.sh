#!/usr/bin/env bash
# =============================================================================
# StealthPay Payroll — Test Suite
# =============================================================================
# Uses `leo run` (transition body only, no network) for unit tests.
# Uses `leo execute` (full finalize, on-chain state) for integration tests.
#
# Run unit tests:        bash run_tests.sh
# Run integration tests: bash run_tests.sh --integration
#
# leo run  = ZK computation verified, records produced, NO mapping state changes
# leo execute = real transaction sent, finalize runs, mappings updated
# =============================================================================

set -e

# ─── Addresses ───────────────────────────────────────────────────────────────
# SIGNER is derived from the PRIVATE_KEY in .env — this is the leo run caller.
# For unit tests, records must be owned by SIGNER so they can be consumed.
# Run `leo account import <PRIVATE_KEY>` to re-derive SIGNER if you change .env.
SIGNER="aleo1gglqej3ple3a7twtpk6f7g69cnhsmlc0vexkfj6hspx90mrd35zsx75m46"
EMPLOYER="${SIGNER}"     # same address: unit tests run as a single signer
EMPLOYEE="${SIGNER}"     # record owner must equal signer for leo run to consume it
STRANGER="aleo1ashyu96tjwe63u0gtnnv8z5lhapdu4l5pjsl2kha7fv7hvz2eqxs5dz0rg"

# ─── Amounts (microcredits / μUSDCx) ─────────────────────────────────────────
# 1 ALEO = 1_000_000 microcredits
# 1 USDC = 1_000_000 μUSDCx
MONTHLY_SALARY="5000000u64"     # 5 ALEO / month
STREAM_RATE="100u64"            # 100 microcredits per block (~$0.0001/block, demo rate)
DEPOSIT_AMOUNT="50000000u64"    # 50 ALEO total deposit
BONUS_AMOUNT="1000000u64"       # 1 ALEO bonus
PAYROLL_INTERVAL="720u32"       # 720 blocks ≈ 1 hour (min)

# ─── Name hash (field encoding of company name) ──────────────────────────────
COMPANY_NAME_HASH="1234567890field"

# ─── Salary secret (random field chosen by employer at hire time) ─────────────
# In production this would be a cryptographically random field element.
# For tests we use a fixed value so records are deterministic.
SALARY_SECRET="9876543210987654321field"

# ─── Record extraction helper ─────────────────────────────────────────────────
# Leo run outputs records with .private/.public field suffixes and a real _nonce.
# We capture the first output record from `leo run add_employee` to use as input
# in claim tests. This is the correct way to test record-consuming transitions.
extract_record() {
    # $1 = leo run output; extracts the first { ... } block under "Outputs"
    echo "$1" | python3 -c "
import sys, re
data = sys.stdin.read()
m = re.search(r'Outputs\s*\n\s*•\s*(\{.*?\})', data, re.DOTALL)
if m:
    print(m.group(1).strip())
"
}

echo ""
echo "  → Generating EmployeeRecord fixtures via leo run add_employee..."

# Lump-sum ALEO record
_OUT=$(leo run add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 0u8 0u8 2>&1)
LUMP_CREDITS_RECORD=$(extract_record "$_OUT")

# Lump-sum USDCX record
_OUT=$(leo run add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 0u8 1u8 2>&1)
LUMP_USDCX_RECORD=$(extract_record "$_OUT")

# Streaming ALEO record
_OUT=$(leo run add_employee ${EMPLOYEE} ${STREAM_RATE} ${SALARY_SECRET} 1u8 0u8 2>&1)
STREAM_CREDITS_RECORD=$(extract_record "$_OUT")

# Streaming USDCX record
_OUT=$(leo run add_employee ${EMPLOYEE} ${STREAM_RATE} ${SALARY_SECRET} 1u8 1u8 2>&1)
STREAM_USDCX_RECORD=$(extract_record "$_OUT")

# Wrong-type records (for rejection tests — mismatched payment_type / token_type)
_OUT=$(leo run add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 0u8 1u8 2>&1)
WRONG_TOKEN_RECORD=$(extract_record "$_OUT")   # USDCX record used in credits fn

_OUT=$(leo run add_employee ${EMPLOYEE} ${STREAM_RATE} ${SALARY_SECRET} 1u8 0u8 2>&1)
WRONG_PAYMENT_RECORD=$(extract_record "$_OUT") # streaming record used in lump-sum fn

# ─── Helpers ─────────────────────────────────────────────────────────────────
PASS=0
FAIL=0

pass() { echo "  ✓ PASS — $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ FAIL — $1"; FAIL=$((FAIL+1)); }

# Runs a command. Expects it to SUCCEED (exit 0).
expect_ok() {
    local desc="$1"; shift
    if eval "$@" > /dev/null 2>&1; then
        pass "$desc"
    else
        fail "$desc (expected success, got error)"
    fi
}

# Runs a command. Expects it to FAIL (non-zero exit) because an assert fires.
expect_fail() {
    local desc="$1"; shift
    if eval "$@" > /dev/null 2>&1; then
        fail "$desc (expected failure, but it passed)"
    else
        pass "$desc (correctly rejected)"
    fi
}

section() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# =============================================================================
# UNIT TESTS  (leo run — transition body only, no finalize)
# =============================================================================

echo ""
echo "============================================="
echo " StealthPay Payroll — Unit Tests (leo run)"
echo "============================================="

# ─── register_company ────────────────────────────────────────────────────────
section "1. register_company"

expect_ok "valid registration (interval=720)" \
    "leo run register_company ${COMPANY_NAME_HASH} ${PAYROLL_INTERVAL}"

expect_ok "valid registration (interval=518400, 30 days)" \
    "leo run register_company ${COMPANY_NAME_HASH} 518400u32"

# Note: assert(payroll_interval >= 720) lives in finalize, not transition body.
# The transition itself passes — the guard fires on-chain.
# Test the finalize guard in the integration section below.

# ─── deposit_credits ─────────────────────────────────────────────────────────
section "2. deposit_credits"

expect_ok "deposit 50 ALEO" \
    "leo run deposit_credits ${DEPOSIT_AMOUNT}"

expect_fail "deposit 0 (assert amount > 0)" \
    "leo run deposit_credits 0u64"

# ─── deposit_usdcx ───────────────────────────────────────────────────────────
section "3. deposit_usdcx"

expect_ok "deposit 50 USDCX" \
    "leo run deposit_usdcx ${DEPOSIT_AMOUNT}"

expect_fail "deposit 0 USDCX (assert amount > 0)" \
    "leo run deposit_usdcx 0u64"

# ─── withdraw_credits ────────────────────────────────────────────────────────
section "4. withdraw_credits"

expect_ok "withdraw 10 ALEO" \
    "leo run withdraw_credits 10000000u64"

expect_fail "withdraw 0 (assert amount > 0)" \
    "leo run withdraw_credits 0u64"

# ─── withdraw_usdcx ──────────────────────────────────────────────────────────
section "5. withdraw_usdcx"

expect_ok "withdraw 10 USDCX" \
    "leo run withdraw_usdcx 10000000u64"

expect_fail "withdraw 0 USDCX (assert amount > 0)" \
    "leo run withdraw_usdcx 0u64"

# ─── add_employee ────────────────────────────────────────────────────────────
section "6. add_employee"

expect_ok "add lump-sum ALEO employee" \
    "leo run add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 0u8 0u8"

expect_ok "add lump-sum USDCX employee" \
    "leo run add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 0u8 1u8"

expect_ok "add streaming ALEO employee" \
    "leo run add_employee ${EMPLOYEE} ${STREAM_RATE} ${SALARY_SECRET} 1u8 0u8"

expect_ok "add streaming USDCX employee" \
    "leo run add_employee ${EMPLOYEE} ${STREAM_RATE} ${SALARY_SECRET} 1u8 1u8"

expect_fail "add employee with salary=0 (assert salary > 0)" \
    "leo run add_employee ${EMPLOYEE} 0u64 ${SALARY_SECRET} 0u8 0u8"

expect_fail "add employee with payment_type=2 (assert <= 1)" \
    "leo run add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 2u8 0u8"

expect_fail "add employee with token_type=2 (assert <= 1)" \
    "leo run add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 0u8 2u8"

# ─── remove_employee ─────────────────────────────────────────────────────────
section "7. remove_employee"

expect_ok "remove employee (transition body)" \
    "leo run remove_employee ${EMPLOYEE}"

# ─── claim_payroll_credits ───────────────────────────────────────────────────
section "8. claim_payroll_credits"

expect_ok "valid lump-sum ALEO claim" \
    "leo run claim_payroll_credits \"${LUMP_CREDITS_RECORD}\" ${MONTHLY_SALARY}"

expect_fail "claim 0 amount (assert > 0)" \
    "leo run claim_payroll_credits \"${LUMP_CREDITS_RECORD}\" 0u64"

expect_fail "wrong claim_amount (commitment scheme: assert_eq claim_amount salary)" \
    "leo run claim_payroll_credits \"${LUMP_CREDITS_RECORD}\" 1u64"

expect_fail "wrong payment_type (streaming record passed to lump-sum fn)" \
    "leo run claim_payroll_credits \"${STREAM_CREDITS_RECORD}\" ${STREAM_RATE}"

expect_fail "wrong token_type (USDCX record passed to credits fn)" \
    "leo run claim_payroll_credits \"${LUMP_USDCX_RECORD}\" ${MONTHLY_SALARY}"

# ─── claim_payroll_usdcx ─────────────────────────────────────────────────────
section "9. claim_payroll_usdcx"

expect_ok "valid lump-sum USDCX claim" \
    "leo run claim_payroll_usdcx \"${LUMP_USDCX_RECORD}\" ${MONTHLY_SALARY}"

expect_fail "claim 0 USDCX (assert > 0)" \
    "leo run claim_payroll_usdcx \"${LUMP_USDCX_RECORD}\" 0u64"

expect_fail "wrong claim_amount USDCX (commitment scheme: assert_eq claim_amount salary)" \
    "leo run claim_payroll_usdcx \"${LUMP_USDCX_RECORD}\" 1u64"

expect_fail "wrong payment_type on USDCX claim" \
    "leo run claim_payroll_usdcx \"${STREAM_USDCX_RECORD}\" ${STREAM_RATE}"

expect_fail "wrong token_type on USDCX claim (credits record passed)" \
    "leo run claim_payroll_usdcx \"${LUMP_CREDITS_RECORD}\" ${MONTHLY_SALARY}"

# ─── claim_stream_credits ────────────────────────────────────────────────────
section "10. claim_stream_credits"

expect_ok "valid streaming ALEO claim (partial)" \
    "leo run claim_stream_credits \"${STREAM_CREDITS_RECORD}\" 50u64"

expect_ok "valid streaming ALEO claim (full stream_rate)" \
    "leo run claim_stream_credits \"${STREAM_CREDITS_RECORD}\" ${STREAM_RATE}"

expect_fail "streaming claim of 0 (assert > 0)" \
    "leo run claim_stream_credits \"${STREAM_CREDITS_RECORD}\" 0u64"

expect_fail "wrong payment_type (lump-sum record used in stream fn)" \
    "leo run claim_stream_credits \"${LUMP_CREDITS_RECORD}\" ${MONTHLY_SALARY}"

expect_fail "wrong token_type on stream claim" \
    "leo run claim_stream_credits \"${STREAM_USDCX_RECORD}\" ${STREAM_RATE}"

# ─── claim_stream_usdcx ──────────────────────────────────────────────────────
section "11. claim_stream_usdcx"

expect_ok "valid streaming USDCX claim" \
    "leo run claim_stream_usdcx \"${STREAM_USDCX_RECORD}\" 50u64"

expect_fail "streaming USDCX claim of 0" \
    "leo run claim_stream_usdcx \"${STREAM_USDCX_RECORD}\" 0u64"

expect_fail "wrong payment_type on USDCX stream" \
    "leo run claim_stream_usdcx \"${LUMP_USDCX_RECORD}\" ${MONTHLY_SALARY}"

expect_fail "wrong token_type (credits record in USDCX stream fn)" \
    "leo run claim_stream_usdcx \"${STREAM_CREDITS_RECORD}\" ${STREAM_RATE}"

# ─── pay_bonus_credits ───────────────────────────────────────────────────────
section "12. pay_bonus_credits"

expect_ok "pay 1 ALEO bonus to employee" \
    "leo run pay_bonus_credits ${EMPLOYEE} ${BONUS_AMOUNT}"

expect_ok "pay bonus to any address (no employment required)" \
    "leo run pay_bonus_credits ${STRANGER} ${BONUS_AMOUNT}"

expect_fail "pay 0 bonus (assert > 0)" \
    "leo run pay_bonus_credits ${EMPLOYEE} 0u64"

# ─── pay_bonus_usdcx ─────────────────────────────────────────────────────────
section "13. pay_bonus_usdcx"

expect_ok "pay 1 USDCX bonus" \
    "leo run pay_bonus_usdcx ${EMPLOYEE} ${BONUS_AMOUNT}"

expect_fail "pay 0 USDCX bonus (assert > 0)" \
    "leo run pay_bonus_usdcx ${EMPLOYEE} 0u64"

# ─── pause_company ───────────────────────────────────────────────────────────
section "14. pause_company"

expect_ok "pause company (transition body)" \
    "leo run pause_company"

# ─── unpause_company ─────────────────────────────────────────────────────────
section "15. unpause_company"

expect_ok "unpause company (transition body)" \
    "leo run unpause_company"

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "============================================="
echo " Unit Test Results"
echo "============================================="
echo " PASSED: ${PASS}"
echo " FAILED: ${FAIL}"
echo " TOTAL:  $((PASS+FAIL))"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo " ⚠  Some tests failed. Fix the contract before deploying."
    echo ""
fi

# =============================================================================
# INTEGRATION TESTS (leo execute — requires testnet)
# These test the FINALIZE logic: mapping reads, balance guards, intervals.
# Only runs when --integration flag is passed.
# =============================================================================

if [[ "$1" != "--integration" ]]; then
    echo " ℹ  Skipping integration tests. Run with --integration to include them."
    echo " ℹ  Integration tests require: funded testnet wallet + ENDPOINT in .env"
    echo ""
    exit $( [ "$FAIL" -eq 0 ] && echo 0 || echo 1 )
fi

echo ""
echo "============================================="
echo " Integration Tests (leo execute — testnet)"
echo "============================================="
echo " These modify on-chain state. Each step builds on the previous."
echo ""

INT_PASS=0
INT_FAIL=0

ipass() { echo "  ✓ PASS — $1"; INT_PASS=$((INT_PASS+1)); }
ifail() { echo "  ✗ FAIL — $1"; INT_FAIL=$((INT_FAIL+1)); }

iexpect_ok() {
    local desc="$1"; shift
    if eval "$@" > /dev/null 2>&1; then
        ipass "$desc"
    else
        ifail "$desc (expected success, got error)"
    fi
}

iexpect_fail() {
    local desc="$1"; shift
    if eval "$@" > /dev/null 2>&1; then
        ifail "$desc (expected failure, but it passed)"
    else
        ipass "$desc (correctly rejected on-chain)"
    fi
}

section "INT-1: register_company"
iexpect_ok "register company with 720 interval" \
    "leo execute register_company ${COMPANY_NAME_HASH} ${PAYROLL_INTERVAL}"

iexpect_fail "cannot register same address twice (assert !contains)" \
    "leo execute register_company ${COMPANY_NAME_HASH} ${PAYROLL_INTERVAL}"

iexpect_fail "interval below minimum (assert >= 720)" \
    "leo execute register_company ${COMPANY_NAME_HASH} 100u32"

section "INT-2: deposit_credits"
iexpect_ok "deposit 50 ALEO into pool" \
    "leo execute deposit_credits ${DEPOSIT_AMOUNT}"

iexpect_fail "unregistered company cannot deposit (assert companies.contains)" \
    "leo execute deposit_credits ${DEPOSIT_AMOUNT}"
# (This would fail if run from a different address with no company)

section "INT-3: add_employee"
iexpect_ok "add lump-sum ALEO employee" \
    "leo execute add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 0u8 0u8"

iexpect_fail "add same active employee again (assert !is_active)" \
    "leo execute add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 0u8 0u8"

section "INT-4: remove and re-hire"
iexpect_ok "remove employee" \
    "leo execute remove_employee ${EMPLOYEE}"

iexpect_ok "re-hire same employee after removal" \
    "leo execute add_employee ${EMPLOYEE} ${MONTHLY_SALARY} ${SALARY_SECRET} 0u8 0u8"

section "INT-5: claim_payroll_credits"
# Note: payroll_interval=720 blocks (~1hr). On testnet this won't have elapsed.
# For testing, deploy with payroll_interval=1u32 (single block).
iexpect_fail "claim before interval has elapsed (block.height check in finalize)" \
    "leo execute claim_payroll_credits \"${LUMP_CREDITS_RECORD}\" ${MONTHLY_SALARY}"

section "INT-6: pause_company"
iexpect_ok "pause active company" \
    "leo execute pause_company"

iexpect_fail "claim while company is paused (assert !is_paused)" \
    "leo execute claim_payroll_credits \"${LUMP_CREDITS_RECORD}\" ${MONTHLY_SALARY}"

iexpect_fail "pause already-paused company (assert !is_paused)" \
    "leo execute pause_company"

section "INT-7: unpause_company"
iexpect_ok "unpause company" \
    "leo execute unpause_company"

iexpect_fail "unpause already-active company (assert is_paused)" \
    "leo execute unpause_company"

section "INT-8: pay_bonus_credits"
iexpect_ok "pay 1 ALEO bonus (deducted from company pool)" \
    "leo execute pay_bonus_credits ${EMPLOYEE} ${BONUS_AMOUNT}"

iexpect_fail "pay bonus exceeding pool balance" \
    "leo execute pay_bonus_credits ${EMPLOYEE} 999999999999u64"

# ─── Integration Summary ─────────────────────────────────────────────────────
echo ""
echo "============================================="
echo " Integration Test Results"
echo "============================================="
echo " PASSED: ${INT_PASS}"
echo " FAILED: ${INT_FAIL}"
echo " TOTAL:  $((INT_PASS+INT_FAIL))"
echo ""

TOTAL_FAIL=$((FAIL+INT_FAIL))
exit $( [ "$TOTAL_FAIL" -eq 0 ] && echo 0 || echo 1 )
