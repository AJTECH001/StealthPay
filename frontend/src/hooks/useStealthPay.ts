import { useCallback, useState } from "react";
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
  const { address, executeTransaction, requestRecords } = useWallet();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return {
    createInvoice,
    payInvoice,
    settleInvoice,
    makePayment,
    convertPublicToPrivate,
    status,
    txId,
    error,
    reset,
    generateSalt,
    generatePaymentSecret,
  };
}
