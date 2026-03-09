import { GlassCard } from "../../components/ui/GlassCard";
import { motion } from "framer-motion";

const points = [
  {
    title: "Shielded by Default",
    desc: "All value movement leverages Aleo's Zero-Knowledge circuits. Payer, recipient, and amount are never exposed to the public ledger. Only the proof of validity is persistent."
  },
  {
    title: "Encrypted Receipts",
    desc: "Upon settlement, an encrypted Payment record is issued. Only the owner of the designated view key can decrypt the transaction details, ensuring absolute merchant confidentiality."
  },
  {
    title: "Selective Disclosure",
    desc: "Privacy does not mean isolation. StealthPay supports Transaction View Keys (TVK), allowing merchants to selectively prove payment status to auditors or for dispute resolution without compromising global anonymity."
  }
];

export default function Privacy() {
  return (
    <div className="relative max-w-4xl mx-auto py-12">
      <div className="space-y-12">
        <header className="flex flex-col items-center text-center space-y-6">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-serif italic text-white tracking-tighter"
          >
            Privacy
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-11 text-lg max-w-2xl"
          >
            StealthPay is built on the principle that financial privacy is a fundamental right. We leverage Zero-Knowledge Proofs to ensure your data stays yours.
          </motion.p>
        </header>

        <div className="space-y-6">
          {points.map((p, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <GlassCard className="p-10">
                <h2 className="text-2xl font-bold text-white tracking-tight mb-4">{p.title}</h2>
                <p className="text-slate-11 leading-relaxed text-sm md:text-base">
                  {p.desc}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 text-center mt-12"
        >
          <p className="text-xs text-slate-11">
            StealthPay is a decentralized application. We never store your keys, records, or passwords on any centralized server.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

