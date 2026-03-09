import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import {
  buildPaymentUrl,
  generatePaymentSecret,
  generateSalt,
  toMicrocredits,
  type CreateInvoiceParams,
  type PayInvoiceParams,
  type SettleInvoiceParams,
} from "../services/stealthpay";

const PROGRAM_ID = "stealthpay.aleo";
const CREDITS_PROGRAM_ID = "credits.aleo";

export type TxStatus = "idle" | "pending" | "success" | "error";

export function useStealthPay() {
  const { address, executeTransaction, requestRecords, transactionStatus } = useWallet();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicBalance, setPublicBalance] = useState<number | null>(null);
  const [privateBalance, setPrivateBalance] = useState<number | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [pendingShieldAmount, setPendingShieldAmount] = useState<number>(0);
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
        } = params;

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: "create_invoice",
          inputs: [
            merchant,
            `${amountMicrocredits}u64`,
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
            salt
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
        } = params;

        const records = await requestRecords("credits.aleo", false);
        if (!records || !Array.isArray(records) || records.length === 0) {
          setError("No credits records found. Ensure you have a private balance.");
          setStatus("error");
          return null;
        }

        const record = records[0];
        const recordStr =
          typeof record === "string" ? record : JSON.stringify(record);

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: "pay_invoice",
          inputs: [
            recordStr,
            merchant,
            `${amountMicrocredits}u64`,
            salt,
            paymentSecret,
            message,
          ],
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

  /** Convert public credits to private records. Required before pay_invoice if wallet has no private balance. */
  const convertPublicToPrivate = useCallback(
    async (amountMicrocredits: number) => {
      if (!address || !executeTransaction) {
        setError("Wallet not connected");
        setStatus("error");
        return null;
      }

      setStatus("pending");
      setError(null);

      try {
        const result = await executeTransaction({
          program: CREDITS_PROGRAM_ID,
          function: "transfer_public_to_private",
          inputs: [address, `${amountMicrocredits}u64`],
          fee: 0.001,
          privateFee: false,
        });

        if (result?.transactionId) {
          setTxId(result.transactionId);
          setStatus("success");
          // Optimistic update
          setPendingShieldAmount((prev) => prev + amountMicrocredits / 1_000_000);
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
    async (merchant: string, amountCredits: number) => {
      if (!address || !executeTransaction || !requestRecords) {
        setError("Wallet not connected");
        setStatus("error");
        return null;
      }

      setStatus("pending");
      setError(null);

      try {
        const amountMicrocredits = toMicrocredits(amountCredits);
        const records = await requestRecords("credits.aleo", false);
        if (!records || !Array.isArray(records) || records.length === 0) {
          setError("No credits records found. Ensure you have a private balance.");
          setStatus("error");
          return null;
        }

        const record = records[0];
        const recordStr =
          typeof record === "string" ? record : JSON.stringify(record);

        const result = await executeTransaction({
          program: PROGRAM_ID,
          function: "make_payment",
          inputs: [recordStr, `${amountMicrocredits}u64`, merchant],
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

          if (records.length > 0 || !recordError) {
            console.log("Parsing private records...");
            const totalMicroRaw = records.reduce((sum: number, rec: any) => {
              try {
                let micro = 0;
                if (rec && typeof rec.microcredits === 'number') {
                  micro = rec.microcredits;
                } else if (rec && typeof rec.microcredits === 'string') {
                  micro = parseInt(rec.microcredits.replace("u64", ""));
                } else if (rec && rec.data && rec.data.microcredits) {
                   const val = rec.data.microcredits;
                   micro = typeof val === 'number' ? val : parseInt(val.toString().replace("u64", ""));
                } else {
                  const content = typeof rec === 'string' ? rec : JSON.stringify(rec);
                  const match = content.match(/microcredits:\s*(\d+)u64/) || content.match(/"microcredits":\s*"(\d+)u64"/);
                  micro = match ? parseInt(match[1]) : 0;
                }
                return sum + (isNaN(micro) ? 0 : micro);
              } catch (err) {
                console.error("Record parse error:", err, rec);
                return sum;
              }
            }, 0);
            console.log("Computed Private Balance:", totalMicroRaw / 1_000_000);
            setPrivateBalance(totalMicroRaw / 1_000_000);
            setRecordError(null);
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
          }
        } catch (e) {
          console.warn(`Fetch from ${base} failed:`, e);
        }
      }

      if (!publicBalanceFound) {
        setPublicBalance(0);
      }
    } catch (err) {
      console.error("Critical balance refresh error:", err);
    }
  }, [address, requestRecords, recordError]);

  return {
    createInvoice,
    payInvoice,
    settleInvoice,
    makePayment,
    convertPublicToPrivate,
    refreshBalances,
    publicBalance,
    privateBalance,
    recordError,
    pendingShieldAmount,
    setPendingShieldAmount,
    status,
    txId,
    error,
    reset,
    generateSalt,
    generatePaymentSecret,
    transactionStatus,
  };
}
