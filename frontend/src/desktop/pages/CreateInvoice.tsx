import { useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useStealthPay } from "../../hooks/useStealthPay";
import { toMicrocredits } from "../../services/stealthpay";
import { api } from "../../services/api";

export default function CreateInvoice() {
  const { address } = useWallet();
  const {
    createInvoice,
    status,
    error,
    reset,
    generateSalt,
  } = useStealthPay();

  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [isMultiPay, setIsMultiPay] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<{
    paymentUrl: string;
    invoiceHash?: string;
    salt?: string;
    amount?: number;
    isMultiPay?: boolean;
  } | null>(null);

  const handleCreate = async () => {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    reset();
    setInvoiceResult(null);

    const salt = generateSalt();
    const amountMicrocredits = toMicrocredits(amountNum);

    const invoiceType = isMultiPay ? 1 : 0;
    const result = await createInvoice({
      merchant: address!,
      amountMicrocredits,
      salt,
      expiryHours: 24,
      invoiceType,
    });

    if (result?.paymentUrl) {
      try {
        await api.createInvoice({
          invoice_hash: salt,
          merchant_address: address!,
          amount: amountNum,
          memo: memo || undefined,
          status: "PENDING",
          invoice_transaction_id: result.transactionId,
          salt,
          invoice_type: invoiceType,
        });
      } catch (err) {
        console.warn("Backend sync failed:", err);
      }
      setInvoiceResult({
        paymentUrl: result.paymentUrl,
        invoiceHash: result.transactionId,
        salt,
        amount: amountNum,
        isMultiPay,
      });
    }
  };

  const copyPaymentUrl = () => {
    if (invoiceResult?.paymentUrl) {
      navigator.clipboard.writeText(invoiceResult.paymentUrl);
    }
  };

  return (
    <div className="page-container relative min-h-screen">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-7xl mx-auto pt-12 px-6 relative z-10">
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-none text-foreground">
            Create{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-gray-600">
              Invoice
            </span>
          </h1>
          <p className="text-gray-300 text-xl leading-relaxed max-w-2xl mb-2">
            Generate a privacy-preserving invoice link to receive payments on the Aleo network.
          </p>
        </div>

        <div className="w-full max-w-2xl mx-auto">
          <GlassCard className="p-8">
            {!address ? (
              <p className="text-gray-400 text-center py-6">
                Connect your wallet to create an invoice.
              </p>
            ) : invoiceResult ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-black/5 p-4 border border-glass-border">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                    Payment link
                  </p>
                  <p className="text-foreground font-mono text-sm break-all mb-4">
                    {invoiceResult.paymentUrl}
                  </p>
                  <Button variant="secondary" onClick={copyPaymentUrl}>
                    Copy link
                  </Button>
                </div>
                <p className="text-green-600 text-sm">
                  Invoice created. Share this link with the payer.
                </p>
                {invoiceResult.isMultiPay && invoiceResult.salt && (
                  <div className="rounded-xl bg-amber-500/10 p-4 border border-amber-500/20 text-sm">
                    <p className="text-amber-600 font-medium mb-1">Multi-pay invoice</p>
                    <p className="text-gray-500 text-xs mb-2">
                      To settle later, use Profile → Settle with this salt and amount.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-mono text-xs break-all">
                        Salt: {invoiceResult.salt.slice(0, 24)}…
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(invoiceResult.salt!)}
                      >
                        Copy salt
                      </Button>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">Amount: {invoiceResult.amount} credits</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setInvoiceResult(null);
                    setAmount("");
                    setMemo("");
                    reset();
                  }}
                >
                  Create another
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <Input
                  label="Amount (credits)"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.000001"
                />
                <Input
                  label="Memo (optional)"
                  placeholder="Payment for..."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="multipay"
                    checked={isMultiPay}
                    onChange={(e) => setIsMultiPay(e.target.checked)}
                    className="rounded border-gray-400"
                  />
                  <label htmlFor="multipay" className="text-sm text-gray-500">
                    Multi-pay (campaign) – allows multiple payments; settle manually from Profile
                  </label>
                </div>
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={status === "pending" || !amount}
                >
                  {status === "pending" ? "Creating…" : "Create Invoice"}
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
