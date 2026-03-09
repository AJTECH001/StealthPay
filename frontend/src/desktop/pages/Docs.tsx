import { GlassCard } from "../../components/ui/GlassCard";
import { motion } from "framer-motion";

const sections = [
  {
    title: "Program: stealthpay.aleo",
    desc: "The core protocol logic deployed on Aleo. Handles private commitments, shielded transfers, and receipt generation.",
    code: null
  },
  {
    title: "Create Invoice",
    desc: "Merchants commit to a triple (merchant, amount, salt). Only the commitment hash is persisted on-chain, ensuring privacy prior to payment.",
    code: "create_invoice(merchant, amount, salt, expiry, type)"
  },
  {
    title: "Pay Invoice",
    desc: "Validates the commitment, executes a private transfer, and issues an encrypted Payment record (receipt) to the merchant.",
    code: "pay_invoice(record, merchant, amount, salt, secret, msg)"
  }
];

export default function Docs() {
  return (
    <div className="relative max-w-4xl mx-auto py-12">
      <div className="space-y-12">
        <header className="flex flex-col items-center text-center space-y-6">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-serif italic text-white tracking-tighter"
          >
            Documentation
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-11 text-lg max-w-2xl"
          >
            Technical reference for integrating with the StealthPay protocol and building private payment workflows.
          </motion.p>
        </header>

        <div className="space-y-8">
          {sections.map((s, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <GlassCard className="p-8 space-y-4">
                <h2 className="text-xl font-bold text-white tracking-tight">{s.title}</h2>
                <p className="text-sm text-slate-11 leading-relaxed max-w-2xl">{s.desc}</p>
                {s.code && (
                  <div className="p-4 bg-black/40 rounded-xl border border-white/5 overflow-x-auto">
                    <code className="text-xs font-mono text-white opacity-80">{s.code}</code>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center pt-8"
        >
          <p className="text-xs text-slate-5 uppercase tracking-[0.2em]">
            Reference: <span className="text-slate-11">contracts/stealthpay/README.md</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

