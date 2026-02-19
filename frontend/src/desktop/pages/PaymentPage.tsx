import { useState, useEffect, useRef } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { Link, useSearchParams } from "react-router-dom";
import { useStealthPay } from "../../hooks/useStealthPay";
import { toMicrocredits, getExplorerTxUrl } from "../../services/stealthpay";
import { api } from "../../services/api";

function VerificationBlock({
  txId,
  title,
  description,
}: {
  txId: string;
  title: string;
  description?: string;
}) {
  const [copied, setCopied] = useState(false);
  const explorerUrl = getExplorerTxUrl(txId);

  const copyTxId = () => {
    navigator.clipboard.writeText(txId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 space-y-3">
      <p className="font-medium text-green-600">{title}</p>
      {description && (
        <p className="text-sm text-gray-400">{description}</p>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <code className="text-foreground font-mono text-xs break-all flex-1 min-w-0">
          {txId}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={copyTxId}
          className="shrink-0"
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-green-600/20"
      >
        Verify on Leo Testnet Explorer →
      </a>
    </div>
  );
}

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const { address } = useWallet();
  const {
    payInvoice,
    convertPublicToPrivate,
    status,
    error,
    txId: hookTxId,
    reset,
    generatePaymentSecret,
  } = useStealthPay();

  const merchant = searchParams.get("merchant");
  const amountStr = searchParams.get("amount");
  const salt = searchParams.get("salt");

  const hasParams = merchant && amountStr && salt;

  const amountCredits = hasParams ? parseFloat(amountStr) : 0;
  const amountMicrocredits = hasParams ? toMicrocredits(amountCredits) : 0;

  const paymentResultKey = hasParams && merchant && amountStr && salt
    ? `stealthpay-payment-${merchant}-${amountStr}-${salt}`
    : null;

  const [backendSyncStatus, setBackendSyncStatus] = useState<"idle" | "success" | "failed">("idle");
  const [backendSyncError, setBackendSyncError] = useState<string | null>(null);

  const [paymentResult, setPaymentResult] = useState<{
    transactionId: string;
  } | null>(() => {
    if (!paymentResultKey) return null;
    try {
      const stored = sessionStorage.getItem(paymentResultKey);
      return stored ? { transactionId: stored } : null;
    } catch {
      return null;
    }
  });
  const [convertResult, setConvertResult] = useState<{
    transactionId: string;
  } | null>(null);

  useEffect(() => {
    if (paymentResult && paymentResultKey) {
      try {
        sessionStorage.setItem(paymentResultKey, paymentResult.transactionId);
      } catch {}
    }
  }, [paymentResult, paymentResultKey]);

  // When restored from sessionStorage, try to sync backend if we have params
  useEffect(() => {
    if (
      !paymentResult ||
      !hasParams ||
      !merchant ||
      !salt ||
      backendSyncStatus !== "idle" ||
      !address
    )
      return;
    let cancelled = false;
    (async () => {
      try {
        const invoice = await api.getInvoiceBySalt(salt, amountCredits);
        await api.updateInvoice(invoice.invoice_hash, {
          status: "SETTLED",
          payment_tx_ids: paymentResult.transactionId,
          payer_address: address,
        });
        if (!cancelled) setBackendSyncStatus("success");
      } catch (err) {
        if (!cancelled) {
          setBackendSyncStatus("failed");
          setBackendSyncError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [paymentResult, hasParams, merchant, salt, amountCredits, address, backendSyncStatus]);

  const needsPrivateConversion =
    error?.includes("No credits records") ?? false;
  const convertAmount = Math.max(amountCredits + 0.05, 0.25);
  const convertAmountMicrocredits = toMicrocredits(convertAmount);

  const handleConvertToPrivate = async () => {
    reset();
    setConvertResult(null);
    const result = await convertPublicToPrivate(convertAmountMicrocredits);
    if (result?.transactionId) {
      setConvertResult({ transactionId: result.transactionId });
    }
  };

  const successRef = useRef<HTMLDivElement>(null);

  const handlePay = async () => {
    if (!hasParams || !merchant || !salt) return;

    reset();
    setPaymentResult(null);
    setBackendSyncStatus("idle");
    setBackendSyncError(null);
    // Keep convertResult so user still sees conversion verification

    const paymentSecret = generatePaymentSecret();

    const result = await payInvoice({
      merchant,
      amountMicrocredits,
      salt,
      paymentSecret,
    });

    const txId = result?.transactionId ?? (result as { id?: string })?.id ?? hookTxId;
    if (txId) {
      setPaymentResult({ transactionId: txId });
      try {
        const invoice = await api.getInvoiceBySalt(salt, amountCredits);
        await api.updateInvoice(invoice.invoice_hash, {
          status: "SETTLED",
          payment_tx_ids: txId,
          payer_address: address!,
        });
        setBackendSyncStatus("success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setBackendSyncStatus("failed");
        setBackendSyncError(msg);
        console.warn("Backend sync failed:", err);
      }
      requestAnimationFrame(() => {
        successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[85vh]">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter text-foreground">
            Make{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-gray-600">
              Payment
            </span>
          </h1>
          {hasParams && (
            <div className="inline-flex items-center gap-2 bg-neon-primary/10 px-4 py-2 rounded-full border border-neon-primary/20">
              <span className="text-sm font-bold text-neon-primary tracking-wide uppercase">
                Invoice from link
              </span>
            </div>
          )}
        </div>

        <GlassCard variant="heavy" className="p-8">
          {!hasParams ? (
            <p className="text-gray-400 text-center py-6">
              Open a payment link (e.g. /pay?merchant=...&amount=...&salt=...)
              to pay an invoice.
            </p>
          ) : !address ? (
            <p className="text-gray-400 text-center py-6">
              Connect your wallet to pay this invoice.
            </p>
          ) : paymentResult ? (
            <div ref={successRef} className="space-y-6">
              <div className="rounded-xl bg-green-500/20 border-2 border-green-500/40 p-6 text-center">
                <p className="text-green-400 font-bold text-xl mb-1">
                  ✓ Payment confirmed
                </p>
                <p className="text-gray-400 text-sm">
                  Your payment of {amountCredits} credits has been submitted to the network.
                </p>
              </div>
              {backendSyncStatus === "success" && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 flex items-start gap-3">
                  <span className="text-green-500 text-xl shrink-0">✓</span>
                  <div>
                    <p className="font-medium text-green-600">Invoice marked as SETTLED</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      The invoice is now SETTLED. Check <Link to="/explorer" className="text-neon-primary hover:underline">Explorer</Link> or{" "}
                      <Link to="/profile" className="text-neon-primary hover:underline">Profile</Link> to verify.
                    </p>
                  </div>
                </div>
              )}
              {backendSyncStatus === "failed" && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3">
                  <span className="text-amber-500 text-xl shrink-0">!</span>
                  <div>
                    <p className="font-medium text-amber-600">Backend sync failed</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Your payment succeeded on-chain, but the invoice may still show PENDING in Profile/Explorer.
                    </p>
                    {backendSyncError && (
                      <p className="text-xs text-amber-600/80 mt-2 font-mono">{backendSyncError}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Ensure the backend is running (<code className="bg-black/10 px-1 rounded">cd backend && npm run dev</code>).
                    </p>
                  </div>
                </div>
              )}
              <VerificationBlock
                txId={paymentResult.transactionId}
                title="Verify on Leo Testnet Explorer"
                description="Confirm your payment was included on-chain."
              />
              <div className="rounded-xl bg-black/5 p-4 border border-glass-border text-sm text-gray-400 space-y-2">
                <p className="font-medium text-foreground">Verification</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>
                    <strong>Payer:</strong> Use the link above to confirm the transaction on Leo Testnet Explorer
                  </li>
                  <li>
                    <strong>Merchant:</strong> Check your wallet for the private <code className="text-gray-300">Payment</code> record
                  </li>
                  <li>
                    <strong>Profile:</strong> If the backend is running, the invoice appears as SETTLED in Profile
                  </li>
                </ul>
                <p className="pt-2">
                  <Link to="/verify" className="text-neon-primary hover:underline">
                    Verify other transactions →
                  </Link>
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setPaymentResult(null);
                  setBackendSyncStatus("idle");
                  setBackendSyncError(null);
                  if (paymentResultKey) {
                    try {
                      sessionStorage.removeItem(paymentResultKey);
                    } catch {}
                  }
                  reset();
                }}
              >
                Make another payment
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl bg-black/5 p-4 border border-glass-border">
                <p className="text-gray-500 text-xs uppercase">Amount</p>
                <p className="text-foreground font-bold">
                  {amountCredits} credits
                </p>
              </div>
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                  <p className="text-red-400 font-medium">Payment failed</p>
                  <p className="text-sm text-red-300/80 mt-1">{error}</p>
                  <p className="text-xs text-gray-500 mt-2">Check your wallet and try again.</p>
                </div>
              )}
              {needsPrivateConversion && (
                <div className="rounded-xl bg-amber-500/10 p-4 border border-amber-500/20 space-y-3">
                  <p className="text-sm text-amber-200">
                    Private payments require a <strong>private balance</strong>.
                    Convert some public credits to private first.
                  </p>
                  {convertResult ? (
                    <div className="space-y-2">
                      <p className="text-sm text-green-500">
                        Conversion complete. Try paying again.
                      </p>
                      <VerificationBlock
                        txId={convertResult.transactionId}
                        title="Verify conversion on Explorer"
                        description="Confirm the transfer_public_to_private transaction."
                      />
                    </div>
                  ) : null}
                  <Button
                    variant="outline"
                    className="w-full border-amber-500/50 text-amber-200 hover:bg-amber-500/20"
                    onClick={handleConvertToPrivate}
                    disabled={status === "pending"}
                  >
                    {status === "pending"
                      ? "Converting…"
                      : `Convert ${convertAmount} credits to private`}
                  </Button>
                </div>
              )}
              {status === "pending" && (
                <div className="rounded-xl bg-neon-primary/10 border border-neon-primary/30 p-4 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="font-medium text-foreground">Processing payment</p>
                    <p className="text-sm text-gray-400">Approve the transaction in your Leo wallet</p>
                  </div>
                </div>
              )}
              <Button
                className="w-full"
                onClick={handlePay}
                disabled={status === "pending"}
              >
                {status === "pending" ? "Waiting for approval…" : "Pay Invoice"}
              </Button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
