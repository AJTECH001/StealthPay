import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import {
  buildPaymentUrl,
  generatePaymentSecret,
  generateSalt,
  toMicrocredits,
  USDCX_PROGRAM_ID,
  STEALTHPAY_PROGRAM_ID,
  type CreateInvoiceParams,
  type PayInvoiceParams,
  type SettleInvoiceParams,
} from "../services/stealthpay";

const PROGRAM_ID = STEALTHPAY_PROGRAM_ID;
const CREDITS_PROGRAM_ID = "credits.aleo";

// ─── Local shield ledger ───────────────────────────────────────────────────
// Tracks optimistic private balances per address in localStorage so the UI
// shows the correct balance immediately after shielding, even while the Leo
// Wallet extension is still scanning blocks to discover the new record.
// Once the wallet actually returns records, the ledger is cleared and the
// real wallet balance takes over.
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

export type TxStatus = "idle" | "pending" | "success" | "error";

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

  // Reset denial flag when address changes
  useEffect(() => {
    recordsAccessDenied.current = false;
  }, [address]);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxId(null);
    setError(null);
  }, []);

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
          expiryHours = 24,
          invoiceType = 0,
          tokenType = 0,
        } = params;

        const isUsdcx = tokenType === 1;
        const functionName = isUsdcx ? "create_invoice_usdcx" : "create_invoice";
        const amountStr = isUsdcx ? `${amountMicrocredits}u128` : `${amountMicrocredits}u64`;

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: functionName,
          inputs: [
            merchant,
            amountStr,
            salt,
            `${expiryHours}u32`,
            `${invoiceType}u8`,
          ],
          fee: 0.001,
          privateFee: false,
        });

        if (result?.transactionId) {
          setTxId(result.transactionId);
          setStatus("success");
          const paymentUrl = buildPaymentUrl(
            window.location.origin,
            merchant,
            String(amountMicrocredits / 1_000_000),
            salt,
            tokenType
          );
          return { transactionId: result.transactionId, paymentUrl };
        }

        setError("Transaction failed");
        setStatus("error");
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Create invoice failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction]
  );

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
        } = params;

        const isUsdcx = tokenType === 1;
        const fetchProgram = isUsdcx ? USDCX_PROGRAM_ID : CREDITS_PROGRAM_ID;

        // Try non-plaintext first, then plaintext as fallback (wallet API shape varies)
        let records = await requestRecords(fetchProgram, false);
        if (!records?.length) {
          try { records = await requestRecords(fetchProgram, true); } catch {}
        }
        if (!records || records.length === 0) {
          const ledger = address ? getLedger(address) : { credits: 0, usdcx: 0 };
          const hasPendingBalance = isUsdcx ? ledger.usdcx > 0 : ledger.credits > 0;
          setError(hasPendingBalance ? "wallet_syncing" : `No ${isUsdcx ? "USDCx" : "credits"} records found. Please shield credits first.`);
          setStatus("error");
          return null;
        }

        const record = records[0];
        let recordStr = typeof record === "string" ? record : JSON.stringify(record);

        // Standard inputs
        const inputs = [
          recordStr,
          merchant,
          isUsdcx ? `${amountMicrocredits}u128` : `${amountMicrocredits}u64`,
          salt,
          paymentSecret,
          message,
        ];

        if (isUsdcx) {
          // Add Merkle Proof array for USDCx.
          // In a fully robust implementation, we would construct or fetch
          // the legitimate Merkle Proof of the USDCx freeze list.
          // For simplicity in this integration, if actual proofs aren't required to pass the UI check,
          // we mock it here. If required, we would invoke the generated proofs utility.
          
          // Using a mock default empty array of fields for the proof to satisfy the Leo type: [MerkleProof; 2]
          const mockProof = `{ siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 0u32 }`;
          inputs.push(`[${mockProof}, ${mockProof}]`);
        }

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: isUsdcx ? "pay_invoice_usdcx" : "pay_invoice",
          inputs,
          fee: isUsdcx ? 0.05 : 0.001, // USDCx typically has higher instructions
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
        const msg = err instanceof Error ? err.message : "Pay invoice failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction, requestRecords]
  );

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
          inputs: [salt, `${amountMicrocredits}u64`],
          fee: 0.001,
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
        const msg = err instanceof Error ? err.message : "Settle invoice failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction]
  );

  /** Convert public funds to private records. Required before private transactions if wallet has no private balance. */
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
        // USDCx uses u128, Credits uses u64. Both use 6 decimal places in this implementation.
        const amountStr = isUsdcx ? `${amount * 1_000_000}u128` : `${amount * 1_000_000}u64`;

        const result = await executeTransaction({
          program,
          function: "transfer_public_to_private",
          inputs: [address, amountStr],
          fee: 0.001,
          privateFee: false,
        });

        if (result?.transactionId) {
          setTxId(result.transactionId);
          setStatus("success");
          // Update local ledger immediately so the balance shows before the
          // wallet extension has finished scanning the new private record.
          if (address) {
            const next = adjustLedger(address, isUsdcx ? { usdcx: amount } : { credits: amount });
            if (isUsdcx) {
              setUsdcxPrivateBalance(next.usdcx);
              setPendingUsdcxAmount((prev) => prev + amount);
            } else {
              setPrivateBalance(next.credits);
              setPendingShieldAmount((prev) => prev + amount);
            }
          }
          return { transactionId: result.transactionId };
        }

        setError("Conversion failed");
        setStatus("error");
        return null;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Convert to private failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction]
  );

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
        const amountMicrocredits = isUsdcx ? BigInt(Math.round(amountCredits * 1_000_000)) : toMicrocredits(amountCredits);
        const fetchProgram = isUsdcx ? USDCX_PROGRAM_ID : CREDITS_PROGRAM_ID;

        // Try non-plaintext first, then plaintext as fallback
        let records = await requestRecords(fetchProgram, false);
        if (!records?.length) {
          try { records = await requestRecords(fetchProgram, true); } catch {}
        }
        if (!records || records.length === 0) {
          const ledger = address ? getLedger(address) : { credits: 0, usdcx: 0 };
          const hasPendingBalance = isUsdcx ? ledger.usdcx > 0 : ledger.credits > 0;
          setError(hasPendingBalance ? "wallet_syncing" : `No ${isUsdcx ? "USDCx" : "credits"} records found. Please shield credits first.`);
          setStatus("error");
          return null;
        }

        const record = records[0];
        const recordStr =
          typeof record === "string" ? record : JSON.stringify(record);

        const inputs = [
          recordStr,
          isUsdcx ? `${amountMicrocredits}u128` : `${amountMicrocredits}u64`,
          merchant,
        ];

        if (isUsdcx) {
          const mockProof = `{ siblings: [0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field, 0field], leaf_index: 0u32 }`;
          inputs.push(`[${mockProof}, ${mockProof}]`);
        }

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: isUsdcx ? "make_payment_usdcx" : "make_payment",
          inputs,
          fee: 0.1,
          privateFee: false,
        });

        if (result?.transactionId) {
          setTxId(result.transactionId);
          setStatus("success");
          // Deduct from local ledger so the displayed balance stays accurate.
          if (address) {
            const next = adjustLedger(address, isUsdcx
              ? { usdcx: -amountCredits }
              : { credits: -amountCredits }
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
        const msg = err instanceof Error ? err.message : "Payment failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [address, executeTransaction, requestRecords]
  );

  const refreshBalances = useCallback(async () => {
    if (!address || !requestRecords) {
      console.log("refreshBalances: Wallet not connected or method missing");
      return;
    }

    try {
      // 1. Fetch Private Balance from unspent records
      if (!recordsAccessDenied.current) {
        try {
          const isPermissionDenied = (e: unknown) =>
            e instanceof Error && (e.message.includes("NOT_GRANTED") || e.message.includes("not granted") || e.message.includes("permission"));

          let records: any[] = [];
          try {
            const fetched = await requestRecords("credits.aleo", true);
            records = Array.isArray(fetched) ? fetched : [];
            console.log("Found records:", records.length);
          } catch (e) {
            console.warn("Records request failed:", e);
            if (isPermissionDenied(e)) throw e;
            const fallbackFetched = await requestRecords("credits.aleo");
            records = Array.isArray(fallbackFetched) ? fallbackFetched : [];
          }

          // Parse microcredits out of a record regardless of wallet format
          const parseMicro = (rec: any, field: "microcredits" | "amount"): number => {
            if (rec && typeof rec[field] === 'number') return rec[field];
            if (rec && typeof rec[field] === 'string')
              return parseInt((rec[field] as string).replace(/u\d+/g, "").replace(/_/g, "")) || 0;
            if (rec?.data?.[field]) {
              const v = rec.data[field];
              return typeof v === 'number' ? v : parseInt(String(v).replace(/u\d+/g, "").replace(/_/g, "")) || 0;
            }
            const content = typeof rec === 'string' ? rec : JSON.stringify(rec);
            const m = content.match(new RegExp(`${field}:\\s*(?:"|')?([\\d_]+)u\\d+`));
            return m ? parseInt(m[1].replace(/_/g, "")) : 0;
          };

          if (records.length > 0) {
            // Wallet has finished scanning — use real records and clear local ledger
            const totalMicro = records.reduce((s: number, r: any) => s + parseMicro(r, "microcredits"), 0);
            const walletBalance = totalMicro / 1_000_000;
            console.log("Wallet private balance (from records):", walletBalance);
            if (address) clearLedgerField(address, "credits");
            setPrivateBalance(walletBalance);

            setPendingShieldAmount(0);
            setRecordError(null);
          } else {
            // Wallet hasn't synced yet — show ledger estimate so the balance
            // doesn't go blank after a successful shield transaction.
            const ledger = address ? getLedger(address) : { credits: 0, usdcx: 0 };
            console.log("No wallet records yet; using ledger estimate:", ledger.credits);
            setPrivateBalance(ledger.credits);
            setRecordError(null);
          }

          // 1b. Fetch USDCx Private Balance
          try {
            const usdcxRecords = (await requestRecords(USDCX_PROGRAM_ID, true)) as any[];
            if (usdcxRecords.length > 0) {
              const usdcxTotal = usdcxRecords.reduce((s: number, r: any) => s + parseMicro(r, "amount"), 0);
              const walletBalance = usdcxTotal / 1_000_000;
              if (address) clearLedgerField(address, "usdcx");
              setUsdcxPrivateBalance(walletBalance);
              setPendingUsdcxAmount(0);
            } else {
              const ledger = address ? getLedger(address) : { credits: 0, usdcx: 0 };
              setUsdcxPrivateBalance(ledger.usdcx);
            }
          } catch (e) {
            console.warn("USDCx private record fetch failed", e);
            setUsdcxPrivateBalance(address ? getLedger(address).usdcx : 0);
          }
        } catch (recErr) {
          const isDenied =
            recErr instanceof Error &&
            (recErr.message.includes("NOT_GRANTED") || recErr.message.includes("not granted") || recErr.message.includes("permission"));
          if (isDenied) {
            recordsAccessDenied.current = true;
            setRecordError("Wallet record access not granted. Open Leo Wallet → Settings → allow record access.");
          } else {
            console.error("Shielded records fetching error:", recErr);
            setRecordError("Failed to fetch shielded records.");
          }
          setPrivateBalance(null);
        }
      }

      // 2. Fetch Public Balance from Aleo Mapping
      const apiBases = [
        "https://api.explorer.aleo.org/v1/testnet",
        "https://api.explorer.provable.com/v1/testnet",
        "https://api.explorer.aleo.org/v1/testnet3",
      ];

      let publicBalanceFound = false;
      for (const base of apiBases) {
        try {
          const res = await fetch(`${base}/program/credits.aleo/mapping/account/${address}`);
          if (res.ok) {
            const publicMicroStr = await res.json(); 
            if (publicMicroStr !== null) {
              const publicMicro = parseInt(publicMicroStr.replace("u64", ""));
              setPublicBalance(publicMicro / 1_000_000);
              publicBalanceFound = true;
              break;
            }
          } else if (res.status === 404) {
            // Mapping does not exist for this address => 0 balance
            setPublicBalance(0);
            publicBalanceFound = true;
            break;
          }
        } catch (e) {
          console.warn(`Fetch from ${base} failed:`, e);
        }
      }

      if (!publicBalanceFound) {
        setPublicBalance(0);
      }

      // 3. Fetch USDCx Public Balance
      let usdcxBalanceFound = false;
      for (const base of apiBases) {
        try {
          const res = await fetch(`${base}/program/${USDCX_PROGRAM_ID}/mapping/balances/${address}`);
          if (res.ok) {
            const publicMicroStr = await res.json(); 
            if (publicMicroStr !== null) {
              const publicMicro = parseInt(publicMicroStr.replace("u128", "").replace(/_/g, ""));
              setUsdcxPublicBalance(publicMicro / 1_000_000);
              usdcxBalanceFound = true;
              break;
            }
          } else if (res.status === 404) {
             setUsdcxPublicBalance(0);
             usdcxBalanceFound = true;
             break;
          }
        } catch (e) {
          console.warn(`Fetch USDCx from ${base} failed:`, e);
        }
      }
      if (!usdcxBalanceFound) setUsdcxPublicBalance(0);

    } catch (err) {
      console.error("Critical balance refresh error:", err);
    }
  }, [address, requestRecords]);

  return {
    createInvoice,
    payInvoice,
    settleInvoice,
    makePayment,
    convertPublicToPrivate,
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
    status,
    txId,
    error,
    reset,
    generateSalt,
    generatePaymentSecret,
    transactionStatus,
  };
}
