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

export default function HowItWorksSection() {
  return (
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
  );
}
