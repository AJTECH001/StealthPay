import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { TOKEN_TYPES, parseCredits } from "@/lib/constants";
import { usePayBonus } from "@/hooks/usePayrollRegistry";
import { useToast } from "@/hooks/use-toast";
import { Gift } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  employeeWallet: string;
  employeeName: string;
  tokenType: number;
  onSuccess: () => void;
}

export default function PayBonusModal({ 
  open, onClose, employeeWallet, employeeName, tokenType, onSuccess 
}: Props) {
  const { payBonus, isPending } = usePayBonus();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");

  const tokenLabel = tokenType === TOKEN_TYPES.USDCX ? "USDCX" : "ALEO";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;

    try {
      const amountBigInt = parseCredits(amount);
      await payBonus(employeeWallet, amountBigInt, tokenType);
      
      toast({ 
        title: "Bonus sent!", 
        description: `Successfully issued ${amount} ${tokenLabel} bonus to ${employeeName}.`, 
        variant: "success" 
      });
      onSuccess();
      onClose();
      setAmount("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast({ title: "Error", description: msg.slice(0, 120), variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Gift className="h-5 w-5" />
            <DialogTitle>Issue Employee Bonus</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Recipient</p>
            <p className="text-sm text-white font-medium">{employeeName}</p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">{employeeWallet}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Bonus Amount ({tokenLabel})</Label>
            <div className="relative">
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="pr-16"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                {tokenLabel}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Bonuses are one-time payments deducted immediately from your company balance.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="polygon" disabled={isPending || !amount}>
              {isPending ? "Issuing..." : "Send Bonus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
