const problems = [
  {
    title: "Competitors",
    body: "Monitor headcount, salary benchmarks, and hiring velocity by watching your on-chain activity.",
  },
  {
    title: "Employees",
    body: "Lose financial privacy — salaries, spending habits, and net worth become permanently traceable.",
  },
  {
    title: "HR & Legal",
    body: "Face compliance exposure when confidential compensation data is visible to the entire world.",
  },
];

export default function ProblemSection() {
  return (
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
          {problems.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-2"
            >
              <p className="text-sm font-semibold text-white">{p.title}</p>
              <p className="text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
