/**
 * StealthPay contract integration service.
 * Wires frontend to stealthpay.aleo program via wallet adapter.
 */

/** Generate a random field value for salt (used in invoice commitment).
 *  Leo/Aleo expects field inputs as decimal strings with "field" suffix, not hex. */
export function generateSalt(): string {
  const bytes = new Uint8Array(32);
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

/** Build payment URL for an invoice */
export function buildPaymentUrl(baseUrl: string, merchant: string, amount: string, salt: string): string {
  const params = new URLSearchParams({ merchant, amount, salt });
  return `${baseUrl}/pay?${params.toString()}`;
}

export type CreateInvoiceParams = {
  merchant: string;
  amountMicrocredits: number;
  salt: string;
  expiryHours?: number;
  invoiceType?: number; // 0 = Standard, 1 = Multi-pay
};

export type PayInvoiceParams = {
  merchant: string;
  amountMicrocredits: number;
  salt: string;
  paymentSecret: string;
  message?: string;
};

export type SettleInvoiceParams = {
  salt: string;
  amountMicrocredits: number;
};
