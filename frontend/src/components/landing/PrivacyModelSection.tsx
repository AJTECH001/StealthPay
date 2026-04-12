export default function PrivacyModelSection() {
  return (
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
  );
}
