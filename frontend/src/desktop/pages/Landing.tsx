import { Link } from "react-router-dom";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";

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
    <div className="relative min-h-[80vh]">
      <div className="space-y-24 md:space-y-32">
        {/* Hero */}
        <section className="flex flex-col items-center text-center pt-4 md:pt-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.1] text-foreground mb-6">
              Privacy-first payments on Aleo
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
              Stop choosing between total surveillance and total obscurity.
              StealthPay gives you private-by-default transactions with
              selective disclosure for compliance and verification.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/explorer">
                <Button size="lg">Launch App</Button>
              </Link>
              <Link to="/docs">
                <Button variant="secondary" size="lg">
                  Read docs
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="max-w-4xl mx-auto">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
              The transparency paradox
            </h2>
            <p className="text-gray-600 text-lg text-center max-w-2xl mx-auto mb-8">
              On public blockchains, every transfer is visible. Merchants need
              proof of payment; payers need privacy. Traditional systems force
              you to pick one—or accept opaque, unverifiable privacy.
            </p>
            <GlassCard className="p-8 md:p-10 text-center">
              <p className="text-foreground font-semibold text-lg">
                We're solving the gap between <em>private</em> and{" "}
                <em>verifiable</em>: private by default, verifiable by design,
                and selectively disclosable when you need it.
              </p>
            </GlassCard>
          </div>
        </section>

        {/* What we offer */}
        <section className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What StealthPay solves
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              A decentralized payment gateway on Aleo that keeps sender identity
              and balances off the public ledger while giving merchants
              cryptographic proof of payment.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div key={i}>
                <GlassCard className="p-6 h-full flex flex-col">
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {f.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">
                    {f.description}
                  </p>
                </GlassCard>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Create an invoice, get paid privately, receive proof—without
              exposing who paid.
            </p>
          </div>
          <div className="space-y-6">
            {steps.map((s, i) => (
              <div key={i}>
                <GlassCard className="p-6 md:p-8 flex flex-row gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-foreground text-white flex items-center justify-center font-bold text-lg">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {s.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {s.text}
                    </p>
                  </div>
                </GlassCard>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center text-center pb-16">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to pay with privacy?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
              Connect your Aleo wallet, create or pay an invoice, and verify
              payments—all without exposing your identity on the public ledger.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/explorer">
                <Button size="lg">Launch App</Button>
              </Link>
              <Link to="/privacy">
                <Button variant="secondary" size="lg">
                  How privacy works
                </Button>
              </Link>
              <Link to="/verify">
                <Button variant="outline" size="lg">
                  Verify a payment
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
