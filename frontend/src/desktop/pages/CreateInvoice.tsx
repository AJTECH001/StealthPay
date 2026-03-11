import { useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useStealthPay } from "../../hooks/useStealthPay";
import { toMicrocredits } from "../../services/stealthpay";
import { api } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { USDCxInfo } from "../components/USDCxInfo";


export default function CreateInvoice() {
  const { address } = useWallet();
  const {
    createInvoice,
    status,
    error,
    reset,
    generateSalt,
  } = useStealthPay();

  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [isMultiPay, setIsMultiPay] = useState(false);
  const [tokenType, setTokenType] = useState(0); // 0 = Credits, 1 = USDCx
  const [invoiceResult, setInvoiceResult] = useState<{
    paymentUrl: string;
    invoiceHash?: string;
    salt?: string;
    amount?: number;
    isMultiPay?: boolean;
    tokenType?: number;
  } | null>(null);

  const handleCreate = async () => {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    reset();
    setInvoiceResult(null);

    const salt = generateSalt();
    const amountMicrocredits = toMicrocredits(amountNum);

    const invoiceType = isMultiPay ? 1 : 0;
    const result = await createInvoice({
      merchant: address!,
      amountMicrocredits,
      salt,
      expiryHours: 24,
      invoiceType,
      tokenType,
    });

    if (result?.paymentUrl) {
      try {
        await api.createInvoice({
          invoice_hash: result.transactionId,
          merchant_address: address!,
          amount: amountNum,
          memo: memo || undefined,
          status: "PENDING",
          invoice_transaction_id: result.transactionId,
          salt,
          invoice_type: invoiceType,
        });
      } catch (err) {
        console.warn("Backend sync failed:", err);
      }
      setInvoiceResult({
        paymentUrl: result.paymentUrl,
        invoiceHash: result.transactionId,
        salt,
        amount: amountNum,
        isMultiPay,
        tokenType,
      });
    }
  };

  const copyPaymentUrl = () => {
    if (invoiceResult?.paymentUrl) {
      navigator.clipboard.writeText(invoiceResult.paymentUrl);
    }
  };

  return (
    <div className="relative max-w-3xl mx-auto py-12">
      <div className="space-y-12">
        <header className="flex flex-col items-center text-center space-y-6">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-serif italic text-white tracking-tighter"
          >
            Create Invoice
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-11 text-lg max-w-xl"
          >
            Generate a secure, private payment link to receive {tokenType === 1 ? 'USDCx stablecoin' : 'Aleo credits'} privately.
          </motion.p>
        </header>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-10">
            <AnimatePresence mode="wait">
              {!address ? (
                <motion.div 
                  key="no-wallet"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center p-12 space-y-4 text-center"
                >
                  <p className="text-slate-11">Connect your wallet to generate invoices</p>
                  <p className="text-xs text-slate-5 uppercase tracking-widest font-bold">Identity REQUIRED for Merchant Flow</p>
                </motion.div>
              ) : invoiceResult ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-5 font-bold uppercase tracking-[0.2em]">Payment Link</span>
                      <p className="text-sm font-mono text-white break-all">{invoiceResult.paymentUrl}</p>
                    </div>
                    <Button variant="secondary" onClick={copyPaymentUrl} className="w-full text-xs uppercase tracking-widest">
                      Copy Link
                    </Button>
                  </div>

                   <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-sm text-green-400 font-medium tracking-tight">Invoice broadcast success. Link is live for {invoiceResult.tokenType === 1 ? 'USDCx' : 'Credits'}.</p>
                  </div>

                  {invoiceResult.isMultiPay && (
                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">Multi-pay Campaign</div>
                      <p className="text-xs text-slate-11">This invoice allows multiple payments. Keep the salt secure to settle manually from your profile.</p>
                      <div className="flex gap-2">
                        <code className="flex-1 p-2 bg-black/40 rounded border border-white/5 text-[10px] text-white opacity-60 font-mono">
                          {invoiceResult.salt}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigator.clipboard.writeText(invoiceResult.salt!)}
                          className="text-[10px] uppercase font-bold"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setInvoiceResult(null);
                        setAmount("");
                        setMemo("");
                        reset();
                      }}
                      className="w-full uppercase tracking-widest text-xs"
                    >
                      Create another invoice
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                   <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setTokenType(0)}
                        className={`p-4 rounded-2xl border transition-all text-center ${
                          tokenType === 0 
                            ? "bg-white/10 border-white/20 text-white" 
                            : "bg-white/[0.02] border-white/5 text-slate-500"
                        }`}
                      >
                        <span className="block text-xs font-bold uppercase tracking-widest mb-1">Aleo</span>
                        <span className="text-sm">Credits</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTokenType(1)}
                        className={`p-4 rounded-2xl border transition-all text-center ${
                          tokenType === 1 
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                            : "bg-white/[0.02] border-white/5 text-slate-500"
                        }`}
                      >
                        <span className="block text-xs font-bold uppercase tracking-widest mb-1">USDCx</span>
                        <span className="text-sm">Stablecoin</span>
                      </button>
                    </div>

                    <Input
                      label={`Amount (${tokenType === 1 ? 'USDCx' : 'credits'})`}
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.000001"
                    />
                    <Input
                      label="Public Memo"
                      placeholder="e.g. Services, Order #123"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
                    
                    <label className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-colors group">
                      <div className="relative flex items-center pt-1">
                        <input
                          type="checkbox"
                          checked={isMultiPay}
                          onChange={(e) => setIsMultiPay(e.target.checked)}
                          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 transition-all checked:bg-white"
                        />
                        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 peer-checked:opacity-100">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-white uppercase tracking-wider block">Multi-pay campaign</span>
                        <span className="text-xs text-slate-11 block leading-relaxed">Allows multiple senders to pay this invoice. Recommended for donations or subscriptions.</span>
                      </div>
                    </label>
                  </div>

                  {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
                  
                  <div className="pt-2">
                    <Button
                      className="w-full text-xs uppercase tracking-[0.2em] py-4"
                      onClick={handleCreate}
                      disabled={status === "pending" || !amount}
                    >
                      {status === "pending" ? "Broadcasting..." : "Confirm & Create"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
         </motion.div>
         
         {tokenType === 1 && !invoiceResult && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="mt-12"
           >
             <USDCxInfo />
           </motion.div>
         )}
      </div>
    </div>
  );
}
