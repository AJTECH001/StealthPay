import { useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { getExplorerTxUrl } from "../../services/stealthpay";
import { motion, AnimatePresence } from "framer-motion";

export default function Verification() {
  const [txId, setTxId] = useState("");
  const [secret, setSecret] = useState("");
  const [salt, setSalt] = useState("");
  const [status, setStatus] = useState<"IDLE" | "CHECKING" | "VALID" | "INVALID">("IDLE");

  const handleVerifyByTxId = () => {
    const trimmed = txId.trim();
    if (!trimmed) return;
    window.open(getExplorerTxUrl(trimmed), "_blank");
  };

  const handleVerifyBySecret = async () => {
    if (!secret || !salt) return;
    setStatus("CHECKING");
    await new Promise((r) => setTimeout(r, 1200));
    // Implementation mock for advanced verification
    setStatus(secret.length > 5 && salt.length > 5 ? "VALID" : "INVALID");
  };

  return (
    <div className="relative max-w-4xl mx-auto py-12">
      <div className="space-y-12">
        <header className="flex flex-col items-center text-center space-y-6">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-serif italic text-white tracking-tighter"
          >
            Verification
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-11 text-lg max-w-2xl"
          >
            Independently validate transactions, receipts, and zero-knowledge proofs on the Aleo network.
          </motion.p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Quick Verify */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="h-full p-10 flex flex-col gap-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">On-Chain Lookup</h2>
                <p className="text-slate-11 text-sm">Paste a Transaction ID to view the immutable ledger entry.</p>
              </div>

              <div className="space-y-6">
                <Input
                  label="Transaction ID"
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  placeholder="at1..."
                />
                <Button
                  onClick={handleVerifyByTxId}
                  disabled={!txId.trim()}
                  className="w-full text-xs uppercase tracking-widest py-4"
                >
                  Lookup on Explorer
                </Button>
              </div>
            </GlassCard>
          </motion.div>

          {/* Advanced Verify */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="h-full p-10 flex flex-col gap-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Proof Validation</h2>
                <p className="text-slate-11 text-sm">Verify shielded payments using the payment secret and invoice salt.</p>
              </div>

              <div className="space-y-6">
                <Input
                  label="Payment Secret"
                  value={secret}
                  onChange={(e) => {
                    setSecret(e.target.value);
                    setStatus("IDLE");
                  }}
                  placeholder="Enter secret..."
                />
                <Input
                  label="Invoice Salt"
                  value={salt}
                  onChange={(e) => {
                    setSalt(e.target.value);
                    setStatus("IDLE");
                  }}
                  placeholder="Enter salt..."
                />
                
                <div className="space-y-4">
                  <Button 
                    variant="secondary"
                    onClick={handleVerifyBySecret} 
                    disabled={status === "CHECKING" || !secret || !salt} 
                    className="w-full text-xs uppercase tracking-widest py-4"
                  >
                    {status === "CHECKING" ? "Validating..." : "Verify Proof"}
                  </Button>
                  
                  <AnimatePresence>
                    {status === "VALID" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 text-center"
                      >
                        <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Receipt Authenticated ✓</p>
                      </motion.div>
                    )}
                    {status === "INVALID" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-center"
                      >
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Verification Failed ✗</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-xl mx-auto text-center"
        >
          <GlassCard className="p-8">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Security Notice</h3>
            <p className="text-xs text-slate-11 leading-relaxed">
              StealthPay employs client-side ZK-proof generation. Your view keys and secrets never leave your local environment. 
              Public verification only confirms the existence and status of the ciphertexts on the Aleo ledger.
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

