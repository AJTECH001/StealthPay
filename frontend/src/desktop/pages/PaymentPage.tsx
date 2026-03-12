import { useState, useEffect, useRef } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { Link, useSearchParams } from "react-router-dom";
import { useStealthPay } from "../../hooks/useStealthPay";
import { toMicrocredits, getExplorerTxUrl, getExplorerAddressUrl } from "../../services/stealthpay";
import { api } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { EXPLORER_BASES, PROGRAM_ID } from "../../utils/aleo-utils";

function VerificationBlock({
  txId,
  title,
  description,
  payerAddress,
}: {
  txId: string;
  title: string;
  description?: string;
  payerAddress?: string;
}) {
  const [copied, setCopied] = useState(false);
  const isFinalized = txId.startsWith("at1");
  const explorerUrl = isFinalized ? getExplorerTxUrl(txId) : null;
  const addressUrl = payerAddress ? getExplorerAddressUrl(payerAddress) : null;

  const copyTxId = () => {
    navigator.clipboard.writeText(txId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold text-white tracking-tight">{title}</p>
        {!txId.startsWith("at1") && !txId.includes("Completed") ? (
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest animate-pulse">Finalizing on Aleo Ledger...</p>
        ) : description && (
          <p className="text-xs text-slate-11">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
        <code className={`text-[10px] font-mono break-all flex-1 ${txId.includes("Completed") ? "text-green-400" : "text-slate-5"}`}>
          {txId}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyTxId}
          className="h-7 text-[10px] uppercase font-bold"
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {isFinalized && explorerUrl ? (
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="secondary" className="w-full text-[10px] uppercase tracking-widest py-3">
            Explore On-Chain →
          </Button>
        </a>
      ) : addressUrl ? (
        <a href={addressUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="ghost" className="w-full text-[10px] uppercase tracking-widest py-3 border border-white/10">
            View My Transactions →
          </Button>
        </a>
      ) : null}
    </div>
  );
}

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const { address } = useWallet();
  const {
    payInvoice,
    convertPublicToPrivate,
    status,
    error,
    txId: hookTxId,
    reset,
    generatePaymentSecret,
    transactionStatus,
  } = useStealthPay();

  const merchant = searchParams.get("merchant");
  const amountStr = searchParams.get("amount");
  const salt = searchParams.get("salt");
  const token = searchParams.get("token");

  const hasParams = merchant && amountStr && salt;
  const tokenType = token === 'usdcx' ? 1 : 0;

  const amountCredits = hasParams ? parseFloat(amountStr) : 0;
  const amountMicrocredits = hasParams ? toMicrocredits(amountCredits) : 0;

  const paymentResultKey = hasParams && merchant && amountStr && salt
    ? `stealthpay-payment-${merchant}-${amountStr}-${salt}`
    : null;

  const [backendSyncStatus, setBackendSyncStatus] = useState<"idle" | "success" | "failed">("idle");

  // Program deployment check
  const [programDeployed, setProgramDeployed] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      for (const base of EXPLORER_BASES) {
        try {
          const res = await fetch(`${base}/program/${PROGRAM_ID}`, { signal: AbortSignal.timeout(6_000) });
          if (cancelled) return;
          if (res.ok) { setProgramDeployed(true); return; }
          if (res.status === 404) { setProgramDeployed(false); return; }
        } catch { /* try next */ }
      }
      if (!cancelled) setProgramDeployed(null); // unknown
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const [paymentResult, setPaymentResult] = useState<{
    transactionId: string;
  } | null>(() => {
    if (!paymentResultKey) return null;
    try {
      const stored = sessionStorage.getItem(paymentResultKey);
      return stored ? { transactionId: stored } : null;
    } catch {
      return null;
    }
  });

  const [isAlreadyPaid, setIsAlreadyPaid] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(true);

  // Check if invoice is already paid on mount
  useEffect(() => {
    if (!hasParams || !merchant || !salt) {
      setLoadingInvoice(false);
      return;
    }
    
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const invoice = await api.getInvoiceBySalt(salt, amountCredits);
        if (!cancelled) {
          if (invoice.status === "SETTLED") {
            setIsAlreadyPaid(true);
            if (invoice.payment_tx_ids && !paymentResult) {
              setPaymentResult({ transactionId: Array.isArray(invoice.payment_tx_ids) ? invoice.payment_tx_ids[0] : invoice.payment_tx_ids });
            }
          }
          setLoadingInvoice(false);
        }
      } catch (err) {
        if (!cancelled) setLoadingInvoice(false);
      }
    };
    
    checkStatus();
    return () => { cancelled = true; };
  }, [hasParams, merchant, salt, amountCredits, paymentResult]);
  const [convertResult, setConvertResult] = useState<{
    transactionId: string;
  } | null>(null);

  useEffect(() => {
    if (paymentResult && paymentResultKey) {
      try {
        sessionStorage.setItem(paymentResultKey, paymentResult.transactionId);
      } catch {}
    }
  }, [paymentResult, paymentResultKey]);

  useEffect(() => {
    if (
      !paymentResult ||
      !hasParams ||
      !merchant ||
      !salt ||
      backendSyncStatus !== "idle" ||
      !address
    )
      return;
    let cancelled = false;
    (async () => {
      try {
        // Same race-condition guard as handlePay: create the invoice entry if it
        // isn't in the DB yet (merchant's async backend sync may lag behind).
        let invoiceHash: string;
        try {
          const invoice = await api.getInvoiceBySalt(salt, amountCredits);
          invoiceHash = invoice.invoice_hash;
        } catch {
          const created = await api.createInvoice({
            invoice_hash: salt,
            merchant_address: merchant,
            amount: amountCredits,
            status: "PENDING",
            salt,
            token_type: tokenType,
          });
          invoiceHash = created.invoice_hash;
        }

        await api.updateInvoice(invoiceHash, {
          status: "SETTLED",
          payment_tx_ids: paymentResult.transactionId,
          payer_address: address,
        });
        if (!cancelled) setBackendSyncStatus("success");
      } catch (err) {
        console.warn("Deferred backend sync failed (payment on-chain is unaffected):", err);
        if (!cancelled) setBackendSyncStatus("failed");
      }
    })();
    return () => { cancelled = true; };
  }, [paymentResult, hasParams, merchant, salt, amountCredits, address, backendSyncStatus, tokenType]);

  // Poll for final on-chain transaction hash if only a temporary ID is known
  useEffect(() => {
    // Poll while ID is temporary (Leo wallet: UUID with "-", Shield wallet: "shield_XXX")
    // Real on-chain Aleo tx IDs always start with "at1"
    if (!paymentResult?.transactionId || paymentResult.transactionId.startsWith("at1") || !address) return;

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      try {
        console.log("Polling for final tx hash for request:", paymentResult.transactionId);
        const res = await transactionStatus?.(paymentResult.transactionId);
        
        if (res && res.transactionId && res.transactionId !== paymentResult.transactionId && res.transactionId.startsWith("at1")) {
          console.log("Observed final tx hash:", res.transactionId);
          if (cancelled) return;

          setPaymentResult({ transactionId: res.transactionId });
          
          // Update backend again with final hash
          if (hasParams && merchant && salt) {
            try {
              const invoice = await api.getInvoiceBySalt(salt, amountCredits);
              await api.updateInvoice(invoice.invoice_hash, {
                payment_tx_ids: res.transactionId,
              });
            } catch (e) {
              console.warn("Failed to update backend with final hash:", e);
            }
          }
          return; // Stop polling
        }
        
        // Shield Wallet fallback: It returns status "Completed" but keeps the "shield_" ID
        if (res?.status === "Completed" && res?.transactionId?.startsWith("shield_")) {
          if (cancelled) return;
          setPaymentResult({ transactionId: "Completed - Confirmed by Shield Wallet" });
          return; // Stop polling
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
      
      if (!cancelled) {
        timer = setTimeout(poll, 3000);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentResult?.transactionId, address, merchant, salt, amountCredits, hasParams, transactionStatus]);

  const isWalletSyncing = error === "wallet_syncing";
  const needsPrivateConversion =
    !isWalletSyncing &&
    (error?.includes("No credits records") || error?.includes("No USDCx records"));
  const convertAmount = Math.max(amountCredits + 0.05, 0.25);

  // Auto-retry when wallet is still scanning private records.
  // getFirstRecord already retries 8× (up to 16 s) internally, but if all
  // attempts fail we show the wallet_syncing state and auto-retry every 5 s.
  const [syncRetryCountdown, setSyncRetryCountdown] = useState<number | null>(null);
  const syncRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isWalletSyncing) {
      setSyncRetryCountdown(null);
      if (syncRetryRef.current) clearTimeout(syncRetryRef.current);
      return;
    }

    // Tick countdown from 5 → 0, then auto-retry aggressively
    let seconds = 5;
    setSyncRetryCountdown(seconds);

    const tick = setInterval(() => {
      seconds -= 1;
      setSyncRetryCountdown(seconds);
      if (seconds <= 0) {
        clearInterval(tick);
        setSyncRetryCountdown(null);
        // Re-trigger payment — getFirstRecord will retry internally for 16 s
        handlePayRef.current?.();
      }
    }, 1000);

    return () => clearInterval(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWalletSyncing]);

  // Stable ref so the countdown effect can call handlePay without
  // recreating itself every render (avoids infinite loop).
  const handlePayRef = useRef<(() => void) | null>(null);

  const handleConvertToPrivate = async () => {
    reset();
    setConvertResult(null);
    const result = await convertPublicToPrivate(convertAmount);
    if (result?.transactionId) {
      setConvertResult({ transactionId: result.transactionId });
    }
  };

  const successRef = useRef<HTMLDivElement>(null);

  const handlePay = async () => {
    if (!hasParams || !merchant || !salt) return;
    if (status === "pending") return; // already in-flight

    reset();
    setPaymentResult(null);
    setBackendSyncStatus("idle");

    const paymentSecret = generatePaymentSecret();

    const result = await payInvoice({
      merchant,
      amountMicrocredits,
      salt,
      paymentSecret,
      tokenType,
    });

    const txId = result?.transactionId ?? (result as { id?: string })?.id ?? hookTxId;
    if (txId) {
      setPaymentResult({ transactionId: txId });
      try {
        // Try to look up the invoice the merchant created. If it isn't in the DB
        // yet (merchant's backend sync is async and may still be in-flight), we
        // create a minimal record so we can track the payment.
        let invoiceHash: string;
        try {
          const invoice = await api.getInvoiceBySalt(salt, amountCredits);
          invoiceHash = invoice.invoice_hash;
        } catch {
          // Invoice not in DB — create it now using salt as the primary key.
          // This ensures the payment is always tracked even when the merchant's
          // backend sync hasn't completed before the buyer pays.
          const created = await api.createInvoice({
            invoice_hash: salt,
            merchant_address: merchant!,
            amount: amountCredits,
            status: "PENDING",
            salt,
            token_type: tokenType,
          });
          invoiceHash = created.invoice_hash;
        }

        await api.updateInvoice(invoiceHash, {
          status: "SETTLED",
          payment_tx_ids: txId,
          payer_address: address!,
        });
        setBackendSyncStatus("success");
      } catch (err) {
        console.warn("Backend sync failed (payment still confirmed on-chain):", err);
        setBackendSyncStatus("failed");
      }
      requestAnimationFrame(() => {
        successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  // Keep ref in sync so the auto-retry effect can call it without closure issues
  useEffect(() => { handlePayRef.current = handlePay; });

  return (
    <div className="relative max-w-2xl mx-auto py-12">
      <div className="space-y-12">
        <header className="flex flex-col items-center text-center space-y-6">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-7xl font-serif italic text-white tracking-tighter"
          >
            Checkout
          </motion.h1>
          {hasParams && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-5">Private Payer Flow</span>
            </motion.div>
          )}
        </header>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-6 md:p-10">
            <AnimatePresence mode="wait">
              {loadingInvoice ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center justify-center space-y-4"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
                  <p className="text-slate-11 text-xs uppercase tracking-widest font-bold">Verifying Invoice...</p>
                </motion.div>
              ) : isAlreadyPaid ? (
                <motion.div 
                  key="already-paid"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="p-8 rounded-3xl bg-blue-500/[0.03] border border-blue-500/10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mx-auto mb-2">
                       <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Invoice Settled</h2>
                    <p className="text-sm text-slate-11">This invoice has already been paid and verified on the Aleo ledger.</p>
                  </div>
                  
                  {paymentResult && (
                    <VerificationBlock
                      txId={paymentResult.transactionId}
                      title="Payment Record"
                      description="On-chain receipt for this invoice."
                      payerAddress={address ?? undefined}
                    />
                  )}

                  <div className="pt-4">
                    <Link to="/explorer" className="w-full">
                      <Button variant="ghost" className="w-full text-xs uppercase tracking-widest">Return to Dashboard</Button>
                    </Link>
                  </div>
                </motion.div>
              ) : !hasParams ? (
                <motion.div 
                  key="no-params"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-12 text-center space-y-4"
                >
                  <p className="text-slate-11">No active invoice found in the URL.</p>
                  <Link to="/explorer">
                    <Button variant="ghost" className="text-xs uppercase tracking-widest">Return to Dashboard</Button>
                  </Link>
                </motion.div>
              ) : !address ? (
                <motion.div 
                  key="no-wallet"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-12 flex flex-col items-center justify-center space-y-6"
                >
                  <p className="text-slate-11">Connect your wallet to proceed with payment</p>
                  <p className="text-[10px] text-slate-5 uppercase tracking-widest font-bold">Encrypted Session Required</p>
                </motion.div>
              ) : paymentResult ? (
                <motion.div 
                  key="success"
                  ref={successRef}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="p-8 rounded-3xl bg-green-500/[0.03] border border-green-500/10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 mx-auto mb-2">
                       <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Payment Broadcasted</h2>
                    <p className="text-sm text-slate-11">Your payment of <span className="text-white font-medium">{amountCredits} {tokenType === 1 ? 'USDCx' : 'credits'}</span> is being finalized on-chain.</p>
                  </div>

                  {backendSyncStatus === "success" && (
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-sm text-slate-11">Merchant system notified. Invoice settled.</p>
                    </div>
                  )}

                  <VerificationBlock
                    txId={paymentResult.transactionId}
                    title="Transaction Receipt"
                    description="This identifier proves your credits were transferred within the zero-knowledge circuit."
                    payerAddress={address ?? undefined}
                  />

                  <div className="pt-4 flex flex-col gap-4">
                    <Button variant="outline" className="w-full uppercase tracking-widest text-xs py-4" onClick={() => {
                        setPaymentResult(null);
                        reset();
                    }}>
                      Make Another Payment
                    </Button>
                    <Link to="/explorer" className="w-full">
                      <Button variant="ghost" className="w-full text-[10px] uppercase tracking-widest">Back to Dashboard</Button>
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="form"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="space-y-10"
                >
                  <div className="grid gap-6">
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-5 font-bold uppercase tracking-widest">Order Total</span>
                        <div className={`text-2xl md:text-3xl font-serif italic ${tokenType === 1 ? 'text-blue-400' : 'text-white'}`}>
                          {amountCredits} {tokenType === 1 ? 'USDCx' : 'Credits'}
                        </div>
                      </div>
                      <div className="text-left sm:text-right space-y-1">
                         <span className="text-[10px] text-slate-5 font-bold uppercase tracking-widest">Recipient</span>
                         <div className="text-[10px] font-mono text-slate-11 break-all">{merchant.slice(0, 12)}...{merchant.slice(-12)}</div>
                      </div>
                    </div>

                    {error && !isWalletSyncing && !needsPrivateConversion && (
                      <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <p className="text-xs text-red-400 font-medium">Error: {error}</p>
                      </div>
                    )}

                    {isWalletSyncing && (
                      <div className="p-5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border-2 border-amber-500/40 border-t-amber-500 animate-spin shrink-0" />
                            <p className="text-xs font-bold text-amber-400">
                              Waiting for wallet to index shielded record
                            </p>
                          </div>
                          {syncRetryCountdown !== null && (
                            <span className="text-[10px] font-mono tabular-nums text-slate-5">
                              Retrying in {syncRetryCountdown}s
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-11 leading-relaxed">
                          Your shielded balance exists on-chain but the wallet hasn't finished
                          scanning the block yet. <span className="text-white font-medium">Open Leo Wallet</span> to
                          speed up block scanning — payment will retry automatically.
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] uppercase tracking-widest border border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => handlePayRef.current?.()}
                            disabled={status === "pending"}
                          >
                            Retry Now
                          </Button>
                          <span className="text-[10px] text-slate-5">or wait — auto-retrying…</span>
                        </div>
                      </div>
                    )}

                    {needsPrivateConversion && (
                      <div className="p-6 rounded-3xl bg-amber-500/[0.03] border border-amber-500/10 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-amber-500/10 mt-1">
                             <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-white">Private {tokenType === 1 ? 'USDCx' : 'Balance'} Required</p>
                            <p className="text-xs text-slate-11">
                              {tokenType === 1 
                                ? "Shielded USDCx is required for payment. Please bridge or mint USDCx to your private balance."
                                : "Shielded transactions require pre-converted credits. Tap below to convert public funds."}
                            </p>
                          </div>
                        </div>

                        {convertResult ? (
                          <div className="pt-2">
                             <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl text-[10px] text-green-400 font-bold uppercase text-center tracking-widest">
                                Conversion Success. Ready to pay.
                             </div>
                          </div>
                        ) : (
                          <Button 
                            variant="secondary" 
                            className="w-full text-xs uppercase tracking-widest"
                            onClick={handleConvertToPrivate}
                            disabled={status === "pending"}
                          >
                             {status === "pending" ? "Converting..." : `Convert ${convertAmount} Credits`}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {programDeployed === false && (
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                      <p className="text-xs text-red-400 font-medium">
                        ⚠️ Smart contract not found on testnet. Payment will be rejected. Contact the merchant.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <Button
                      className="w-full py-5 text-xs uppercase tracking-[0.25em]"
                      onClick={handlePay}
                      disabled={status === "pending"}
                    >
                      {status === "pending" ? "Executing..." : "Confirm & Pay"}
                    </Button>
                    <p className="text-[10px] text-center text-slate-5 uppercase tracking-widest">Zero-Knowledge Proof will be generated locally</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

