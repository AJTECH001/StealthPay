import { useState, useEffect } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Link } from "react-router-dom";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useStealthPay } from "../../hooks/useStealthPay";
import { api, type InvoiceStats, type Invoice } from "../../services/api";

export default function Explorer() {
  const { address } = useWallet();
  const { makePayment, status, error, reset } = useStealthPay();

  const [directMerchant, setDirectMerchant] = useState("");
  const [directAmount, setDirectAmount] = useState("");
  const [directResult, setDirectResult] = useState<string | null>(null);

  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.getStats(),
          api.getRecentInvoices(10),
        ]);
        if (!cancelled) {
          setStats(statsRes);
          setRecentInvoices(recentRes);
          setApiError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const handleDirectPay = async () => {
    const amountNum = parseFloat(directAmount);
    if (!directMerchant || !directAmount || isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    reset();
    setDirectResult(null);

    const result = await makePayment(directMerchant.trim(), amountNum);

    if (result?.transactionId) {
      setDirectResult(result.transactionId);
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.getStats(),
          api.getRecentInvoices(10),
        ]);
        setStats(statsRes);
        setRecentInvoices(recentRes);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="relative min-h-[80vh]">
      <div className="space-y-12">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-none text-foreground">
              Dashboard
            </h1>
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-foreground"
            >
              Back to home
            </Link>
          </div>
          <p className="text-gray-600 text-xl leading-relaxed max-w-2xl mb-8">
            Create invoices, pay privately, and track activity. Merchants get
            verifiable receipts; payers stay off the public ledger.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/create">
              <Button>Create Invoice</Button>
            </Link>
            <Link to="/pay">
              <Button variant="secondary">Pay Invoice</Button>
            </Link>
          </div>
        </div>

        {address && (
          <GlassCard className="p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Direct payment (no invoice)
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Pay a merchant directly using make_payment. Creates a private
              Payment receipt for the merchant.
            </p>
            <div className="space-y-4 max-w-md">
              <Input
                label="Merchant address"
                value={directMerchant}
                onChange={(e) => {
                  setDirectMerchant(e.target.value);
                  setDirectResult(null);
                }}
                placeholder="aleo1..."
              />
              <Input
                label="Amount (credits)"
                type="number"
                placeholder="0.00"
                value={directAmount}
                onChange={(e) => {
                  setDirectAmount(e.target.value);
                  setDirectResult(null);
                }}
                min="0"
                step="0.000001"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              {directResult && (
                <p className="text-green-600 text-sm">
                  Paid. Transaction: {directResult}
                </p>
              )}
              <Button
                onClick={handleDirectPay}
                disabled={
                  status === "pending" || !directMerchant || !directAmount
                }
              >
                {status === "pending" ? "Paying…" : "Pay directly"}
              </Button>
            </div>
          </GlassCard>
        )}

        <GlassCard className="p-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Explorer</h2>
          {apiError && (
            <p className="text-amber-600 text-sm mb-4">
              Backend not available: {apiError}. Start the backend with{" "}
              <code className="bg-black/5 px-1 rounded">npm run dev</code> in{" "}
              <code className="bg-black/5 px-1 rounded">backend/</code>.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Invoices", value: stats?.total ?? "—" },
              { label: "Pending", value: stats?.pending ?? "—" },
              { label: "Settled", value: stats?.settled ?? "—" },
              { label: "Merchants", value: stats?.merchants ?? "—" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-black/5 rounded-xl p-4 border border-glass-border"
              >
                <p className="text-gray-500 text-xs uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-foreground font-bold text-lg mt-1">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          {recentInvoices.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">
                Recent invoices
              </h3>
              <div className="space-y-2">
                {recentInvoices.slice(0, 5).map((inv) => (
                  <div
                    key={inv.invoice_hash}
                    className="flex justify-between items-center py-2 border-b border-glass-border last:border-0"
                  >
                    <span className="text-sm font-mono truncate max-w-[120px]">
                      {inv.invoice_hash.slice(0, 12)}…
                    </span>
                    <span className="text-sm text-gray-500">
                      {inv.amount} credits · {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
