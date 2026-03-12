import { useState, useEffect, useRef } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useStealthPay } from "../../hooks/useStealthPay";
import { toMicrocredits, getExplorerTxUrl } from "../../services/stealthpay";
import { api } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { USDCxInfo } from "../components/USDCxInfo";
import { EXPLORER_BASES, PROGRAM_ID } from "../../utils/aleo-utils";
import { QRCodeSVG } from "qrcode.react";

// Poll every 5 s for up to 5 minutes (60 polls)
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 60;

// Confirmation states:
//   "pending"    — submitted, awaiting finalize
//   "confirmed"  — on-chain salt_to_invoice mapping found ✓
//   "rejected"   — wallet/chain explicitly returned Failed/Rejected
//   "timeout"    — polling expired without a definitive answer
//   "no_response"— wallet threw "No response"; tx may or may not have landed
type ConfirmState = "pending" | "confirmed" | "rejected" | "timeout" | "no_response";

export default function CreateInvoice() {
  const { address } = useWallet();
  const { createInvoice, status, error, reset, generateSalt, transactionStatus } = useStealthPay();

  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [isMultiPay, setIsMultiPay] = useState(false);
  const [tokenType, setTokenType] = useState(0);
  const [copied, setCopied] = useState(false);

  // Program deployment check — run once on mount
  const [programStatus, setProgramStatus] = useState<"checking" | "ok" | "not_found" | "unknown">("checking");

  useEffect(() => {
    let cancelled = false;
    const checkProgram = async () => {
      for (const base of EXPLORER_BASES) {
        try {
          const res = await fetch(`${base}/program/${PROGRAM_ID}`, { signal: AbortSignal.timeout(6_000) });
          if (cancelled) return;
          if (res.ok) { setProgramStatus("ok"); return; }
          if (res.status === 404) { setProgramStatus("not_found"); return; }
        } catch { /* try next base */ }
      }
      if (!cancelled) setProgramStatus("unknown");
    };
    checkProgram();
    return () => { cancelled = true; };
  }, []);

  const [invoiceResult, setInvoiceResult] = useState<{
    paymentUrl: string;
    salt: string;
    amount: number;
    isMultiPay: boolean;
    tokenType: number;
    txId: string;             // "" when wallet returned "No response"
    noResponse: boolean;      // true when wallet timed out
  } | null>(null);

  const [confirmStatus, setConfirmStatus] = useState<ConfirmState>("pending");

  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (pollTimer.current) clearTimeout(pollTimer.current); }, []);

  /**
   * Poll for on-chain confirmation using two strategies:
   *   1. Primary: salt_to_invoice mapping (works even without a tx ID)
   *   2. Fallback: wallet transactionStatus (only when we have a temp ID)
   */
  const pollForConfirmation = (salt: string, walletTxId: string) => {
    pollCount.current = 0;

    const check = async () => {
      pollCount.current++;

      // ── Strategy 1: salt_to_invoice on-chain mapping ──────────────────────
      // This works regardless of whether we have a tx ID.  Once the finalize
      // runs, the mapping entry appears and we can declare confirmed.
      for (const base of EXPLORER_BASES) {
        try {
          const res = await fetch(
            `${base}/program/${PROGRAM_ID}/mapping/salt_to_invoice/${salt}`,
            { signal: AbortSignal.timeout(5_000) }
          );
          if (res.ok) {
            const val = await res.json();
            if (val !== null && val !== undefined && String(val) !== "null") {
              setConfirmStatus("confirmed");
              return;
            }
          }
        } catch { /* try next base */ }
      }

      // ── Strategy 2: wallet adapter status (only when we have a temp ID) ──
      // Skip entirely if walletTxId is empty (no-response case) or already
      // a real Aleo tx ID (at1…) since those don't need status polling.
      if (transactionStatus && walletTxId && !walletTxId.startsWith("at1")) {
        try {
          const res = await transactionStatus(walletTxId);
          if (res?.transactionId?.startsWith("at1")) {
            // Got the canonical Aleo tx ID — confirmed (mapping may just lag)
            setConfirmStatus("confirmed");
            if (res.transactionId) {
              setInvoiceResult((prev) =>
                prev ? { ...prev, txId: res.transactionId! } : prev
              );
            }
            return;
          }
          if (res?.status === "Completed") {
            setConfirmStatus("confirmed");
            return;
          }
          if (res?.status === "Failed" || res?.status === "Rejected") {
            // Only treat as hard rejection if we got the tx ID from the wallet
            // (i.e., the wallet knows about the tx and says it failed).
            setConfirmStatus("rejected");
            return;
          }
        } catch { /* ignore transient poll errors */ }
      }

      // ── Polling limit reached ─────────────────────────────────────────────
      if (pollCount.current >= MAX_POLLS) {
        // Timed out — we couldn't definitively confirm OR reject.
        // Show a neutral "timeout" state so the user can check the explorer.
        setConfirmStatus(walletTxId ? "timeout" : "no_response");
        return;
      }

      pollTimer.current = setTimeout(check, POLL_INTERVAL_MS);
    };

    // First check after 5 s (give the network time to include the tx)
    pollTimer.current = setTimeout(check, POLL_INTERVAL_MS);
  };

  const handleCreate = async () => {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) return;

    reset();
    setInvoiceResult(null);
    setConfirmStatus("pending");
    setCopied(false);
    if (pollTimer.current) clearTimeout(pollTimer.current);

    const salt = generateSalt();
    const amountMicrocredits = toMicrocredits(amountNum);
    const invoiceType = isMultiPay ? 1 : 0;

    const result = await createInvoice({
      merchant: address!,
      amountMicrocredits,
      salt,
      memo: memo || undefined,
      expiryHours: 0,   // 0 = no expiry
      invoiceType,
      tokenType,
    });

    if (result?.paymentUrl) {
      const isNoResponse = (result as { noResponse?: boolean }).noResponse === true;

      // Show the result immediately — link is locally derived
      setInvoiceResult({
        paymentUrl: result.paymentUrl,
        salt,
        amount: amountNum,
        isMultiPay,
        tokenType,
        txId: result.transactionId || "",
        noResponse: isNoResponse,
      });

      // Update the confirmation badge label
      if (isNoResponse) setConfirmStatus("no_response");

      // Sync to backend in the background (non-blocking)
      api.createInvoice({
        invoice_hash: result.transactionId || salt, // Use salt as fallback key when no tx ID
        merchant_address: address!,
        amount: amountNum,
        memo: memo || undefined,
        status: "PENDING",
        invoice_transaction_id: result.transactionId || undefined,
        salt,
        invoice_type: invoiceType,
        token_type: tokenType,
      }).catch((err) => console.warn("Backend sync (non-fatal):", err));

      // Poll on-chain in background to update the status badge
      pollForConfirmation(salt, result.transactionId || "");
    }
  };

  const copyLink = () => {
    if (!invoiceResult?.paymentUrl) return;
    navigator.clipboard.writeText(invoiceResult.paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = invoiceResult?.txId?.startsWith("at1")
    ? getExplorerTxUrl(invoiceResult.txId)
    : null;

  // ── Status badge configuration ────────────────────────────────────────────
  const statusBadge = () => {
    switch (confirmStatus) {
      case "confirmed":
        return {
          cls: "bg-green-500/5 border-green-500/15 text-green-400",
          dot: "bg-green-500",
          spin: false,
          text: "Invoice confirmed on Aleo — link is live",
        };
      case "rejected":
        return {
          cls: "bg-red-500/5 border-red-500/15 text-red-400",
          dot: "bg-red-500",
          spin: false,
          text: "Transaction rejected on-chain — do not share this link",
        };
      case "timeout":
        return {
          cls: "bg-amber-500/5 border-amber-500/15 text-amber-400",
          dot: "bg-amber-500",
          spin: false,
          text: "Could not confirm on-chain. Share the link only after verifying on the explorer.",
        };
      case "no_response":
        return {
          cls: "bg-amber-500/5 border-amber-500/15 text-amber-400",
          dot: null,
          spin: true,
          text: "Wallet timed out — transaction may still be finalizing. Polling on-chain…",
        };
      default: // "pending"
        return {
          cls: "bg-white/[0.02] border-white/[0.06] text-slate-11",
          dot: null,
          spin: true,
          text: "Finalizing on Aleo (~10–30 s) — you can already copy and share the link",
        };
    }
  };

  const badge = statusBadge();

  return (
    <div className="relative max-w-3xl mx-auto py-12">
      <div className="space-y-12">

        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-6">
          <motion.h1
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-serif italic text-white tracking-tighter"
          >
            Create Invoice
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-11 text-lg max-w-xl"
          >
            Generate a private payment link to receive{" "}
            {tokenType === 1 ? "USDCx stablecoin" : "Aleo credits"} on-chain.
          </motion.p>
        </header>

        {/* Program deployment warning */}
        {programStatus === "not_found" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-5 rounded-2xl bg-red-500/5 border border-red-500/15 flex items-start gap-4"
          >
            <span className="mt-0.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-red-400">Program Not Deployed</p>
              <p className="text-xs text-slate-11 leading-relaxed">
                <code className="text-white/60">{PROGRAM_ID}</code> was not found on the Aleo testnet.
                Transactions will be rejected until the contract is deployed.
                Contact the admin to deploy or check the explorer.
              </p>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-6 md:p-10">
            <AnimatePresence mode="wait">

              {/* No wallet */}
              {!address ? (
                <motion.div key="no-wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center p-12 space-y-4 text-center"
                >
                  <p className="text-slate-11">Connect your wallet to generate invoices</p>
                  <p className="text-xs text-slate-5 uppercase tracking-widest font-bold">Identity required</p>
                </motion.div>

              /* Result */
              ) : invoiceResult ? (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }} className="space-y-6"
                >
                  {/* Confirmation status badge */}
                  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium ${badge.cls}`}>
                    {badge.spin ? (
                      <span className="w-3 h-3 rounded-full border border-white/20 border-t-white/60 animate-spin shrink-0" />
                    ) : badge.dot ? (
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} shrink-0`} />
                    ) : null}
                    {badge.text}
                  </div>

                  {/* QR Code Section */}
                  {confirmStatus !== "rejected" && (
                    <div className="flex flex-col items-center justify-center p-8 bg-white/[0.03] border border-white/5 rounded-3xl space-y-6">
                      <div className="p-4 bg-white rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                        <QRCodeSVG
                          value={invoiceResult.paymentUrl}
                          size={180}
                          level="H"
                          includeMargin={false}
                          imageSettings={{
                            src: "/aleo.svg",
                            x: undefined,
                            y: undefined,
                            height: 24,
                            width: 24,
                            excavate: true,
                          }}
                        />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-white uppercase tracking-widest">Scan to Pay</p>
                        <p className="text-[10px] text-slate-11">Share this QR code with the payer</p>
                      </div>
                    </div>
                  )}

                  {/* Payment link — always visible; hide only on hard rejection */}
                  {confirmStatus !== "rejected" && (
                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-5 font-bold uppercase tracking-[0.2em]">Payment Link</span>
                        <p className="text-sm font-mono text-white break-all leading-relaxed">{invoiceResult.paymentUrl}</p>
                      </div>
                      <Button variant="secondary" onClick={copyLink} className="w-full text-xs uppercase tracking-widest">
                        {copied ? "Copied ✓" : "Copy Link"}
                      </Button>
                    </div>
                  )}

                  {/* Explorer link once we have an at1… ID */}
                  {explorerUrl && (
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="ghost" className="w-full text-[10px] uppercase tracking-widest border border-white/10">
                        View on Aleo Explorer →
                      </Button>
                    </a>
                  )}

                  {/* "No tx ID" fallback explorer suggestion */}
                  {!invoiceResult.txId && (confirmStatus === "no_response" || confirmStatus === "timeout") && (
                    <a
                      href={`https://testnet.explorer.provable.com/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="ghost" className="w-full text-[10px] uppercase tracking-widest border border-white/10">
                        Check My Transactions on Explorer →
                      </Button>
                    </a>
                  )}

                  {/* Multi-pay salt */}
                  {invoiceResult.isMultiPay && (
                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">Save Your Salt</div>
                      <p className="text-xs text-slate-11">
                        Multi-pay invoices need the salt to settle. Keep it safe.
                      </p>
                      <div className="flex gap-2">
                        <code className="flex-1 p-2 bg-black/40 rounded border border-white/5 text-[10px] text-white/60 font-mono break-all">
                          {invoiceResult.salt}
                        </code>
                        <Button variant="ghost" size="sm"
                          onClick={() => navigator.clipboard.writeText(invoiceResult.salt)}
                          className="text-[10px] uppercase font-bold shrink-0"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button variant="outline" className="w-full uppercase tracking-widest text-xs"
                    onClick={() => {
                      setInvoiceResult(null);
                      setAmount("");
                      setMemo("");
                      setConfirmStatus("pending");
                      if (pollTimer.current) clearTimeout(pollTimer.current);
                      reset();
                    }}
                  >
                    Create Another Invoice
                  </Button>
                </motion.div>

              /* Form */
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    {/* Token toggle */}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 0, label: "Aleo", sub: "Credits" },
                        { id: 1, label: "USDCx", sub: "Stablecoin" },
                      ].map(({ id, label, sub }) => (
                        <button key={id} type="button" onClick={() => setTokenType(id)}
                          className={`p-4 rounded-2xl border transition-all text-center ${
                            tokenType === id
                              ? id === 1
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                : "bg-white/10 border-white/20 text-white"
                              : "bg-white/[0.02] border-white/5 text-slate-500"
                          }`}
                        >
                          <span className="block text-xs font-bold uppercase tracking-widest mb-1">{label}</span>
                          <span className="text-sm">{sub}</span>
                        </button>
                      ))}
                    </div>

                    <Input
                      label={`Amount (${tokenType === 1 ? "USDCx" : "credits"})`}
                      type="number" placeholder="0.00" value={amount}
                      onChange={(e) => setAmount(e.target.value)} min="0" step="0.000001"
                    />
                    <Input
                      label="Memo (optional)" placeholder="e.g. Services, Order #123"
                      value={memo} onChange={(e) => setMemo(e.target.value)}
                    />

                    <label className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-colors">
                      <div className="relative flex items-center pt-1">
                        <input type="checkbox" checked={isMultiPay} onChange={(e) => setIsMultiPay(e.target.checked)}
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 transition-all checked:bg-white"
                        />
                        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 peer-checked:opacity-100">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-white uppercase tracking-wider block">Multi-pay</span>
                        <span className="text-xs text-slate-11 block leading-relaxed">
                          Allows many senders to pay. Good for donations or subscriptions.
                        </span>
                      </div>
                    </label>
                  </div>

                  {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

                  {/* Warn if program not found but still allow attempt */}
                  {programStatus === "not_found" && (
                    <p className="text-xs text-amber-400 font-medium">
                      ⚠️ Program not found on testnet. Transaction will likely be rejected.
                    </p>
                  )}

                  <Button className="w-full text-xs uppercase tracking-[0.2em] py-4"
                    onClick={handleCreate} disabled={status === "pending" || !amount}
                  >
                    {status === "pending" ? "Broadcasting…" : "Confirm & Create"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {tokenType === 1 && !invoiceResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12">
            <USDCxInfo />
          </motion.div>
        )}
      </div>
    </div>
  );
}
