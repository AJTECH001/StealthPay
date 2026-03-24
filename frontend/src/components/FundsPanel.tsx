import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCredits, parseCredits, TOKEN_TYPES } from "@/lib/constants";
import { useDepositFunds, useWithdrawFunds, useDeposit } from "@/hooks/usePayrollRegistry";
import { useToast } from "@/hooks/use-toast";

interface Props {
  employer: string;
  onSuccess: () => void;
}

export default function FundsPanel({ employer, onSuccess }: Props) {
  const { toast } = useToast();
  const { deposit, isPending: isDepositing } = useDepositFunds();
  const { withdraw, isPending: isWithdrawing } = useWithdrawFunds();
  const { data: creditsBalance, usdcxBalance, refetch } = useDeposit(employer);

  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [depositToken, setDepositToken] = useState("0");
  const [withdrawToken, setWithdrawToken] = useState("0");

  const depositIsUsdcx = depositToken === String(TOKEN_TYPES.USDCX);
  const withdrawIsUsdcx = withdrawToken === String(TOKEN_TYPES.USDCX);
  const withdrawBalance = withdrawIsUsdcx ? usdcxBalance : creditsBalance;

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositAmt) return;
    const tokenType = Number(depositToken);
    const label = tokenType === TOKEN_TYPES.USDCX ? "USDCX" : "ALEO";
    try {
      const amount = parseCredits(depositAmt);
      await deposit(amount, tokenType);
      toast({ title: "Funds deposited", description: `${depositAmt} ${label} added to payroll pool.`, variant: "success" });
      setDepositAmt("");
      refetch();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast({ title: "Error", description: msg.slice(0, 120), variant: "destructive" });
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!withdrawAmt) return;
    const tokenType = Number(withdrawToken);
    const label = tokenType === TOKEN_TYPES.USDCX ? "USDCX" : "ALEO";
    try {
      const amount = parseCredits(withdrawAmt);
      await withdraw(amount, tokenType);
      toast({ title: `${label} withdrawn`, variant: "success" });
      setWithdrawAmt("");
      refetch();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast({ title: "Error", description: msg.slice(0, 120), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      {/* Balances */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white/5 border-white/20">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ALEO Balance</span>
            <span className="font-bold text-white text-lg">{formatCredits(creditsBalance ?? 0n)}</span>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/20">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">USDCX Balance</span>
            <span className="font-bold text-white text-lg">{formatCredits(usdcxBalance ?? 0n)}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Deposit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Deposit Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeposit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Token</Label>
                <Select value={depositToken} onValueChange={setDepositToken}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">ALEO Credits</SelectItem>
                    <SelectItem value="1">USDCX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount ({depositIsUsdcx ? "USDCX" : "ALEO"})</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={depositAmt}
                  onChange={(e) => setDepositAmt(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="polygon" className="w-full" disabled={isDepositing}>
                {isDepositing ? "Depositing..." : `Deposit ${depositIsUsdcx ? "USDCX" : "ALEO"}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Withdraw */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Withdraw Funds</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdraw} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Token</Label>
                <Select value={withdrawToken} onValueChange={setWithdrawToken}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">ALEO Credits</SelectItem>
                    <SelectItem value="1">USDCX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount ({withdrawIsUsdcx ? "USDCX" : "ALEO"})</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={withdrawAmt}
                  onChange={(e) => setWithdrawAmt(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Available: {formatCredits(withdrawBalance ?? 0n)} {withdrawIsUsdcx ? "USDCX" : "ALEO"}
                </p>
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={isWithdrawing}>
                {isWithdrawing ? "Confirming..." : "Withdraw"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
