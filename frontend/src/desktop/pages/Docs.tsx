import { GlassCard } from "../../components/ui/GlassCard";

export default function Docs() {
  return (
    <div className="relative min-h-[80vh]">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">
          Docs
        </h1>
        <p className="text-gray-400 mt-2">
          StealthPay program and integration reference.
        </p>
      </div>

      <GlassCard className="p-8 space-y-6">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-2">Program: stealthpay.aleo</h2>
          <p className="text-gray-400 text-sm">
            Deployed on Aleo Testnet. Transitions: create_invoice, pay_invoice, settle_invoice, get_invoice_status, make_payment (legacy).
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">Create invoice</h2>
          <p className="text-gray-400 text-sm mb-2">
            Merchant commits to (merchant, amount, salt); only the commitment hash is stored on-chain. Returns invoice_hash for the payment link.
          </p>
          <code className="block bg-black/5 rounded-lg p-3 text-foreground text-xs font-mono overflow-x-auto border border-glass-border">
            create_invoice(merchant, amount, salt, expiry_hours, invoice_type) → (invoice_hash, Future)
          </code>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">Pay invoice</h2>
          <p className="text-gray-400 text-sm mb-2">
            Verifies the commitment, runs transfer_private to the merchant, issues a Payment record (receipt), and records a receipt key for replay protection.
          </p>
          <code className="block bg-black/5 rounded-lg p-3 text-foreground text-xs font-mono overflow-x-auto border border-glass-border">
            pay_invoice(pay_record, merchant, amount, salt, payment_secret, message) → (Payment, credits, credits, Future)
          </code>
        </section>
        <p className="text-gray-500 text-sm">
          See <code className="text-gray-400">contracts/stealthpay/README.md</code> and <code className="text-gray-400">docs/ProductDesign.md</code> for full details.
        </p>
      </GlassCard>
    </div>
  );
}
