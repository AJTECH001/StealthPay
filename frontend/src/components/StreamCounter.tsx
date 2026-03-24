import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { formatCredits, BLOCKS_PER_HOUR } from "@/lib/constants";
import type { Employee } from "@/hooks/usePayrollRegistry";
import { useClaimStream } from "@/hooks/usePayrollRegistry";
import { useToast } from "@/hooks/use-toast";

interface Props {
  employer: string;
  employee: Employee;
  onClaimed: () => void;
}

// Aleo testnet ≈ 5 s/block. Approximate elapsed blocks from elapsed seconds.
const SECS_PER_BLOCK = 5n;

export default function StreamCounter({ employer, employee, onClaimed }: Props) {
  const { claimStream, isPending } = useClaimStream();
  const { toast } = useToast();

  const [claimable, setClaimable] = useState<bigint>(0n);

  useEffect(() => {
    function calculate() {
      // streamStartedAt is stored as unix ms (from localStorage addedAt).
      const startedMs = employee.streamStartedAt;
      const nowMs = BigInt(Date.now());
      const elapsedMs = nowMs > startedMs ? nowMs - startedMs : 0n;
      const elapsedBlocks = elapsedMs / (SECS_PER_BLOCK * 1000n);
      // streamRate = microcredits per block (contract definition)
      const totalEarned = elapsedBlocks * employee.streamRate;
      const unclaimed = totalEarned > employee.streamClaimedAmount
        ? totalEarned - employee.streamClaimedAmount
        : 0n;
      setClaimable(unclaimed);
    }
    calculate();
    const id = setInterval(calculate, 5000); // refresh every block
    return () => clearInterval(id);
  }, [employee.streamRate, employee.streamStartedAt, employee.streamClaimedAmount]);

  async function handleClaim() {
    try {
      await claimStream(employer, claimable, employee.tokenType);
      toast({ title: "Stream claimed!", description: "Credits sent to your wallet.", variant: "success" });
      onClaimed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast({ title: "Error", description: msg.slice(0, 120), variant: "destructive" });
    }
  }

  // streamRate is per block; 720 blocks ≈ 1 hour
  const ratePerHour = (Number(employee.streamRate) / 1_000_000) * Number(BLOCKS_PER_HOUR);

  return (
    <Card className="border-white/20 bg-white/5">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Accrued &amp; Claimable
            </p>
            <div className="text-4xl font-bold text-white tabular-nums font-serif">
              {formatCredits(claimable)}
            </div>
            <p className="text-sm text-white/60 mt-1">
              {employee.tokenType === 1 ? "USDCX" : "ALEO"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              ~{ratePerHour.toFixed(4)} {employee.tokenType === 1 ? "USDCX" : "ALEO"}/hr — streaming live
            </p>
          </div>

          <Button
            variant="polygon"
            size="lg"
            onClick={handleClaim}
            disabled={isPending || claimable === 0n}
          >
            {isPending ? "Claiming..." : "Claim Now"}
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Stream Rate</p>
            <p className="font-medium text-white font-mono text-xs">
              {employee.streamRate.toString()} μcredits/block
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Claimed</p>
            <p className="font-medium text-white">
              {formatCredits(employee.streamClaimedAmount)} {employee.tokenType === 1 ? "USDCX" : "ALEO"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
