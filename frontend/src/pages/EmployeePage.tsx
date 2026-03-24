import { useState } from "react";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import StreamCounter from "@/components/StreamCounter";
import { useEmployeeInfo, useEmployeeEarnings } from "@/hooks/usePayrollRegistry";
import type { Employee } from "@/hooks/usePayrollRegistry";
import { formatCredits, formatDate, shortenAddress } from "@/lib/constants";
import { UserCircle, Search, Wallet } from "lucide-react";

export default function EmployeePage() {
  const { address, connected } = useWallet() as any;

  const [employerInput, setEmployerInput] = useState("");
  const [employer, setEmployer] = useState<string | undefined>();

  const { data: rawEmployee, isLoading, refetch } = useEmployeeInfo(employer, address);
  const { totalEarned } = useEmployeeEarnings(address);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <UserCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-white font-serif">Connect your wallet</h2>
        <p className="text-muted-foreground text-sm">Connect as an employee to view your payroll</p>
        <WalletMultiButton />
      </div>
    );
  }

  const employee = rawEmployee as Employee | undefined;
  const isEmployed = employee?.isActive === true;

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (employerInput.startsWith("aleo1") && employerInput.length > 10) {
      setEmployer(employerInput);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-muted/20 p-6 rounded-2xl border border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white font-serif">Employee Portal</h1>
          <p className="text-muted-foreground text-xs mt-1">
            Tracking your earnings on Aleo testnet
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 font-mono uppercase tracking-widest">
            {shortenAddress(address!)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Total Lifetime Earnings</p>
          <div className="flex items-baseline gap-2 justify-end">
            <p className="text-3xl font-bold text-white font-serif tracking-tight">{formatCredits(totalEarned)}</p>
            <p className="text-xs font-medium text-muted-foreground">ALEO</p>
          </div>
        </div>
      </div>

      {/* Employer Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find Your Employer</CardTitle>
          <CardDescription>
            Enter your employer&apos;s Aleo address to view your payroll details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="aleo1 employer address..."
              value={employerInput}
              onChange={(e) => setEmployerInput(e.target.value)}
              className="font-mono text-sm"
            />
            <Button type="submit" variant="polygon">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
            <p className="text-muted-foreground">Scanning your wallet for employment records...</p>
          </CardContent>
        </Card>
      )}

      {/* Not Found */}
      {employer && !isEmployed && !isLoading && (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-center text-muted-foreground">
            No active employment record found for your wallet under{" "}
            <span className="font-mono text-sm text-white">{shortenAddress(employer)}</span>.
            <p className="mt-2 text-xs">
              Make sure your employer has added you on <b>V2</b> and your wallet is fully synced.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Employment Details */}
      {employer && isEmployed && employee && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{employee.name}</CardTitle>
                <Badge variant={employee.paymentType === 1 ? "stream" : "success"}>
                  {employee.paymentType === 1 ? "Streaming" : "Lump Sum"}
                </Badge>
              </div>
              <CardDescription>{employee.role} · Paying in ALEO</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Employer</p>
                <p className="font-mono text-xs text-white">{shortenAddress(employer)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Added</p>
                <p className="text-white">{formatDate(Number(employee.addedAt))}</p>
              </div>
              {employee.paymentType === 0 && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Salary</p>
                    <p className="font-bold text-white">
                      {formatCredits(employee.monthlySalary)} ALEO
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Paid</p>
                    <p className="text-white">
                      {employee.lastPaidAt > 0n ? formatDate(Number(employee.lastPaidAt)) : "Never"}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Streaming Claim Widget */}
          {employee.paymentType === 1 && (
            <StreamCounter
              employer={employer}
              employee={employee}
              onClaimed={() => refetch()}
            />
          )}

          {/* Lump Sum info */}
          {employee.paymentType === 0 && (
            <Card className="border-white/20 bg-white/5">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-2">Salary Verification</p>
                <p className="text-white">
                  Your salary of{" "}
                  <span className="font-bold">
                    {formatCredits(employee.monthlySalary)} ALEO
                  </span>{" "}
                  is recorded onchain. Your employer runs payroll periodically and funds are
                  transferred directly to your wallet.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  All payments are verifiable on{" "}
                  <a
                    href={`https://explorer.aleo.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline"
                  >
                    Aleo Explorer
                  </a>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
