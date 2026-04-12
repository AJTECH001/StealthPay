import { Shield, Zap, Globe, Brain, Lock, CheckCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Lock,
    title: "Zero-Knowledge Privacy",
    description:
      "Salary amounts are committed via BHP256 hashes. No compensation data is ever stored in plaintext on the public ledger.",
  },
  {
    icon: Zap,
    title: "Real-Time Streaming",
    description:
      "Per-block salary accrual enforced entirely on-chain. Employees can claim their earned balance at any moment without waiting for payroll cycles.",
  },
  {
    icon: Globe,
    title: "Borderless Settlement",
    description:
      "Pay any Aleo wallet address globally. No SWIFT, no correspondent banks, no 3–5 day delays. Settlement finalizes in ~4 seconds.",
  },
  {
    icon: Shield,
    title: "Non-Custodial Vault",
    description:
      "Payroll funds are held in a program-controlled smart contract. Only verified employees can claim. Employers can withdraw unused balance anytime.",
  },
  {
    icon: Brain,
    title: "AI Payroll Analytics",
    description:
      "Claude Haiku analyzes payroll health, flags anomalies, and surfaces optimization recommendations — running only on employer-visible data.",
  },
  {
    icon: CheckCircle,
    title: "Cryptographic Proof of Pay",
    description:
      "Every payment is a verifiable on-chain transaction. Employees hold private records as proof of compensation — auditable without revealing amounts.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 px-4 border-t border-white/10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/40">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white font-serif">
            Everything you need for private global payroll
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3 hover:border-white/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
