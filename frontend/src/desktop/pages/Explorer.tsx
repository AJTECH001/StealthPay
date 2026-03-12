import { useState, useEffect, useRef } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Link } from "react-router-dom";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useStealthPay } from "../../hooks/useStealthPay";
import { api, type InvoiceStats, type Invoice } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { buildPaymentUrl } from "../../services/stealthpay";

export default function Explorer() {
  const { address } = useWallet();
  const { 
    makePayment, 
    status, 
    error, 
    reset, 
    refreshBalances, 
    publicBalance, 
    privateBalance,
    usdcxPublicBalance,
    usdcxPrivateBalance,
    recordError,
    pendingShieldAmount,
    setPendingShieldAmount,
    pendingUsdcxAmount,
    convertPublicToPrivate,
    transactionStatus
  } = useStealthPay();

  const [directMerchant, setDirectMerchant] = useState("");
  const [directAmount, setDirectAmount] = useState("");
  const [directResult, setDirectResult] = useState<string | null>(null);

  const [isShieldModalOpen, setIsShieldModalOpen] = useState(false);
  const [shieldingAmount, setShieldingAmount] = useState("");
  const [shieldingStatus, setShieldingStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const [shieldingTokenType, setShieldingTokenType] = useState(0); // 0 for Credits, 1 for USDCx
  const [directTokenType, setDirectTokenType] = useState(0); // 0 for Credits, 1 for USDCx

  const lastSettledCountRef = useRef<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrInvoice, setQrInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        let statsRes, invoicesRes: Invoice[];

        if (address) {
          const [stats, merchantInvoices, payerInvoices] = await Promise.all([
            api.getStats(),
            api.getInvoicesByMerchant(address),
            api.getInvoicesByPayer(address),
          ]);
          statsRes = stats;

          // Merge merchant + payer invoices, deduplicate, sort newest first
          const seen = new Set<string>();
          invoicesRes = [...merchantInvoices, ...payerInvoices]
            .filter(inv => {
              if (seen.has(inv.invoice_hash)) return false;
              seen.add(inv.invoice_hash);
              return true;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else {
          const [stats, recent] = await Promise.all([
            api.getStats(),
            api.getRecentInvoices(10),
          ]);
          statsRes = stats;
          invoicesRes = recent;
        }

        if (!cancelled) {
          // Check for new settlements using ref to avoid re-triggering the effect
          if (lastSettledCountRef.current !== null && statsRes.settled > lastSettledCountRef.current) {
            setNotification({
              message: `New Payment Received! (${statsRes.settled - lastSettledCountRef.current} new)`,
              type: "success"
            });
            setTimeout(() => setNotification(null), 5000);
          }
          lastSettledCountRef.current = statsRes.settled;

          setStats(statsRes);
          setRecentInvoices(invoicesRes);
          setApiError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    }

    fetchData();

    // Poll invoices/stats every 8 s for real-time updates
    const pollInterval = setInterval(fetchData, 8_000);

    if (address) {
      // Fetch balances immediately on mount / address change …
      refreshBalances();
      // … then every 30 s so the user always sees live balances
      const balanceInterval = setInterval(refreshBalances, 30_000);
      return () => {
        cancelled = true;
        clearInterval(pollInterval);
        clearInterval(balanceInterval);
      };
    }

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [address, refreshBalances]);

  // Poll for final tx hash for direct payments
  // Real Aleo tx IDs start with "at1". Leo wallet returns UUIDs (contain "-"),
  // Shield wallet returns temp IDs like "shield_XXXX_XXXX". Both need polling.
  useEffect(() => {
    if (!directResult || directResult.startsWith("at1") || !address) return;

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await transactionStatus?.(directResult);
        if (res && res.transactionId && res.transactionId !== directResult && res.transactionId.startsWith("at1")) {
          if (cancelled) return;
          setDirectResult(res.transactionId);
          return;
        }

        // Shield Wallet fallback: It returns status "Completed" but keeps the "shield_" ID
        if (res?.status === "Completed" && res?.transactionId?.startsWith("shield_")) {
          if (cancelled) return;
          setDirectResult("Completed - Confirmed by Shield Wallet");
          return;
        }
      } catch {}
      if (!cancelled) timer = setTimeout(poll, 3000);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [directResult, address, transactionStatus]);

  const handleDirectPay = async (tokenType = 0) => {
    const amountNum = parseFloat(directAmount);
    if (!directMerchant || !directAmount || isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    reset();
    setDirectResult(null);

    const result = await makePayment(directMerchant.trim(), amountNum, tokenType);

    if (result?.transactionId) {
      setDirectResult(result.transactionId);
      try {
        const [statsRes, merchantInvoices, payerInvoices] = await Promise.all([
          api.getStats(),
          api.getInvoicesByMerchant(directMerchant.trim()),
          api.getInvoicesByPayer(address!),
        ]);
        const seen = new Set<string>();
        const combined = [...merchantInvoices, ...payerInvoices]
          .filter(inv => { if (seen.has(inv.invoice_hash)) return false; seen.add(inv.invoice_hash); return true; })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setStats(statsRes);
        setRecentInvoices(combined);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto py-12">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            className="fixed top-8 left-1/2 z-[200] px-6 py-3 rounded-full bg-green-500/90 text-white font-bold text-sm shadow-[0_0_20px_rgba(34,197,94,0.3)] backdrop-blur-md flex items-center gap-3 border border-green-400/50"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-12">
        <header className="flex flex-col items-center text-center space-y-6">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-serif italic text-white tracking-tighter"
          >
            Dashboard
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-11 text-lg max-w-xl"
          >
            Manage your private invoices and track recent network activity. 
            All data is encrypted and selectively disclosable.
          </motion.p>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4"
          >
            <Link to="/create">
              <Button className="uppercase tracking-widest text-xs px-8">Create invoice</Button>
            </Link>
            <Link to="/pay">
              <Button variant="secondary" className="uppercase tracking-widest text-xs px-8">Pay invoice</Button>
            </Link>
          </motion.div>
        </header>

        {/* Portfolio Section */}
        {address && (
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Your Portfolio</h2>
                <p className="text-xs text-slate-11">Real-time balance across public and shielded states.</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshBalances}
                className="text-[10px] uppercase tracking-widest h-8 border border-white/5 bg-white/[0.02] hover:bg-white/10"
              >
              Refresh Balances
              </Button>
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {/* Shielded Credits */}
              <GlassCard className="p-6 md:p-8 flex flex-col justify-between group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-5 text-nowrap">Shielded Credits</span>
                  </div>
                  <div className="text-4xl font-serif italic text-white flex items-baseline gap-2 flex-wrap">
                    {(privateBalance ?? 0) > 0
                      ? (privateBalance as number).toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : pendingShieldAmount > 0
                        ? <span className="text-white/30">0.00</span>
                        : "0.00"}
                    <span className="text-sm font-sans not-italic text-slate-11 uppercase tracking-widest font-medium">Credits</span>
                  </div>
                  {pendingShieldAmount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
                      title="Shielded credits are on-chain but your wallet is still scanning the block. They will be spendable once the wallet finishes syncing (~1-2 min)."
                    >
                      <div className="w-2 h-2 rounded-full border border-amber-500/50 border-t-amber-500 animate-spin shrink-0" />
                      <span className="text-[9px] font-bold text-amber-400">
                        +{pendingShieldAmount.toFixed(2)} scanning — not yet spendable
                      </span>
                    </motion.div>
                  )}
                  {recordError ? (
                    <p className="text-[9px] text-amber-400/80 max-w-[220px] leading-tight">{recordError}</p>
                  ) : (privateBalance ?? 0) > 0 ? (
                    <p className="text-[10px] text-slate-11">Ready to spend.</p>
                  ) : pendingShieldAmount > 0 ? (
                    <p className="text-[9px] text-slate-11 leading-tight">
                      Open Leo Wallet to speed up block scanning.
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-11">Private spending records.</p>
                  )}
                </div>
              </GlassCard>

              {/* Public Credits */}
              <GlassCard className="p-6 md:p-8 flex flex-col justify-between group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                  </svg>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-5 text-nowrap">Public Balance</span>
                  </div>
                  <div className="text-4xl font-serif italic text-white/60 flex items-baseline gap-2">
                    {publicBalance !== null
                      ? publicBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : <span className="text-white/20 text-2xl animate-pulse">loading…</span>}
                    <span className="text-sm font-sans not-italic text-slate-11 uppercase tracking-widest font-medium">Credits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-11 whitespace-nowrap">Visible on ledger.</p>
                    {(publicBalance || 0) > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShieldingAmount(Math.min(30, publicBalance || 0).toString());
                          setShieldingTokenType(0);
                          setIsShieldModalOpen(true);
                        }}
                        className="text-[9px] uppercase tracking-widest h-6 border border-white/10 hover:bg-white/5 px-2"
                      >
                        Shield →
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 md:p-8 flex flex-col justify-between group overflow-hidden relative border-blue-500/5 bg-blue-500/[0.01]">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-5 text-nowrap">USDCx Public</span>
                  </div>
                  <div className="text-4xl font-serif italic text-blue-400/80 flex items-baseline gap-2">
                    {usdcxPublicBalance !== null ? usdcxPublicBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                    <span className="text-sm font-sans not-italic text-slate-11 uppercase tracking-widest font-medium">USDCx</span>
                  </div>
                 <div className="flex items-center gap-4">
                  {(usdcxPublicBalance || 0) > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setShieldingAmount(Math.min(100, usdcxPublicBalance || 0).toString());
                        setShieldingTokenType(1);
                        setIsShieldModalOpen(true);
                      }}
                      className="text-[9px] uppercase tracking-widest h-6 border border-blue-500/20 hover:bg-blue-500/5 text-blue-400 px-2"
                    >
                      Shield →
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 md:p-8 flex flex-col justify-between group overflow-hidden relative border-blue-500/10 bg-blue-500/[0.02]">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-5 text-nowrap">USDCx Private</span>
                  </div>
                  <div className="text-4xl font-serif italic text-blue-500 flex items-baseline gap-2">
                    {usdcxPrivateBalance !== null ? usdcxPrivateBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                    <span className="text-sm font-sans not-italic text-slate-11 uppercase tracking-widest font-medium">USDCx</span>
                    {pendingUsdcxAmount > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[9px] font-sans not-italic bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full"
                      >
                        +{pendingUsdcxAmount.toFixed(2)}
                      </motion.div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-11">Private stablecoin records.</p>
                </div>
              </GlassCard>
            </div>
          </motion.section>
        )}

        {/* Shielding Modal */}
        <AnimatePresence>
          {isShieldModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsShieldModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md overflow-hidden"
              >
                <GlassCard className="p-8 space-y-8 border-white/10 shadow-2xl">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Shield {shieldingTokenType === 1 ? 'USDCx' : 'Credits'}</h2>
                    <p className="text-slate-11 text-sm">Convert public {shieldingTokenType === 1 ? 'USDCx' : 'credits'} into private records for stealth spending.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-slate-5">
                        <span>Amount to Shield</span>
                        <span>Available: {(shieldingTokenType === 1 ? usdcxPublicBalance || 0 : publicBalance || 0).toFixed(4)}</span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={shieldingAmount}
                          onChange={(e) => setShieldingAmount(e.target.value)}
                          className="pr-16"
                        />
                        <button 
                          onClick={() => setShieldingAmount((shieldingTokenType === 1 ? usdcxPublicBalance || 0 : publicBalance || 0).toString())}
                          className="absolute right-4 top-[38px] text-[10px] uppercase tracking-widest font-bold text-white/40 hover:text-white transition-colors"
                        >
                          Max
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-4">
                      <Button
                        onClick={async () => {
                          const amt = parseFloat(shieldingAmount);
                          if (isNaN(amt) || amt <= 0) return;
                          setShieldingStatus("pending");
                          const res = await convertPublicToPrivate(amt, shieldingTokenType);
                          if (res) {
                            setShieldingStatus("success");
                            if (shieldingTokenType === 0) {
                                setPendingShieldAmount(amt);
                            }
                            
                            // Close modal and start polling for the new record
                            setTimeout(async () => {
                              setIsShieldModalOpen(false);
                              setShieldingStatus("idle");
                              setShieldingAmount("");
                              
                              // Start aggressive polling for 2 minutes or until pending clears
                              let polls = 0;
                              const pollInterval = setInterval(async () => {
                                polls++;
                                await refreshBalances();
                                // pendingShieldAmount is cleared inside useStealthPay when balance updates
                                if (polls > 24) clearInterval(pollInterval); // Stop after 2 mins approx
                              }, 5000);
                            }, 1500);
                          } else {
                            setShieldingStatus("error");
                          }
                        }}
                        disabled={shieldingStatus === "pending" || !shieldingAmount}
                        className="w-full"
                      >
                        {shieldingStatus === "pending" ? "Executing ZK Proof..." : 
                         shieldingStatus === "success" ? "Success!" : 
                         "Confirm Shielding"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => setIsShieldModalOpen(false)}
                        className="w-full text-xs uppercase tracking-widest text-slate-11"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* QR Code Modal */}
        <AnimatePresence>
          {isQrModalOpen && qrInvoice && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsQrModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md overflow-hidden"
              >
                <GlassCard className="p-8 space-y-8 border-white/10 shadow-2xl text-center">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight italic font-serif">Invoice QR Code</h2>
                    <p className="text-slate-11 text-xs">Share this code with the payer to receive private funds.</p>
                  </div>

                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                      <QRCodeSVG
                        value={buildPaymentUrl(
                          window.location.origin,
                          qrInvoice.merchant_address,
                          String(qrInvoice.amount),
                          qrInvoice.salt || qrInvoice.invoice_hash,
                          qrInvoice.token_type
                        )}
                        size={200}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "/aleo.svg",
                          x: undefined,
                          y: undefined,
                          height: 28,
                          width: 28,
                          excavate: true,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                       <span className="text-[10px] text-slate-5 font-bold uppercase tracking-[0.2em] block">Order Detail</span>
                       <div className="text-lg font-serif italic text-white">
                         {qrInvoice.amount} {qrInvoice.token_type === 1 ? 'USDCx' : 'Credits'}
                       </div>
                    </div>
                    
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        const url = buildPaymentUrl(
                          window.location.origin,
                          qrInvoice.merchant_address,
                          String(qrInvoice.amount),
                          qrInvoice.salt || qrInvoice.invoice_hash,
                          qrInvoice.token_type
                        );
                        navigator.clipboard.writeText(url);
                        setNotification({ message: "Link copied to clipboard", type: "info" });
                        setTimeout(() => setNotification(null), 3000);
                      }}
                      className="w-full text-xs uppercase tracking-widest"
                    >
                      Copy Payment Link
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsQrModalOpen(false)}
                      className="w-full text-xs uppercase tracking-widest text-slate-11"
                    >
                      Close
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <section className="grid gap-8 grid-cols-1 md:grid-cols-3">
          <AnimatePresence>
            {stats && (
              <>
                {[
                  { label: "Total Invoices", value: stats.total },
                  { label: "Settled", value: stats.settled },
                  { label: "Active Merchants", value: stats.merchants },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="p-6 md:p-8 rounded-3xl bg-[#0a0a0a] border border-white/5 flex flex-col items-center text-center"
                  >
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-5 font-bold mb-2">
                      {stat.label}
                    </span>
                    <span className="text-4xl font-serif italic text-white">
                      {stat.value}
                    </span>
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Direct Pay Section */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="h-full p-6 md:p-10 flex flex-col gap-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Direct Payment</h2>
                <p className="text-slate-11 text-sm">Send private funds directly to a merchant address.</p>
              </div>

              {!address ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl">
                    <p className="text-slate-11 text-sm mb-4">Connect wallet to send payments</p>
                 </div>
              ) : (
                <div className="space-y-6">
                  {/* Token Selector */}
                  <div className="flex gap-2 p-1 bg-white/5 rounded-lg w-full">
                    <button 
                      onClick={() => setDirectTokenType(0)}
                      className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-bold rounded-md transition-all ${directTokenType === 0 ? 'bg-white text-black shadow-lg' : 'text-slate-11 hover:text-white'}`}
                    >
                      Aleo Credits
                    </button>
                    <button 
                      onClick={() => setDirectTokenType(1)}
                      className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-bold rounded-md transition-all ${directTokenType === 1 ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-11 hover:text-white'}`}
                    >
                      USDCx
                    </button>
                  </div>

                  <Input
                    label="Merchant address"
                    value={directMerchant}
                    onChange={(e) => {
                      setDirectMerchant(e.target.value);
                      setDirectResult(null);
                    }}
                    placeholder="aleo1..."
                  />
                  <Input
                    label={`Amount (${directTokenType === 1 ? 'USDCx' : 'credits'})`}
                    type="number"
                    placeholder="0.00"
                    value={directAmount}
                    onChange={(e) => {
                      setDirectAmount(e.target.value);
                      setDirectResult(null);
                    }}
                    min="0"
                    step="0.000001"
                  />
                  
                  <div className="pt-2">
                    <Button
                      onClick={() => handleDirectPay(directTokenType)}
                      disabled={status === "pending" || !directMerchant || !directAmount}
                      className="w-full"
                    >
                      {status === "pending" ? "Executing..." : "Send Payment"}
                    </Button>
                  </div>

                  {error === "wallet_syncing" ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border-2 border-amber-500/40 border-t-amber-500 animate-spin shrink-0" />
                        <p className="text-xs text-amber-400 font-bold">Shielded Balance Syncing</p>
                      </div>
                      <p className="text-[10px] text-slate-11 leading-relaxed">
                        Open Leo Wallet to speed up sync, then retry.
                      </p>
                    </div>
                  ) : error ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mt-4">
                      <p className="text-xs text-red-400">{error}</p>
                      {error.includes("shield credits first") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShieldingAmount(directAmount);
                            setShieldingTokenType(directTokenType);
                            setIsShieldModalOpen(true);
                          }}
                          className="mt-2 text-[10px] uppercase tracking-widest text-white border border-white/20 hover:bg-white/10"
                        >
                          Shield {directTokenType === 1 ? 'USDCx' : 'Credits'} Now →
                        </Button>
                      )}
                    </div>
                  ) : null}
                  {directResult && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-4 overflow-hidden">
                      <p className="text-xs text-slate-11 mb-1">Success. Transaction Status:</p>
                      {!directResult.startsWith("at1") && !directResult.includes("Completed") ? (
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest animate-pulse">Finalizing on Aleo Ledger...</p>
                      ) : (
                        <p className={`text-[10px] font-mono break-all ${directResult.includes("Completed") ? "text-green-400" : "text-white"}`}>
                          {directResult}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Activity Section */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="h-full p-6 md:p-10 flex flex-col gap-8">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {address ? "My Transactions" : "Recent Activity"}
                  </h2>
                  <p className="text-slate-11 text-sm">
                    {address ? "Your invoices and payments on the network." : "Latest transactions across the network."}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {recentInvoices.length > 0 ? (
                  recentInvoices.slice(0, 6).map((inv, i) => {
                    const isMerchant = address && inv.merchant_address === address;
                    const tokenLabel = inv.invoice_type === 1 ? "USDCx" : "Credits";
                    const isSettled = inv.status === "SETTLED";
                    return (
                      <motion.div
                        key={inv.invoice_hash}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 + i * 0.05 }}
                        className="flex justify-between items-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {address && (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMerchant ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                              {isMerchant ? "↓" : "↑"}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <div className="text-xs font-mono text-slate-11">
                              INV-{inv.invoice_hash.slice(0, 8).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {address && (
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${isMerchant ? "text-green-500" : "text-red-400"}`}>
                                  {isMerchant ? "Incoming" : "Outgoing"}
                                </span>
                              )}
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${isSettled ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                                {inv.status}
                              </span>
                              {isMerchant && !isSettled && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setQrInvoice(inv);
                                    setIsQrModalOpen(true);
                                  }}
                                  className="p-1 px-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-[9px] font-bold text-white uppercase tracking-tighter"
                                  title="Show Payment QR"
                                >
                                  QR
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className={`text-sm font-bold ${isMerchant ? "text-green-400" : "text-white"}`}>
                            {isMerchant ? "+" : address ? "−" : ""}{inv.amount} {tokenLabel}
                          </div>
                          {inv.memo && (
                            <div className="text-[10px] text-slate-5 truncate max-w-[120px]">{inv.memo}</div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl">
                    <p className="text-slate-11 text-sm italic">
                      {apiError ? "Activity unavailable" : address ? "No transactions yet" : "No recent activity"}
                    </p>
                  </div>
                )}
              </div>
              
              {apiError && (
                <p className="text-[10px] text-slate-5 uppercase tracking-widest text-center mt-4">
                  Backend check failed · Local connection only
                </p>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
