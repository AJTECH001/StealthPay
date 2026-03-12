/**
 * useStealthPay — core hook for all StealthPay on-chain interactions.
 *
 * Every executeTransaction call matches the exact Leo contract signature:
 *
 *   create_invoice(merchant, amount:u64, salt, memo, expiry_hours:u32, invoice_type:u8)
 *   create_invoice_usdcx(merchant, amount:u128, salt, memo, expiry_hours:u32, invoice_type:u8)
 *   pay_invoice(record, merchant, amount:u64, salt, payment_secret, message)
 *   pay_invoice_usdcx(record, merchant, amount:u128, salt, payment_secret, message, [proof,proof])
 *   pay_donation(record, merchant, amount:u64, salt, payment_secret, message)
 *   pay_donation_usdcx(record, merchant, amount:u128, salt, payment_secret, message, [proof,proof])
 *   settle_invoice(salt, amount:u64)
 *   make_payment(record, amount:u64, merchant)
 *   make_payment_usdcx(record, amount:u128, merchant, [proof,proof])
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import {
  PROGRAM_ID,
  USDCX_PROGRAM_ID,
  buildUsdcxProofs,
  stringToField,
} from "../utils/aleo-utils";
import {
  buildPaymentUrl,
  generatePaymentSecret,
  generateSalt,
  toMicrocredits,
  type CreateInvoiceParams,
  type PayInvoiceParams,
  type SettleInvoiceParams,
} from "../services/stealthpay";

const CREDITS_PROGRAM_ID = "credits.aleo";

// ─── Optimistic Ledger ───────────────────────────────────────────────────────
// Tracks estimated private balances in localStorage so the UI shows the right
// balance immediately after shielding, before the wallet extension syncs.

interface Ledger { credits: number; usdcx: number; }
const LEDGER_KEY = (addr: string) => `sp-ledger-${addr}`;

function getLedger(addr: string): Ledger {
  try {
    return { credits: 0, usdcx: 0, ...JSON.parse(localStorage.getItem(LEDGER_KEY(addr)) ?? "{}") };
  } catch { return { credits: 0, usdcx: 0 }; }
}

function saveLedger(addr: string, ledger: Ledger) {
  try { localStorage.setItem(LEDGER_KEY(addr), JSON.stringify(ledger)); } catch {}
}

function adjustLedger(addr: string, delta: Partial<Ledger>) {
  const l = getLedger(addr);
  const next: Ledger = {
    credits: Math.max(0, l.credits + (delta.credits ?? 0)),
    usdcx:   Math.max(0, l.usdcx   + (delta.usdcx   ?? 0)),
  };
  saveLedger(addr, next);
  return next;
}

function clearLedgerField(addr: string, field: keyof Ledger) {
  const l = getLedger(addr);
  l[field] = 0;
  saveLedger(addr, l);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type TxStatus = "idle" | "pending" | "success" | "error";

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useStealthPay() {
  const { address, executeTransaction, requestRecords, transactionStatus } = useWallet();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicBalance, setPublicBalance] = useState<number | null>(null);
  const [privateBalance, setPrivateBalance] = useState<number | null>(null);
  const [usdcxPublicBalance, setUsdcxPublicBalance] = useState<number | null>(null);
  const [usdcxPrivateBalance, setUsdcxPrivateBalance] = useState<number | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const [pendingShieldAmount, setPendingShieldAmountRaw] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("sp-pending-shield") ?? "0") || 0; } catch { return 0; }
  });
  const [pendingUsdcxAmount, setPendingUsdcxAmountRaw] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem("sp-pending-shield-usdcx") ?? "0") || 0; } catch { return 0; }
  });

  const setPendingShieldAmount = useCallback((val: number | ((p: number) => number)) => {
    setPendingShieldAmountRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        if (next > 0) localStorage.setItem("sp-pending-shield", String(next));
        else localStorage.removeItem("sp-pending-shield");
      } catch {}
      return next;
    });
  }, []);

  const setPendingUsdcxAmount = useCallback((val: number | ((p: number) => number)) => {
    setPendingUsdcxAmountRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        if (next > 0) localStorage.setItem("sp-pending-shield-usdcx", String(next));
        else localStorage.removeItem("sp-pending-shield-usdcx");
      } catch {}
      return next;
    });
  }, []);

  const recordsAccessDenied = useRef(false);

  useEffect(() => {
    recordsAccessDenied.current = false;
  }, [address]);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxId(null);
    setError(null);
  }, []);

  // ─── Shared Helpers ────────────────────────────────────────────────────────

  /**
   * Fetch the first usable private record for a program.
   *
   * Retries up to 3 times with a 1.5 s pause between attempts so that
   * a freshly-shielded record that the wallet is still scanning can be
   * found without immediately declaring "wallet_syncing".
   */
  // Parse microcredits/amount from any record shape the wallet adapter returns.
  const parseMicrocreditsFromRecord = (rec: unknown): number => {
    const r = rec as Record<string, unknown>;
    // Direct field
    if (typeof r?.microcredits === "number") return r.microcredits as number;
    if (typeof r?.microcredits === "string")
      return parseInt((r.microcredits as string).replace(/u\d+/g, "").replace(/_/g, "")) || 0;
    // Nested under .data
    if (r?.data) {
      const v = (r.data as Record<string, unknown>).microcredits;
      if (typeof v === "number") return v;
      if (typeof v === "string") return parseInt(String(v).replace(/u\d+/g, "").replace(/_/g, "")) || 0;
    }
    // Plaintext / JSON string scan
    const content = typeof rec === "string" ? rec : JSON.stringify(rec);
    const m = content.match(/microcredits:\s*(?:"|')?(\d[\d_]*)u\d+/);
    return m ? parseInt(m[1].replace(/_/g, "")) : 0;
  };

  const getFirstRecord = useCallback(
    async (program: string, requiredMicrocredits = 0): Promise<string | null> => {
      if (!requestRecords) return null;

      // Wrap any requestRecords call so it can't hang forever.
      // If the wallet service worker is suspended the promise never resolves;
      // this races it against a rejection timer so we always get an answer.
      const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(
              () => reject(new Error(`requestRecords timeout after ${ms}ms`)),
              ms
            )
          ),
        ]);

      // tryFetch returns the first non-empty records array found.
      // It also tracks whether every single call timed out — if so, the wallet
      // service worker is suspended and there is no point retrying the outer loop.
      const tryFetch = async (): Promise<{ records: unknown[]; walletHung: boolean }> => {
        const CALL_TIMEOUT = 5_000; // 5 s per individual call
        let timedOutCount = 0;

        const isTimeout = (e: unknown) =>
          e instanceof Error && e.message.includes("timeout");

        // IMPORTANT: try `true` first — this is what refreshBalances uses and
        // is the call we know returns records when the balance shows on dashboard.
        // `true` = full scan / include all records (wallet-adapter dependent).
        try {
          const r = await withTimeout(requestRecords(program, true), CALL_TIMEOUT);
          if (Array.isArray(r) && r.length) return { records: r, walletHung: false };
        } catch (e) { if (isTimeout(e)) timedOutCount++; }
        // Fallback: try with `false` (unspent-only in some adapters)
        try {
          const r = await withTimeout(requestRecords(program, false), CALL_TIMEOUT);
          if (Array.isArray(r) && r.length) return { records: r, walletHung: false };
        } catch (e) { if (isTimeout(e)) timedOutCount++; }
        // Last resort: no argument (some adapters default to all unspent)
        try {
          const r = await withTimeout(
            (requestRecords as (p: string) => Promise<unknown[]>)(program),
            CALL_TIMEOUT
          );
          if (Array.isArray(r) && r.length) return { records: r, walletHung: false };
        } catch (e) { if (isTimeout(e)) timedOutCount++; }

        // If all 3 calls timed out the wallet is completely unresponsive — bail
        // immediately rather than retrying 7 more times (which would add another
        // ~3 minutes of waiting).
        return { records: [], walletHung: timedOutCount === 3 };
      };

      // Retry up to 8× with 2 s gaps (≤16 s total) ONLY when the wallet is
      // responsive but the record hasn't appeared yet (e.g. waiting for block scan).
      // If the wallet is hung (all calls timed out) we exit immediately.
      for (let attempt = 0; attempt < 8; attempt++) {
        const { records, walletHung } = await tryFetch();
        if (walletHung) break; // wallet suspended — return null so UI shows error
        if (records.length) {
          // Pick the record with the highest balance — not just records[0].
          // This ensures we never pass an insufficient record to transfer_private,
          // which would cause an on-chain rejection if balance < payment amount.
          const best = records.reduce((prev: unknown, curr: unknown) => {
            return parseMicrocreditsFromRecord(curr) >= parseMicrocreditsFromRecord(prev)
              ? curr
              : prev;
          }, records[0]);

          // If caller specified a required amount, verify the best record covers it.
          if (requiredMicrocredits > 0) {
            const bestBalance = parseMicrocreditsFromRecord(best);
            if (bestBalance < requiredMicrocredits) {
              // Record found but balance is too low — keep retrying; the wallet
              // may not have finished scanning all records yet.
              if (attempt < 7) {
                await new Promise<void>((res) => setTimeout(res, 2_000));
                continue;
              }
              // After max retries: return null so callers show "not enough funds"
              return null;
            }
          }

          return typeof best === "string" ? best : JSON.stringify(best);
        }
        if (attempt < 7) {
          await new Promise<void>((res) => setTimeout(res, 2_000));
        }
      }

      return null;
    },
    [requestRecords]
  );

  // ─── create_invoice ────────────────────────────────────────────────────────
  //
  // Contract: create_invoice(merchant, amount:u64, salt, memo, expiry_hours:u32, invoice_type:u8)
  // Contract: create_invoice_usdcx(merchant, amount:u128, salt, memo, expiry_hours:u32, invoice_type:u8)

  const createInvoice = useCallback(
    async (params: CreateInvoiceParams) => {
      if (!address || !executeTransaction) {
        setError("Wallet not connected");
        setStatus("error");
        return null;
      }

      setStatus("pending");
      setError(null);

      try {
        const {
          merchant,
          amountMicrocredits,
          salt,
          memo = "",
          expiryHours = 0,
          invoiceType = 0,
          tokenType = 0,
        } = params;

        const isUsdcx = tokenType === 1;
        const functionName = isUsdcx ? "create_invoice_usdcx" : "create_invoice";
        const amountStr = isUsdcx
          ? `${BigInt(amountMicrocredits)}u128`
          : `${amountMicrocredits}u64`;

        // Encode memo as a field (empty string → 0field)
        const memoField = memo ? stringToField(memo) : "0field";

        // Compute paymentUrl upfront — it's locally derived and doesn't need the tx
        const paymentUrl = buildPaymentUrl(
          window.location.origin,
          merchant,
          String(amountMicrocredits / 1_000_000),
          salt,
          tokenType
        );

        let result: { transactionId?: string } | null | undefined = undefined;
        try {
          result = await executeTransaction({
            program: PROGRAM_ID,
            function: functionName,
            inputs: [
              merchant,           // private merchant: address
              amountStr,          // private amount: u64 | u128
              salt,               // private salt: field
              memoField,          // private memo: field   ← REQUIRED
              `${expiryHours}u32`,// public expiry_hours: u32
              `${invoiceType}u8`, // public invoice_type: u8
            ],
            fee: 100_000,
            privateFee: false,
          });
        } catch (txErr) {
          // Shield wallet sometimes throws "No response" when its background
          // service worker is suspended by the browser, but the transaction
          // may have already been submitted to the network.  In that case we
          // return a partial result so the UI can still show the payment URL
          // and poll the on-chain salt_to_invoice mapping for confirmation.
          const errMsg = txErr instanceof Error ? txErr.message : String(txErr);
          const isNoResponse =
            errMsg.toLowerCase().includes("no response") ||
            errMsg.toLowerCase().includes("timed out");

          if (isNoResponse) {
            console.warn(
              "[useStealthPay] Wallet 'No response' on create_invoice — " +
              "transaction may have been submitted. Falling back to salt-based polling."
            );
            // Keep status as "pending" so the UI knows to keep polling
            setTxId(null);
            return { transactionId: "", paymentUrl, noResponse: true as const };
          }
          throw txErr; // Re-throw any other wallet errors
        }

        if (result?.transactionId) {
          setTxId(result.transactionId);
          setStatus("success");
          return { transactionId: result.transactionId, paymentUrl };
        }

        setError("Transaction failed");
        setStatus("error");
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create invoice failed");
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction]
  );

  // ─── pay_invoice ──────────────────────────────────────────────────────────
  //
  // Contract: pay_invoice(record, merchant, amount:u64, salt, payment_secret, message)
  // Contract: pay_invoice_usdcx(record, merchant, amount:u128, salt, payment_secret, message, [proof, proof])

  const payInvoice = useCallback(
    async (params: PayInvoiceParams) => {
      if (!address || !executeTransaction || !requestRecords) {
        setError("Wallet not connected");
        setStatus("error");
        return null;
      }

      setStatus("pending");
      setError(null);

      try {
        const {
          merchant,
          amountMicrocredits,
          salt,
          paymentSecret,
          message = "0field",
          tokenType = 0,
          isDonation = false,
        } = params;

        const isUsdcx = tokenType === 1;
        const fetchProgram = isUsdcx ? USDCX_PROGRAM_ID : CREDITS_PROGRAM_ID;

        // Pass requiredMicrocredits so getFirstRecord picks a record that can
        // actually cover the payment — prevents on-chain "balance insufficient" rejection.
        const recordStr = await getFirstRecord(fetchProgram, amountMicrocredits);
        if (!recordStr) {
          const ledger = getLedger(address);
          const hasPending = isUsdcx ? ledger.usdcx > 0 : ledger.credits > 0;
          setError(hasPending
            ? "wallet_syncing"
            : `No ${isUsdcx ? "USDCx" : "credits"} records found. Please shield credits first.`
          );
          setStatus("error");
          return null;
        }

        const amountStr = isUsdcx
          ? `${BigInt(amountMicrocredits)}u128`
          : `${amountMicrocredits}u64`;

        // Build inputs matching the exact contract parameter order
        const inputs: string[] = [
          recordStr,      // pay_record: credits/Token
          merchant,       // merchant: address
          amountStr,      // amount: u64 | u128
          salt,           // salt: field
          paymentSecret,  // private payment_secret: field
          message,        // public message: field
        ];

        let functionName: string;
        if (isDonation) {
          functionName = isUsdcx ? "pay_donation_usdcx" : "pay_donation";
        } else {
          functionName = isUsdcx ? "pay_invoice_usdcx" : "pay_invoice";
        }

        // USDCx functions require a [MerkleProof; 2] as the last argument
        if (isUsdcx) {
          const proofsStr = await buildUsdcxProofs();
          inputs.push(proofsStr);
        }

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: functionName,
          inputs,
          fee: 100_000,
          privateFee: false,
        });

        if (result?.transactionId) {
          setTxId(result.transactionId);
          setStatus("success");

          // Deduct from the optimistic ledger so the dashboard immediately
          // reflects the reduced balance while the wallet scans the change record.
          if (address) {
            const amountCreditsSpent = amountMicrocredits / 1_000_000;
            const next = adjustLedger(
              address,
              isUsdcx ? { usdcx: -amountCreditsSpent } : { credits: -amountCreditsSpent }
            );
            if (isUsdcx) setUsdcxPrivateBalance(Math.max(0, next.usdcx));
            else setPrivateBalance(Math.max(0, next.credits));
          }

          return { transactionId: result.transactionId };
        }

        setError("Transaction failed");
        setStatus("error");
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Pay invoice failed");
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction, requestRecords, getFirstRecord]
  );

  // ─── settle_invoice ───────────────────────────────────────────────────────
  //
  // Contract: settle_invoice(public salt: field, private amount: u64)

  const settleInvoice = useCallback(
    async (params: SettleInvoiceParams) => {
      if (!address || !executeTransaction) {
        setError("Wallet not connected");
        setStatus("error");
        return null;
      }

      setStatus("pending");
      setError(null);

      try {
        const { salt, amountMicrocredits } = params;

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: "settle_invoice",
          inputs: [
            salt,                       // public salt: field
            `${amountMicrocredits}u64`, // private amount: u64
          ],
          fee: 100_000,
          privateFee: false,
        });

        if (result?.transactionId) {
          setTxId(result.transactionId);
          setStatus("success");
          return { transactionId: result.transactionId };
        }

        setError("Transaction failed");
        setStatus("error");
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Settle invoice failed");
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction]
  );

  // ─── make_payment ─────────────────────────────────────────────────────────
  //
  // Contract: make_payment(sender_record: credits, amount: u64, merchant: address)
  // Contract: make_payment_usdcx(sender_record: Token, amount: u128, merchant: address, proofs: [MerkleProof; 2])

  const makePayment = useCallback(
    async (merchant: string, amountCredits: number, tokenType = 0) => {
      if (!address || !executeTransaction || !requestRecords) {
        setError("Wallet not connected");
        setStatus("error");
        return null;
      }

      const isUsdcx = tokenType === 1;
      setStatus("pending");
      setError(null);

      try {
        const amountRaw = isUsdcx
          ? BigInt(Math.round(amountCredits * 1_000_000))
          : BigInt(toMicrocredits(amountCredits));
        const fetchProgram = isUsdcx ? USDCX_PROGRAM_ID : CREDITS_PROGRAM_ID;

        const recordStr = await getFirstRecord(fetchProgram);
        if (!recordStr) {
          const ledger = getLedger(address);
          const hasPending = isUsdcx ? ledger.usdcx > 0 : ledger.credits > 0;
          setError(hasPending
            ? "wallet_syncing"
            : `No ${isUsdcx ? "USDCx" : "credits"} records found. Please shield credits first.`
          );
          setStatus("error");
          return null;
        }

        const amountStr = isUsdcx ? `${amountRaw}u128` : `${amountRaw}u64`;

        // Exact contract parameter order: (record, amount, merchant)
        const inputs: string[] = [
          recordStr,  // sender_record: credits | Token
          amountStr,  // amount: u64 | u128
          merchant,   // merchant: address
        ];

        // USDCx requires Merkle proofs as final argument
        if (isUsdcx) {
          const proofsStr = await buildUsdcxProofs();
          inputs.push(proofsStr);
        }

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: isUsdcx ? "make_payment_usdcx" : "make_payment",
          inputs,
          fee: 100_000,
          privateFee: false,
        });

        if (result?.transactionId) {
          setTxId(result.transactionId);
          setStatus("success");
          // Deduct from local ledger optimistically
          if (address) {
            const next = adjustLedger(
              address,
              isUsdcx ? { usdcx: -amountCredits } : { credits: -amountCredits }
            );
            if (isUsdcx) setUsdcxPrivateBalance(next.usdcx);
            else setPrivateBalance(next.credits);
          }
          return { transactionId: result.transactionId };
        }

        setError("Transaction failed");
        setStatus("error");
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment failed");
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction, requestRecords, getFirstRecord]
  );

  // ─── convertPublicToPrivate ───────────────────────────────────────────────
  //
  // Calls transfer_public_to_private on credits.aleo or test_usdcx_stablecoin.aleo
  // to shield public funds into a private record.

  const convertPublicToPrivate = useCallback(
    async (amount: number, tokenType = 0) => {
      if (!address || !executeTransaction) {
        setError("Wallet not connected");
        setStatus("error");
        return null;
      }

      setStatus("pending");
      setError(null);

      try {
        const isUsdcx = tokenType === 1;
        const program = isUsdcx ? USDCX_PROGRAM_ID : CREDITS_PROGRAM_ID;
        const amountStr = isUsdcx
          ? `${Math.round(amount * 1_000_000)}u128`
          : `${Math.round(amount * 1_000_000)}u64`;

        const result = await executeTransaction({
          program,
          function: "transfer_public_to_private",
          inputs: [address, amountStr],
          fee: 100_000,
          privateFee: false,
        });

        if (result?.transactionId) {
          setTxId(result.transactionId);
          setStatus("success");
          if (address) {
            const next = adjustLedger(address, isUsdcx ? { usdcx: amount } : { credits: amount });
            if (isUsdcx) {
              setUsdcxPrivateBalance(next.usdcx);
              setPendingUsdcxAmount((p) => p + amount);
            } else {
              setPrivateBalance(next.credits);
              setPendingShieldAmount((p) => p + amount);
            }
          }
          return { transactionId: result.transactionId };
        }

        setError("Conversion failed");
        setStatus("error");
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Convert to private failed");
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction]
  );

  // ─── refreshBalances ──────────────────────────────────────────────────────

  const refreshBalances = useCallback(async () => {
    if (!address || !requestRecords) return;

    const apiBases = [
      "https://api.explorer.aleo.org/v1/testnet",
      "https://api.explorer.provable.com/v1/testnet",
      "https://api.provable.com/v2/testnet",
    ];

    try {
      // 1. Private credits balance from records
      if (!recordsAccessDenied.current) {
        // Same timeout guard as getFirstRecord — prevents balance refresh from
        // freezing the UI when the wallet service worker is suspended.
        const raceTimeout = <T>(p: Promise<T>, ms = 10_000): Promise<T> =>
          Promise.race([
            p,
            new Promise<T>((_, reject) =>
              setTimeout(
                () => reject(new Error(`requestRecords timeout after ${ms}ms`)),
                ms
              )
            ),
          ]);

        try {
          const isPermDenied = (e: unknown) =>
            e instanceof Error &&
            (e.message.includes("NOT_GRANTED") ||
              e.message.includes("not granted") ||
              e.message.includes("permission"));

          let records: unknown[] = [];
          try {
            const fetched = await raceTimeout(requestRecords("credits.aleo", true));
            records = Array.isArray(fetched) ? fetched : [];
          } catch (e) {
            if (isPermDenied(e)) throw e;
            const fb = await raceTimeout(requestRecords("credits.aleo"));
            records = Array.isArray(fb) ? fb : [];
          }

          const parseMicro = (rec: unknown, field: "microcredits" | "amount"): number => {
            const r = rec as Record<string, unknown>;
            if (typeof r?.[field] === "number") return r[field] as number;
            if (typeof r?.[field] === "string")
              return parseInt((r[field] as string).replace(/u\d+/g, "").replace(/_/g, "")) || 0;
            if (r?.data) {
              const v = (r.data as Record<string, unknown>)[field];
              return typeof v === "number" ? v : parseInt(String(v).replace(/u\d+/g, "").replace(/_/g, "")) || 0;
            }
            const content = typeof rec === "string" ? rec : JSON.stringify(rec);
            const m = content.match(new RegExp(`${field}:\\s*(?:"|')?([\\d_]+)u\\d+`));
            return m ? parseInt(m[1].replace(/_/g, "")) : 0;
          };

          if (records.length > 0) {
            // Wallet has scanned the record — use the real on-chain total.
            const total = records.reduce((s: number, r: unknown) => s + parseMicro(r, "microcredits"), 0);
            if (address) clearLedgerField(address, "credits");
            setPrivateBalance(total / 1_000_000);
            setPendingShieldAmount(0); // clear the pending badge — record is confirmed
          } else {
            // Wallet hasn't scanned the block yet.
            // Show 0 as the confirmed spendable balance so the dashboard doesn't
            // double-count with the pending (+X) badge.  The badge alone conveys
            // that funds are on their way.
            setPrivateBalance(0);
          }
          setRecordError(null);

          // 1b. Private USDCx balance
          try {
            const uRecs = (await raceTimeout(requestRecords(USDCX_PROGRAM_ID, true))) as unknown[];
            if (uRecs?.length > 0) {
              const total = uRecs.reduce((s: number, r: unknown) => s + parseMicro(r, "amount"), 0);
              if (address) clearLedgerField(address, "usdcx");
              setUsdcxPrivateBalance(total / 1_000_000);
              setPendingUsdcxAmount(0);
            } else {
              setUsdcxPrivateBalance(address ? getLedger(address).usdcx : 0);
            }
          } catch {
            setUsdcxPrivateBalance(address ? getLedger(address).usdcx : 0);
          }
        } catch (recErr) {
          const isDenied =
            recErr instanceof Error &&
            (recErr.message.includes("NOT_GRANTED") ||
              recErr.message.includes("not granted") ||
              recErr.message.includes("permission"));
          if (isDenied) {
            recordsAccessDenied.current = true;
            setRecordError("Wallet record access not granted. Open Leo Wallet → Settings → allow record access.");
          } else {
            setRecordError("Failed to fetch shielded records.");
          }
          setPrivateBalance(null);
        }
      }

      // 2. Public credits balance
      let publicFound = false;
      for (const base of apiBases) {
        try {
          const res = await fetch(`${base}/program/credits.aleo/mapping/account/${address}`);
          if (res.ok) {
            const raw = await res.json();
            if (raw !== null) {
              setPublicBalance(parseInt(String(raw).replace("u64", "").replace(/_/g, "")) / 1_000_000);
              publicFound = true;
              break;
            }
          } else if (res.status === 404) {
            setPublicBalance(0);
            publicFound = true;
            break;
          }
        } catch {}
      }
      if (!publicFound) setPublicBalance(0);

      // 3. Public USDCx balance
      let usdcxFound = false;
      for (const base of apiBases) {
        try {
          const res = await fetch(`${base}/program/${USDCX_PROGRAM_ID}/mapping/balances/${address}`);
          if (res.ok) {
            const raw = await res.json();
            if (raw !== null) {
              setUsdcxPublicBalance(parseInt(String(raw).replace("u128", "").replace(/_/g, "")) / 1_000_000);
              usdcxFound = true;
              break;
            }
          } else if (res.status === 404) {
            setUsdcxPublicBalance(0);
            usdcxFound = true;
            break;
          }
        } catch {}
      }
      if (!usdcxFound) setUsdcxPublicBalance(0);
    } catch (err) {
      console.error("Balance refresh error:", err);
    }
  }, [address, requestRecords]);

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    // On-chain actions
    createInvoice,
    payInvoice,
    settleInvoice,
    makePayment,
    convertPublicToPrivate,
    // Balance
    refreshBalances,
    publicBalance,
    privateBalance,
    usdcxPublicBalance,
    usdcxPrivateBalance,
    recordError,
    pendingShieldAmount,
    setPendingShieldAmount,
    pendingUsdcxAmount,
    setPendingUsdcxAmount,
    // TX state
    status,
    txId,
    error,
    reset,
    // Utilities
    generateSalt,
    generatePaymentSecret,
    transactionStatus,
  };
}
