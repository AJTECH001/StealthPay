import { useState, useEffect } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useStealthPay } from "../../hooks/useStealthPay";
import { toMicrocredits } from "../../services/stealthpay";
import { api, type Invoice } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";

export default function Profile() {
  const { address } = useWallet();
  const {
    settleInvoice,
    status,
    error,
    reset,
  } = useStealthPay();

  const [settleSalt, setSettleSalt] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleResult, setSettleResult] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [markingHash, setMarkingHash] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    api
      .getInvoicesByMerchant(address)
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .catch((err) => {
        if (!cancelled) console.error("Profile load failed:", err);
      });
    return () => { cancelled = true; };
  }, [address]);

  const handleSettle = async () => {
    const amountNum = parseFloat(settleAmount);
    if (!settleSalt || !settleAmount || isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    reset();
    setSettleResult(null);

    const result = await settleInvoice({
      salt: settleSalt,
      amountMicrocredits: toMicrocredits(amountNum),
    });

    if (result?.transactionId) {
      setSettleResult(result.transactionId);
      try {
        const invoice = await api.getInvoiceBySalt(settleSalt, amountNum);
        await api.updateInvoice(invoice.invoice_hash, {
          status: "SETTLED",
          payment_tx_ids: result.transactionId,
        });
      } catch (err) {
        console.warn("Backend sync failed:", err);
      }
      if (address) {
        api.getInvoicesByMerchant(address).then(setInvoices).catch(() => {});
      }
    }
  };

  const handleMarkSettled = async (inv: Invoice) => {
    if (inv.status === "SETTLED") return;
    setMarkingHash(inv.invoice_hash);
    try {
      await api.updateInvoice(inv.invoice_hash, { status: "SETTLED" });
      setInvoices((prev) =>
        prev.map((i) =>
          i.invoice_hash === inv.invoice_hash ? { ...i, status: "SETTLED" } : i
        )
      );
    } catch (err) {
      console.error("Mark settled failed:", err);
    } finally {
      setMarkingHash(null);
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
            Merchant Profile
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-11 text-lg max-w-xl"
          >
            Manage your merchant identity, track incoming private payments, and settle campaigns.
          </motion.p>
        </header>

        {!address ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-2">
                <svg className="w-8 h-8 text-slate-11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <p className="text-slate-11">Connect your Aleo wallet to access your merchant dashboard.</p>
            </GlassCard>
          </motion.div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Identity & Stats */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1 space-y-8"
            >
              <GlassCard className="p-8 space-y-6">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-5 font-bold uppercase tracking-[0.2em]">Address</span>
                  <p className="text-xs font-mono text-white break-all leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                    {address}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-5 font-bold uppercase tracking-widest">Global Status</span>
                    <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">Verified Merchant</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-5 font-bold uppercase tracking-widest">Network</span>
                    <span className="text-[10px] text-white">Aleo Testnet</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">Settle Campaign</h3>
                  <p className="text-xs text-slate-11 leading-relaxed">
                    Manually settle a Multi-pay campaign to your wallet. Requires the original salt.
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Campaign Salt"
                    value={settleSalt}
                    onChange={(e) => {
                      setSettleSalt(e.target.value);
                      setSettleResult(null);
                    }}
                    placeholder="salt_..."
                  />
                  <Input
                    label="Amount"
                    type="number"
                    value={settleAmount}
                    onChange={(e) => {
                      setSettleAmount(e.target.value);
                      setSettleResult(null);
                    }}
                    placeholder="0.00"
                  />
                  <Button
                    onClick={handleSettle}
                    disabled={status === "pending" || !settleSalt || !settleAmount}
                    className="w-full text-[10px] uppercase tracking-widest"
                  >
                    {status === "pending" ? "Settling..." : "Settle Now"}
                  </Button>
                  {error && <p className="text-[10px] text-red-400 text-center">{error}</p>}
                  {settleResult && (
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                      <p className="text-[10px] text-green-400 text-center truncate">Success: {settleResult}</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Invoices List */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              <GlassCard className="h-full p-10 flex flex-col gap-8">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Your Invoices</h2>
                    <p className="text-slate-11 text-sm">Most recent {invoices.length} invoices generated by your address.</p>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <AnimatePresence mode="popLayout">
                    {invoices.length > 0 ? (
                      invoices.map((inv, i) => (
                        <motion.div
                          key={inv.invoice_hash}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + i * 0.05 }}
                          className="flex justify-between items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-white tracking-tight">
                              {inv.amount} {inv.invoice_type === 1 ? 'USDCx' : 'CREDITS'}
                            </span>
                              <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${
                                inv.status === 'SETTLED'
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {inv.status}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-5">HASH: {inv.invoice_hash.slice(0, 16)}...</div>
                            {inv.memo && <div className="text-[10px] text-slate-11 italic">"{inv.memo}"</div>}
                          </div>

                          <div>
                            {inv.status === "PENDING" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkSettled(inv)}
                                disabled={markingHash === inv.invoice_hash}
                                className="text-[9px] uppercase tracking-widest font-bold h-8 flex items-center"
                              >
                                {markingHash === inv.invoice_hash ? "Wait..." : "Mark Settle"}
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-3xl opacity-50">
                        <p className="text-slate-11 text-sm italic">No invoices found for this merchant.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
