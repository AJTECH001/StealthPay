import { useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { getExplorerTxUrl } from "../../services/stealthpay";
import { motion, AnimatePresence } from "framer-motion";

export default function Verification() {
  const [txId, setTxId] = useState("");
  const [txIdForProof, setTxIdForProof] = useState("");
  const [salt, setSalt] = useState("");
  const [status, setStatus] = useState<"IDLE" | "CHECKING" | "VALID" | "INVALID">("IDLE");
  const [verifiedAmount, setVerifiedAmount] = useState<number | null>(null);
  const [verifiedToken, setVerifiedToken] = useState<string>("Credits");

  const handleVerifyByTxId = () => {
    const trimmed = txId.trim();
    if (!trimmed) return;
    window.open(getExplorerTxUrl(trimmed), "_blank");
  };

  const handleVerifyProof = async () => {
    if (!txIdForProof || !salt) return;
    setStatus("CHECKING");
    setVerifiedAmount(null);
    try {
      const res = await fetch(`https://api.explorer.provable.com/v1/testnet/transaction/${txIdForProof}`);
      if (!res.ok) throw new Error("Transaction not found");
      const data = await res.json();
      
      let foundMatchingSalt = false;
      let amountFound = 0;
      
      if (data.execution && data.execution.transitions) {
        for (const transition of data.execution.transitions) {
          const isStealthPay = transition.program === "stealthpay_usdcx_v3.aleo";
          if (isStealthPay && transition.function === "finalize_pay_invoice") {
            // New signature: [salt, amount, merchant, token_type] (indices 0, 1, 2, 3)
            // Old signature (if applicable): maybe salt was at index 1? 
            // We check if salt matches at index 0 or 1.
            const s0 = transition.inputs[0]?.value;
            const s1 = transition.inputs[1]?.value;
            
            if (s0 === salt || s1 === salt) {
              foundMatchingSalt = true;
              const isNewSign = s0 === salt;
              const amountRaw = isNewSign ? transition.inputs[1]?.value : transition.inputs[3]?.value;
              const typeRaw = isNewSign ? transition.inputs[3]?.value : "0u8";
              
              amountFound = parseInt(amountRaw.replace("u64", "").replace("u128", "")) / 1_000_000;
              setVerifiedToken(typeRaw === "1u8" ? "USDCx" : "Credits");
              break;
            }
          }
        }
      }
      
      if (foundMatchingSalt) {
        setVerifiedAmount(amountFound);
        setStatus("VALID");
      } else {
        setStatus("INVALID");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setStatus("INVALID");
    }
  };

  return (
    <div className="relative max-w-4xl mx-auto py-12">
      <div className="space-y-12">
        <header className="flex flex-col items-center text-center space-y-6">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-7xl font-serif italic text-white tracking-tighter"
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
            <GlassCard className="h-full p-6 md:p-10 flex flex-col gap-8">
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
            <GlassCard className="h-full p-6 md:p-10 flex flex-col gap-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">Proof Validation</h2>
                <p className="text-slate-11 text-sm">Verify shielded payments by matching the transaction payload with the invoice salt.</p>
              </div>

              <div className="space-y-6">
                <Input
                  label="Transaction ID"
                  value={txIdForProof}
                  onChange={(e) => {
                    setTxIdForProof(e.target.value);
                    setStatus("IDLE");
                    setVerifiedAmount(null);
                  }}
                  placeholder="at1..."
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
                    onClick={handleVerifyProof} 
                    disabled={status === "CHECKING" || !txIdForProof || !salt} 
                    className="w-full text-xs uppercase tracking-widest py-4"
                  >
                    {status === "CHECKING" ? "Querying Ledger..." : "Verify Proof"}
                  </Button>
                  
                  <AnimatePresence>
                    {status === "VALID" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-xl bg-green-500/5 border border-green-500/20 text-center space-y-2"
                      >
                        <div className="w-10 h-10 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <p className="text-xs text-green-400 font-bold uppercase tracking-widest">Receipt Authenticated</p>
                        <p className="text-2xl font-serif italic text-white flex justify-center items-baseline gap-2">
                          {verifiedAmount !== null ? verifiedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                          <span className="text-sm font-sans not-italic text-slate-11 uppercase tracking-widest font-medium">{verifiedToken}</span>
                        </p>
                        <p className="text-[10px] text-slate-11">Cryptographically proven on-chain</p>
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
                  {txIdForProof && txIdForProof.startsWith("at1") && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 overflow-hidden text-center">
                      <p className="text-xs text-slate-11 mb-2">View on Explorer</p>
                      <a
                        href={`https://testnet.explorer.provable.com/transaction/${txIdForProof}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button variant="secondary" className="w-full text-[10px] uppercase tracking-widest h-8">
                          View Complete Record →
                        </Button>
                      </a>
                    </div>
                  )}
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

