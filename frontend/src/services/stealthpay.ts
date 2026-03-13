/**
 * StealthPay contract integration service.
 * Wires frontend to stealthpay_usdcx.aleo program via wallet adapter.
 */

export const STEALTHPAY_PROGRAM_ID = import.meta.env.VITE_STEALTHPAY_PROGRAM_ID || "stealthpay_usdcx_v4.aleo";
export const USDCX_PROGRAM_ID = import.meta.env.VITE_USDCX_PROGRAM_ID || "test_usdcx_stablecoin.aleo";

/** Generate a random field value for salt (used in invoice commitment).
 *  Leo/Aleo expects field inputs as decimal strings with "field" suffix, not hex.
 *  We use 31 bytes (248 bits) instead of 32 bytes (256 bits) because 
 *  the maximum field size for Aleo is roughly ~253 bits. Generating a 
 *  256-bit number frequently results in an 'Invalid field element' error 
 *  from the wallet, preventing transaction execution. 
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(31); // 248 bits to ensure within Aleo field capacity
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const decimal = BigInt("0x" + hex).toString();
  return `${decimal}field`;
}

/** Generate a random field for payment_secret */
export function generatePaymentSecret(): string {
  return generateSalt();
}

/** Convert credits to microcredits (1 credit = 1_000_000 microcredits) */
export function toMicrocredits(credits: number): number {
  return Math.floor(credits * 1_000_000);
}

/** Leo Testnet Explorer base URL for transaction verification */
export const LEO_TESTNET_EXPLORER = "https://testnet.explorer.provable.com";

/** Build explorer URL for a transaction */
export function getExplorerTxUrl(txId: string): string {
  return `${LEO_TESTNET_EXPLORER}/transaction/${txId}`;
}

/** Build explorer URL for an address (shows all transactions) */
export function getExplorerAddressUrl(address: string): string {
  return `${LEO_TESTNET_EXPLORER}/address/${address}`;
}

/** Build payment URL for an invoice */
export function buildPaymentUrl(baseUrl: string, merchant: string, amount: string, salt: string, tokenType: number = 0): string {
  const params = new URLSearchParams({ merchant, amount, salt, token: tokenType === 1 ? 'usdcx' : 'credits' });
  return `${baseUrl}/pay?${params.toString()}`;
}

export type CreateInvoiceParams = {
  merchant: string;
  amountMicrocredits: number; // For USDCx, this is still the raw value (6 decimals)
  salt: string;
  memo?: string;              // Optional memo string (encoded as field on-chain)
  expiryHours?: number;
  invoiceType?: number; // 0 = Standard, 1 = Multi-pay
  tokenType?: number; // 0 = Credits, 1 = USDCx
};

export type PayInvoiceParams = {
  merchant: string;
  amountMicrocredits: number;
  salt: string;
  paymentSecret: string;
  message?: string;
  tokenType?: number; // 0 = Credits, 1 = USDCx
};

export type SettleInvoiceParams = {
  salt: string;
  amountMicrocredits: number;
};
