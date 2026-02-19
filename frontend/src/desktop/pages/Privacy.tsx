import { GlassCard } from "../../components/ui/GlassCard";

export default function Privacy() {
  return (
    <div className="relative min-h-[80vh]">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">
          Privacy
        </h1>
        <p className="text-gray-400 mt-2">
          How StealthPay keeps payments private and verifiable.
        </p>
      </div>

      <div className="space-y-6">
        <GlassCard className="p-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Private by default</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            All value movement uses Aleo&apos;s <code className="text-gray-300">transfer_private</code>. No public balance or mapping is updated; sender, receiver, and amount stay off the public ledger. Only the invoice commitment hash and status are stored on-chain—merchant and amount are never plaintext.
          </p>
        </GlassCard>
        <GlassCard className="p-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Payment receipts</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            When you pay an invoice, the merchant receives a private <code className="text-gray-300">Payment</code> record (owner, amount, payer). Only the merchant—or someone with their view key—can decrypt it. This gives verifiable proof of payment without exposing the payer to the world.
          </p>
        </GlassCard>
        <GlassCard className="p-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Selective disclosure</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Merchants can use Transaction View Keys (TVK) to prove specific payments to third parties (e.g. refunds, disputes, audits) without revealing unrelated transactions. Privacy first; prove only what you need, when you need it.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
