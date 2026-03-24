import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { formatCredits, shortenAddress, formatDate, EXPLORER_TX_URL } from "@/lib/constants";
import { getTxHistory } from "@/hooks/usePayrollRegistry";
import type { TxHistoryEntry } from "@/hooks/usePayrollRegistry";
import { RefreshCw, ExternalLink } from "lucide-react";

const TYPE_LABELS: Record<TxHistoryEntry["type"], string> = {
  deposit: "Deposit",
  withdraw: "Withdraw",
  add_employee: "Hired",
  remove_employee: "Offboarded",
  claim: "Claim",
  bonus: "Bonus",
  register_company: "Registered",
};

const TYPE_VARIANTS: Record<TxHistoryEntry["type"], "success" | "stream" | "secondary" | "destructive" | "outline"> = {
  deposit: "success",
  withdraw: "outline",
  add_employee: "secondary",
  remove_employee: "destructive",
  claim: "stream",
  bonus: "success",
  register_company: "success",
};

interface Props {
  employer: string;
}

export default function PaymentHistory({ employer }: Props) {
  const [events, setEvents] = useState<TxHistoryEntry[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(() => {
    setEvents(getTxHistory(employer));
    setLastFetched(new Date());
  }, [employer]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Payment History</h3>
          {lastFetched && (
            <p className="text-xs text-muted-foreground">
              Last updated {lastFetched.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {events.length === 0 && (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No activity yet. Transactions will appear here after you register, deposit, or add employees.
          </CardContent>
        </Card>
      )}

      {events.length > 0 && (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {["Type", "Employee", "Amount", "Token", "Date", "TX"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {events.map((ev, i) => (
                <tr key={i} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant={TYPE_VARIANTS[ev.type]}>{TYPE_LABELS[ev.type]}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {ev.employee ? shortenAddress(ev.employee) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-white">
                    {ev.amount ? `${formatCredits(BigInt(ev.amount))}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground uppercase">
                    {ev.token}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(Math.floor(ev.timestamp / 1000))}
                  </td>
                  <td className="px-4 py-3">
                    {ev.txId && (
                      <a
                        href={`${EXPLORER_TX_URL}/${ev.txId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/60 hover:text-white inline-flex items-center gap-1 text-xs"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
