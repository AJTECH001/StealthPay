// ── Aleo Network ──────────────────────────────────────────────────────────────

export const ALEO_NETWORK = "testnet";
export const PROGRAM_ID = "stealthpay_payroll_v3.aleo";
export const CREDITS_PROGRAM = "credits.aleo";
export const USDCX_PROGRAM_ID = "test_usdcx_stablecoin.aleo";

export const EXPLORER_BASES = [
  "https://api.explorer.provable.com/v1/testnet",
  "https://api.explorer.aleo.org/v1/testnet",
];

export const EXPLORER_TX_URL = "https://explorer.provable.com/transaction?network=testnet";

// ── Token & Payment Types ─────────────────────────────────────────────────────

export const PAYMENT_TYPES = {
  LUMP_SUM: 0,
  STREAMING: 1,
} as const;

export const TOKEN_TYPES = {
  CREDITS: 0,
  USDCX: 1,
} as const;

export type PaymentTypeValue = (typeof PAYMENT_TYPES)[keyof typeof PAYMENT_TYPES];
export type TokenTypeValue = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

// Aleo testnet block time is ~5 seconds.
// 1 hour  = 720 blocks
// 30 days = 518_400 blocks  (DEFAULT_INTERVAL in the contract)
export const BLOCKS_PER_HOUR = 720n;
export const BLOCKS_PER_MONTH = 518_400n; // 30 days

// ── Helpers ───────────────────────────────────────────────────────────────────

export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a microcredits amount (smallest Aleo unit) to a human-readable string.
 * 1 credit = 1_000_000 microcredits
 */
export function formatCredits(microcredits: bigint): string {
  const divisor = 1_000_000n;
  const whole = microcredits / divisor;
  const frac = microcredits % divisor;
  const fracStr = frac.toString().padStart(6, "0").slice(0, 4);
  return `${whole}.${fracStr}`;
}

/**
 * Parse a human-readable credits amount (e.g. "100.5") to microcredits bigint.
 */
export function parseCredits(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".");
  const fracPadded = frac.slice(0, 6).padEnd(6, "0");
  return BigInt(whole + fracPadded);
}

/**
 * Convert monthly salary in credits to per-BLOCK stream rate in microcredits.
 * The contract accrues: elapsed_blocks × rate — so rate is microcredits per block.
 * Aleo testnet ≈ 5 s/block → 518_400 blocks per 30-day month.
 * Returns at minimum 1 microcredit/block.
 */
export function monthlyToStreamRate(monthlyCredits: string): bigint {
  const monthly = parseCredits(monthlyCredits);
  const rate = monthly / BLOCKS_PER_MONTH;
  return rate > 0n ? rate : 1n;
}

/**
 * Encode a UTF-8 string as a Leo field element.
 * Used to compute the name_hash input for register_company.
 */
export function stringToField(str: string): string {
  if (!str) return "0field";
  const bytes = new TextEncoder().encode(str);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  const MAX_FIELD = 8444461749428370424248824938781546531375899335154063827935233455917409239040n;
  return `${n % MAX_FIELD}field`;
}
