const stats = [
  { value: "~4s", label: "Settlement Time", sub: "vs 3–5 days via SWIFT" },
  { value: "<$0.01", label: "Transaction Fee", sub: "vs 3–5% via banks" },
  { value: "ZK", label: "Privacy Model", sub: "zero-knowledge proofs" },
  { value: "100%", label: "Non-Custodial", sub: "your keys, your vault" },
];

export default function StatsSection() {
  return (
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
  );
}
