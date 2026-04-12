import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap, Globe, Brain, Lock, CheckCircle, ArrowRight, ChevronRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Register your company",
    description:
      "Connect your Shield wallet and register your organization on-chain in a single transaction. Your company name is hashed — never stored in plaintext.",
  },
  {
    number: "02",
    title: "Fund the payroll vault",
    description:
      "Deposit ALEO credits or USDCX stablecoin into your program-controlled vault. Funds are locked until disbursed — non-custodial by design.",
  },
  {
    number: "03",
    title: "Add employees privately",
    description:
      "Set salary, payment type (lump-sum or streaming), and token preference. Salaries are committed via BHP256 — never written in plaintext to the ledger.",
  },
  {
    number: "04",
    title: "Employees claim in zero-knowledge",
    description:
      "Each employee generates a ZK proof of their salary commitment and triggers their own payout. The payout lands as a private record in their wallet.",
  },
];

const features = [
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

const stats = [
  { value: "~4s", label: "Settlement Time", sub: "vs 3–5 days via SWIFT" },
  { value: "<$0.01", label: "Transaction Fee", sub: "vs 3–5% via banks" },
  { value: "ZK", label: "Privacy Model", sub: "zero-knowledge proofs" },
  { value: "100%", label: "Non-Custodial", sub: "your keys, your vault" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-24 pb-32 sm:pt-36 sm:pb-40">
        {/* background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="outline" className="text-white/60 border-white/20 px-4 py-1 text-xs tracking-widest uppercase">
            Live on Aleo Testnet · stealthpay_payroll_v3.aleo
          </Badge>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white font-serif leading-[1.05]">
            Institutional Payroll.{" "}
            <span className="text-white/40">Zero Exposure.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            StealthPay is the first privacy-native payroll protocol built on Aleo.
            Run global payroll on-chain without broadcasting salary data to the world.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild variant="polygon" size="lg" className="gap-2 px-8">
              <Link to="/employer">
                Launch as Employer <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 px-8">
              <Link to="/employee">
                Employee Portal <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/60 pt-2">
            No sign-up. Connect your Shield wallet and start in 60 seconds.
          </p>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/10 py-12 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="text-3xl sm:text-4xl font-bold text-white font-serif">{s.value}</div>
              <div className="text-sm font-semibold text-white/80">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/40">The Problem</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white font-serif leading-tight">
            Institutions aren't adopting crypto payroll because of transparency
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Every transaction on a public blockchain is permanently visible. When companies pay
            employees on-chain, salary amounts, payment frequency, and wallet addresses are
            broadcast to the world — giving competitors, regulators, and bad actors a live feed
            into your compensation structure.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 pt-4 text-left">
            {[
              { title: "Competitors", body: "Monitor headcount, salary benchmarks, and hiring velocity by watching your on-chain activity." },
              { title: "Employees", body: "Lose financial privacy — salaries, spending habits, and net worth become permanently traceable." },
              { title: "HR & Legal", body: "Face compliance exposure when confidential compensation data is visible to the entire world." },
            ].map((p) => (
              <div key={p.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-2">
                <p className="text-sm font-semibold text-white">{p.title}</p>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-white/10 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/40">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-serif">
              From registration to private payout in four steps
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 space-y-4 hover:border-white/20 transition-colors"
              >
                <span className="text-4xl font-bold text-white/10 font-serif select-none">
                  {step.number}
                </span>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
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

      {/* ── PRIVACY MODEL ────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-white/10 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/40">Privacy Model</p>
            <h2 className="text-3xl font-bold text-white font-serif leading-tight">
              Salaries committed, never revealed
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              At hire time, the employer commits the salary via a BHP256 cryptographic hash.
              Only the hash is stored on-chain — the plaintext amount lives exclusively inside
              the employee's private ZK record.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              At claim time, the employee's browser generates a zero-knowledge proof that they
              know the salary preimage. The smart contract verifies the proof and releases the
              payout as a private credits record — without ever learning the salary amount.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 font-mono text-sm space-y-4">
            <p className="text-white/40 text-xs">// Hire — stored on-chain</p>
            <p className="text-white/80">
              commitment = <span className="text-white">BHP256</span>(&#123;{" "}
              <span className="text-white/60">salary</span>,{" "}
              <span className="text-white/60">secret</span> &#125;)
            </p>
            <div className="border-t border-white/10 pt-4">
              <p className="text-white/40 text-xs">// Claim — verified in ZK</p>
              <p className="text-white/80 mt-2">
                <span className="text-white">assert</span>(hash(salary, secret){" "}
                <span className="text-white">==</span> commitment)
              </p>
              <p className="text-white/80">
                <span className="text-white">transfer_public_to_private</span>(
                <span className="text-white/60">employee</span>, amount)
              </p>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-white/40 text-xs">// Result</p>
              <p className="text-green-400/80 mt-2">✓ Salary never written to ledger</p>
              <p className="text-green-400/80">✓ Payout verified without disclosure</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-28 px-4 border-t border-white/10 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl sm:text-5xl font-bold text-white font-serif">
            Run your first private payroll today
          </h2>
          <p className="text-muted-foreground text-lg">
            Connect your Shield wallet, register your company, and pay your team
            on-chain — with full ZK privacy — in under five minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild variant="polygon" size="lg" className="gap-2 px-8">
              <Link to="/employer">
                Start as Employer <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <Link to="/analytics">View Analytics</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-10 px-4 bg-black/40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
              <span className="text-black text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-white font-serif">
              Stealth<span className="text-white/40">Pay</span>
            </span>
            <span className="text-white/20 text-xs ml-2">· stealthpay_payroll_v3.aleo</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/employer" className="hover:text-white transition-colors">Employer</Link>
            <Link to="/employee" className="hover:text-white transition-colors">Employee</Link>
            <Link to="/analytics" className="hover:text-white transition-colors">Analytics</Link>
            <a
              href="https://testnet.explorer.provable.com/program/stealthpay_payroll_v3.aleo"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Explorer
            </a>
          </div>

          <p className="text-xs text-white/20">
            MIT License · Built on{" "}
            <a href="https://aleo.org" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">
              Aleo
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
}
