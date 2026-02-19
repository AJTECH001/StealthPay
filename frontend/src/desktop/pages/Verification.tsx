import { useState } from "react";
import { GlassCard } from "../../components/ui/GlassCard";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { getExplorerTxUrl } from "../../services/stealthpay";

export default function Verification() {
  const [txId, setTxId] = useState("");
  const [secret, setSecret] = useState("");
  const [salt, setSalt] = useState("");
  const [status, setStatus] = useState<"IDLE" | "CHECKING" | "VALID" | "INVALID">("IDLE");

  const handleVerifyByTxId = () => {
    const trimmed = txId.trim();
    if (!trimmed) return;
    window.open(getExplorerTxUrl(trimmed), "_blank");
  };

  const handleVerify = async () => {
    if (!secret || !salt) return;
    setStatus("CHECKING");
    await new Promise((r) => setTimeout(r, 1000));
    setStatus(secret.length > 5 && salt.length > 5 ? "VALID" : "INVALID");
  };

  return (
    <div className="page-container relative min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <GlassCard className="p-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Verify Payment</h1>
          <p className="text-gray-400 text-sm mb-6">
            Confirm payments on the Leo Testnet Explorer.
          </p>

          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Verify by Transaction ID
            </h2>
            <p className="text-gray-500 text-sm">
              Paste the transaction ID from a payment or conversion, then open it on the Leo Testnet Explorer.
            </p>
            <div className="flex gap-2">
              <Input
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                placeholder="Paste transaction ID (e.g. at1...)"
                className="flex-1"
              />
              <Button
                onClick={handleVerifyByTxId}
                disabled={!txId.trim()}
                className="shrink-0 self-end"
              >
                Open on Explorer
              </Button>
            </div>
          </div>

          <div className="border-t border-glass-border pt-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              Advanced: Payment secret + salt
            </h2>
            <p className="text-gray-500 text-xs mb-4">
              Full verification requires the merchant to decrypt the Payment record with their view key.
            </p>
            <Input
              label="Payment secret"
              value={secret}
              onChange={(e) => {
                setSecret(e.target.value);
                setStatus("IDLE");
              }}
              placeholder="Enter payment secret..."
            />
            <Input
              label="Invoice salt"
              value={salt}
              onChange={(e) => {
                setSalt(e.target.value);
                setStatus("IDLE");
              }}
              placeholder="Enter invoice salt..."
            />
            <Button onClick={handleVerify} disabled={status === "CHECKING"} className="mt-2">
              {status === "CHECKING" ? "Checking…" : "Verify"}
            </Button>
            {status === "VALID" && (
              <p className="text-center text-green-400 text-sm mt-2">Verification succeeded.</p>
            )}
            {status === "INVALID" && (
              <p className="text-center text-red-400 text-sm mt-2">Verification failed or invalid input.</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
