import { useState, useEffect } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Link } from "react-router-dom";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useStealthPay } from "../../hooks/useStealthPay";
import { api, type InvoiceStats, type Invoice } from "../../services/api";
import { toMicrocredits } from "../../services/stealthpay";
import { motion, AnimatePresence } from "framer-motion";

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
    recordError,
    pendingShieldAmount,
    setPendingShieldAmount,
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

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.getStats(),
          api.getRecentInvoices(10),
        ]);
        if (!cancelled) {
          setStats(statsRes);
          setRecentInvoices(recentRes);
          setApiError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    }
    fetchData();
    if (address) {
      refreshBalances().then(() => {
        // Clear pending amount once a refresh confirms new data
        setPendingShieldAmount(0);
      });
    }
    return () => { cancelled = true; };
  }, [address, refreshBalances, setPendingShieldAmount]);

  // Poll for final tx hash for direct payments
  // Real Aleo tx IDs start with "at1". Leo wallet returns UUIDs (contain "-"),
  // Shield wallet returns temp IDs like "shield_XXXX_XXXX". Both need polling.
  useEffect(() => {
    if (!directResult || directResult.startsWith("at1") || !address) return;

    let timer: NodeJS.Timeout;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await transactionStatus?.(directResult);
        if (res && res.transactionId && res.transactionId.startsWith("at1")) {
          if (cancelled) return;
          setDirectResult(res.transactionId);
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

  const handleDirectPay = async () => {
    const amountNum = parseFloat(directAmount);
    if (!directMerchant || !directAmount || isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    reset();
    setDirectResult(null);

    const result = await makePayment(directMerchant.trim(), amountNum);

    if (result?.transactionId) {
      setDirectResult(result.transactionId);
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.getStats(),
          api.getRecentInvoices(10),
        ]);
        setStats(statsRes);
        setRecentInvoices(recentRes);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto py-12">
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

            <div className="grid gap-8 md:grid-cols-2">
            <GlassCard className="p-10 flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-5">Shielded Balance</span>
                </div>
                <div className="text-5xl font-serif italic text-white flex items-baseline gap-2">
                  {privateBalance !== null ? privateBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                  <span className="text-lg font-sans not-italic text-slate-11 uppercase tracking-widest font-medium">Credits</span>
                  {pendingShieldAmount > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[10px] font-sans not-italic bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full"
                    >
                      +{pendingShieldAmount.toFixed(2)} Pending
                    </motion.div>
                  )}
                </div>
                {recordError ? (
                  <p className="text-[10px] text-amber-400/80 max-w-[220px] leading-tight mt-1">{recordError}</p>
                ) : (
                  <p className="text-xs text-slate-11 max-w-[200px]">Spendable immediately in private transactions.</p>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-10 flex flex-col justify-between group overflow-hidden relative border-white/5 bg-white/[0.01]">
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
                </svg>
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-5">Public Balance</span>
                </div>
                <div className="text-5xl font-serif italic text-white/60 flex items-baseline gap-2">
                  {publicBalance !== null ? publicBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                  <span className="text-lg font-sans not-italic text-slate-11 uppercase tracking-widest font-medium">Credits</span>
                  {pendingShieldAmount > 0 && (
                    <span className="text-[10px] font-sans not-italic text-slate-5 italic">
                      ({pendingShieldAmount.toFixed(2)} shielding...)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xs text-slate-11">Visible to the public ledger.</p>
                  {(publicBalance || 0) > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setShieldingAmount(Math.min(30, publicBalance || 0).toString());
                        setIsShieldModalOpen(true);
                      }}
                      className="text-[10px] uppercase tracking-widest h-7 border border-white/10 hover:bg-white/5"
                    >
                      Shield Funds →
                    </Button>
                  )}
                </div>
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
                    <h2 className="text-2xl font-bold text-white tracking-tight">Shield Credits</h2>
                    <p className="text-slate-11 text-sm">Convert public credits into private records for stealth spending.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-slate-5">
                        <span>Amount to Shield</span>
                        <span>Available: {(publicBalance || 0).toFixed(4)}</span>
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
                          onClick={() => setShieldingAmount((publicBalance || 0).toString())}
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
                          const res = await convertPublicToPrivate(toMicrocredits(amt));
                          if (res) {
                            setShieldingStatus("success");
                            // Show pending amount in portfolio immediately
                            setPendingShieldAmount(amt);
                            setTimeout(() => {
                              setIsShieldModalOpen(false);
                              setShieldingStatus("idle");
                              setShieldingAmount("");
                              // Refresh now and again after chain confirms
                              refreshBalances();
                              setTimeout(() => refreshBalances(), 5000);
                              setTimeout(() => refreshBalances(), 15000);
                              setTimeout(() => {
                                refreshBalances();
                                setPendingShieldAmount(0);
                              }, 30000);
                            }, 2000);
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

        <section className="grid gap-8 md:grid-cols-3">
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
                    className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/5 flex flex-col items-center text-center"
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
            <GlassCard className="h-full p-10 flex flex-col gap-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Direct Payment</h2>
                <p className="text-slate-11 text-sm">Send credits directly to a merchant address without an invoice.</p>
              </div>

              {!address ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl">
                    <p className="text-slate-11 text-sm mb-4">Connect wallet to send payments</p>
                 </div>
              ) : (
                <div className="space-y-6">
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
                    label="Amount (credits)"
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
                      onClick={handleDirectPay}
                      disabled={status === "pending" || !directMerchant || !directAmount}
                      className="w-full"
                    >
                      {status === "pending" ? "Executing..." : "Send Payment"}
                    </Button>
                  </div>

                  {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                  {directResult && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-4 overflow-hidden">
                      <p className="text-xs text-slate-11 mb-1">Success. Transaction ID:</p>
                      {!directResult.startsWith("at1") ? (
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest animate-pulse">Finalizing on Aleo Ledger...</p>
                      ) : (
                        <p className="text-[10px] font-mono text-white break-all">{directResult}</p>
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
            <GlassCard className="h-full p-10 flex flex-col gap-8">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Recent Activity</h2>
                  <p className="text-slate-11 text-sm">Latest transactions across the network.</p>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {recentInvoices.length > 0 ? (
                  recentInvoices.slice(0, 6).map((inv, i) => (
                    <motion.div 
                      key={inv.invoice_hash}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 + i * 0.05 }}
                      className="flex justify-between items-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-slate-11">
                          INV-{inv.invoice_hash.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-[10px] text-slate-5 font-bold uppercase tracking-widest">
                          {inv.status}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm font-bold text-white">{inv.amount} CREDITS</div>
                        <div className="text-[10px] text-slate-5 font-medium">Standard Payment</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl">
                    <p className="text-slate-11 text-sm italic">
                      {apiError ? "Activity unavailable" : "No recent activity"}
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
