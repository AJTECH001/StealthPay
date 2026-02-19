import { useState, useEffect } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useStealthPay } from "../../hooks/useStealthPay";
import { toMicrocredits } from "../../services/stealthpay";
import { api, type Invoice } from "../../services/api";

export default function Profile() {
  const { address } = useWallet();
  const { settleInvoice, status, error, reset } = useStealthPay();

  const [settleSalt, setSettleSalt] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleResult, setSettleResult] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [markingHash, setMarkingHash] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    api
      .getInvoicesByMerchant(address)
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .catch((err) => {
        if (!cancelled) setApiError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => { cancelled = true; };
  }, [address]);

  const handleSettle = async () => {
    const amountNum = parseFloat(settleAmount);
    if (!settleSalt || !settleAmount || isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    reset();
    setSettleResult(null);

    const result = await settleInvoice({
      salt: settleSalt,
      amountMicrocredits: toMicrocredits(amountNum),
    });

    if (result?.transactionId) {
      setSettleResult(result.transactionId);
      try {
        const invoice = await api.getInvoiceBySalt(settleSalt, amountNum);
        await api.updateInvoice(invoice.invoice_hash, {
          status: "SETTLED",
          payment_tx_ids: result.transactionId,
        });
      } catch (err) {
        console.warn("Backend sync failed:", err);
      }
      if (address) {
        api.getInvoicesByMerchant(address).then(setInvoices).catch(() => {});
      }
    }
  };

  const handleMarkSettled = async (inv: Invoice) => {
    if (inv.status === "SETTLED") return;
    setMarkingHash(inv.invoice_hash);
    try {
      await api.updateInvoice(inv.invoice_hash, { status: "SETTLED" });
      setInvoices((prev) =>
        prev.map((i) =>
          i.invoice_hash === inv.invoice_hash ? { ...i, status: "SETTLED" } : i
        )
      );
    } catch (err) {
      console.error("Mark settled failed:", err);
    } finally {
      setMarkingHash(null);
    }
  };

  return (
    <div className="relative min-h-[80vh]">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">
          Profile
        </h1>
        <p className="text-gray-400 mt-2">
          Your invoices and payment history. Settle multi-pay invoices below.
        </p>
      </div>

      <div className="space-y-6">
        <GlassCard className="p-8">
          {address ? (
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">
                  Connected address
                </p>
                <p className="text-foreground font-mono text-sm break-all mt-1">
                  {address}
                </p>
              </div>
              {apiError && (
                <p className="text-amber-600 text-sm">
                  Backend: {apiError}. Start backend in <code className="bg-black/5 px-1 rounded">backend/</code>.
                </p>
              )}
              {invoices.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3">
                    Your invoices ({invoices.length})
                  </h3>
                  <div className="space-y-2">
                    {invoices.slice(0, 10).map((inv) => (
                      <div
                        key={inv.invoice_hash}
                        className="flex justify-between items-center gap-3 py-2 border-b border-glass-border last:border-0"
                      >
                        <span className="text-sm">
                          {inv.amount} credits · {inv.status}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {inv.memo && (
                            <span className="text-xs text-gray-500 truncate max-w-[80px]">
                              {inv.memo}
                            </span>
                          )}
                          {inv.status === "PENDING" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkSettled(inv)}
                              disabled={markingHash === inv.invoice_hash}
                            >
                              {markingHash === inv.invoice_hash ? "Updating…" : "Mark settled"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Received payment? Click &quot;Mark settled&quot; to update the invoice status.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-6">
              Connect your wallet to see your profile.
            </p>
          )}
        </GlassCard>

        {address && (
          <GlassCard className="p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Settle multi-pay invoice
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Close a multi-pay campaign invoice. You must be the merchant who
              created it.
            </p>
            <div className="space-y-4">
              <Input
                label="Invoice salt"
                value={settleSalt}
                onChange={(e) => {
                  setSettleSalt(e.target.value);
                  setSettleResult(null);
                }}
                placeholder="Salt from create_invoice"
              />
              <Input
                label="Amount (credits)"
                type="number"
                placeholder="0.00"
                value={settleAmount}
                onChange={(e) => {
                  setSettleAmount(e.target.value);
                  setSettleResult(null);
                }}
                min="0"
                step="0.000001"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              {settleResult && (
                <p className="text-green-600 text-sm">
                  Settled. Transaction: {settleResult}
                </p>
              )}
              <Button
                onClick={handleSettle}
                disabled={status === "pending" || !settleSalt || !settleAmount}
              >
                {status === "pending" ? "Settling…" : "Settle invoice"}
              </Button>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
