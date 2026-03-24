import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PAYMENT_TYPES, TOKEN_TYPES, parseCredits, monthlyToStreamRate } from "@/lib/constants";
import { useAddEmployee } from "@/hooks/usePayrollRegistry";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddEmployeeModal({ open, onClose, onSuccess }: Props) {
  const { addEmployee, isPending } = useAddEmployee();
  const { toast } = useToast();

  const [form, setForm] = useState({
    wallet: "",
    name: "",
    role: "",
    paymentType: "0",
    tokenType: "0",
    salary: "",
  });

  const isStreaming = form.paymentType === String(PAYMENT_TYPES.STREAMING);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.wallet || !form.name || !form.role || !form.salary) return;

    try {
      // For lump-sum: salary = total per payroll interval (microcredits).
      // For streaming: salary = per-block accrual rate (microcredits/block).
      const salary = isStreaming
        ? monthlyToStreamRate(form.salary)
        : parseCredits(form.salary);

      await addEmployee(
        form.wallet,
        form.name,
        form.role,
        salary,
        0n,
        Number(form.paymentType),
        Number(form.tokenType),
      );

      toast({ title: "Employee added", description: `${form.name} added successfully.`, variant: "success" });
      onSuccess();
      onClose();
      setForm({ wallet: "", name: "", role: "", paymentType: "0", tokenType: "0", salary: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      toast({ title: "Error", description: msg.slice(0, 120), variant: "destructive" });
    }
  }

  const tokenLabel = form.tokenType === String(TOKEN_TYPES.USDCX) ? "USDCX" : "ALEO";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Aleo Address</Label>
            <Input
              placeholder="aleo1..."
              value={form.wallet}
              onChange={(e) => setForm({ ...form, wallet: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="Alice Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role / Title</Label>
              <Input
                placeholder="Engineer"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment Type</Label>
              <Select value={form.paymentType} onValueChange={(v) => setForm({ ...form, paymentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Lump Sum</SelectItem>
                  <SelectItem value="1">Streaming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Token</Label>
              <Select value={form.tokenType} onValueChange={(v) => setForm({ ...form, tokenType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">ALEO Credits</SelectItem>
                  <SelectItem value="1">USDCX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              {isStreaming
                ? `Monthly Equivalent (${tokenLabel}) — converted to per-block rate`
                : `Salary per Payroll Interval (${tokenLabel})`}
            </Label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 100"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
              required
            />
            {isStreaming && form.salary && (
              <p className="text-xs text-muted-foreground">
                Rate: {monthlyToStreamRate(form.salary).toString()} microcredits/block
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Salary is stored as a private commitment on-chain — not visible publicly.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="polygon" disabled={isPending}>
              {isPending ? "Confirming..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
