import { Link } from "react-router-dom";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { motion } from "framer-motion";

const features = [
  {
    title: "Private by default",
    description:
      "Sender identity and balances stay off the public ledger. All value movement uses Aleo's transfer_private—no public balance or mapping is updated.",
  },
  {
    title: "Verifiable by design",
    description:
      "Merchants receive a cryptographic Payment record (owner, amount, payer). Only the merchant can decrypt it—verifiable proof of payment without exposing the payer.",
  },
  {
    title: "Selectively disclosable",
    description:
      "Transaction View Keys (TVKs) let merchants prove specific payments for refunds, audits, or tax reporting without revealing unrelated transaction history.",
  },
  {
    title: "Invoice flow with replay protection",
    description:
      "Create invoices with commitment hashes; pay by invoice with on-chain status and salt-based replay protection. Settle when ready.",
  },
  {
    title: "Zero protocol fees (MVP)",
    description:
      "No protocol fees—focus on adoption and network effects. Pay only network costs for private execution on Aleo.",
  },
];

const steps = [
  { step: 1, title: "Create invoice", text: "Merchant creates an invoice; commitment hash and status go on-chain. Amount and merchant stay private." },
  { step: 2, title: "Pay privately", text: "Payer pays via pay_invoice. A private Payment record is sent to the merchant; nothing about the payer is public." },
  { step: 3, title: "Merchant gets proof", text: "Only the merchant (or their view key) can decrypt the Payment. They have proof of payment without exposing who paid." },
  { step: 4, title: "Settle & verify", text: "Merchant settles the invoice on-chain. Use payment secret + invoice salt to verify a transaction without revealing payer identity." },
];

export default function Landing() {
  return (
    <div className="relative min-h-[90vh] flex flex-col gap-32 py-12">
      {/* Hero */}
      <section className="flex flex-col items-start text-left max-w-4xl mx-auto w-full pt-12 md:pt-20">
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-8xl font-serif italic tracking-tighter leading-[0.9] text-white mb-8"
        >
          Privacy-first payments <br /> 
          <span className="not-italic text-slate-11">on Aleo.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-xl md:text-2xl text-slate-11 leading-relaxed max-w-2xl mb-12"
        >
          Stop choosing between surveillance and obscurity. 
          StealthPay gives you private-by-default transactions with 
          selective disclosure for the modern economy.
        </motion.p>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col md:flex-row flex-wrap gap-4 w-full md:w-auto"
        >
          <Link to="/explorer" className="w-full md:w-auto">
            <Button size="lg" className="w-full md:w-auto uppercase tracking-widest text-xs">Launch App</Button>
          </Link>
          <Link to="/docs" className="w-full md:w-auto">
            <Button variant="secondary" size="lg" className="w-full md:w-auto uppercase tracking-widest text-xs">
              Read documentation
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto w-full">
        <div className="grid gap-px bg-white/10 border border-white/10 rounded-3xl overflow-hidden grid-cols-1 md:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="bg-black p-10 hover:bg-slate-2/50 transition-colors group">
              <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">
                {f.title}
              </h3>
              <p className="text-slate-11 text-base leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works - Compact & Premium */}
      <section className="max-w-5xl mx-auto w-full space-y-12">
        <div className="text-left space-y-4">
          <h2 className="text-4xl md:text-6xl font-serif text-white tracking-tight">How it works</h2>
          <p className="text-slate-11 text-lg max-w-xl">
            From invoice creation to private settlement, every step balances 
            privacy with verifiability.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {steps.map((s, i) => (
            <GlassCard key={i} className="p-8 border-white/5 hover:border-white/10 transition-all flex flex-col gap-6">
              <div className="text-3xl font-serif italic text-white/20">0{s.step}</div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">{s.title}</h3>
                <p className="text-slate-11 leading-relaxed">{s.text}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto w-full py-24 text-center border-t border-white/5">
        <h2 className="text-5xl md:text-7xl font-serif text-white mb-12 tracking-tighter">
          Ready to build <br /> with privacy?
        </h2>
        <div className="flex flex-col md:flex-row flex-wrap gap-4 justify-center">
          <Link to="/explorer" className="w-full md:w-auto">
            <Button size="lg" className="w-full md:w-auto px-12 uppercase tracking-widest text-xs">Get Started</Button>
          </Link>
          <Link to="/verify" className="w-full md:w-auto">
            <Button variant="outline" size="lg" className="w-full md:w-auto px-12 uppercase tracking-widest text-xs">
              Verify Transaction
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

