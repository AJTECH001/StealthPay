import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Zap, Wallet } from "lucide-react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useAnalytics } from "@/hooks/usePayrollRegistry";
import { formatCredits } from "@/lib/constants";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";

export default function AnalyticsPage() {
  const { address, connected } = useWallet() as any;
  const { totalVolume, activeEmployees, activeStreams, history, creditBalance, globalTvl } = useAnalytics(address);

  const recentActivity = history.slice(0, 10);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-serif">Protocol Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time insights from the StealthPay Aleo program
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 text-xs text-white/60">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Aleo Testnet Live
        </div>
      </div>

      {/* Global TVL - Always Visible */}
      <Card className="bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border-primary/30 relative overflow-hidden group">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-primary/5 -skew-x-12 translate-x-1/2 group-hover:translate-x-1/3 transition-transform duration-700" />
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">Global Total Value Locked (TVL)</p>
              <div className="flex items-baseline gap-3">
                <h2 className="text-5xl font-bold text-white font-serif tracking-tight">{formatCredits(globalTvl)}</h2>
                <p className="text-xl font-medium text-white/40 font-serif">ALEO</p>
              </div>
              <p className="text-xs text-muted-foreground max-w-md">
                Combined balance of all company pools and unclaimed employee rewards secured by zero-knowledge proofs on Aleo.
              </p>
            </div>
            {!connected && (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center">Connect to see personal stats</p>
                <WalletMultiButton />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {connected ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                label: "Your Company Pool", 
                value: formatCredits(creditBalance), 
                unit: "ALEO",
                icon: Wallet,
                color: "text-primary"
              },
              { 
                label: "Your Disbursed Volume", 
                value: formatCredits(totalVolume), 
                unit: "ALEO",
                icon: TrendingUp,
                color: "text-green-400"
              },
              { 
                label: "Active Employees", 
                value: String(activeEmployees), 
                unit: "Users",
                icon: Users,
                color: "text-blue-400"
              },
              { 
                label: "Streams Active", 
                value: String(activeStreams), 
                unit: "Streams",
                icon: Zap,
                color: "text-yellow-400"
              },
            ].map((stat) => (
              <Card key={stat.label} className="bg-card/40 border-white/10 overflow-hidden relative group backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                  <stat.icon className="h-16 w-16" />
                </div>
                <CardContent className="p-5 relative z-10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-3xl font-bold text-white font-serif">{stat.value}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">{stat.unit}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-white/10 bg-card/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Payroll Velocity
                </CardTitle>
                <CardDescription>Activity trends from your local ledger.</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-end gap-2 px-6 pb-6">
                {[30, 60, 40, 80, 55, 75, 45, 90, 65, 85].map((h, i) => (
                  <div 
                    key={i} 
                    className="bg-primary/20 hover:bg-primary/40 transition-all duration-300 w-full rounded-t-sm"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest entries from your connected wallet.</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((tx, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-2.5 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`h-1.5 w-1.5 rounded-full ${tx.type === 'claim' ? 'bg-green-400' : 'bg-primary'}`} />
                          <div>
                            <p className="text-white font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(tx.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="font-mono text-white text-right">
                          {tx.amount ? `+ ${formatCredits(BigInt(tx.amount))}` : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-sm border-dashed border border-white/10 rounded-lg">
                    No activity detected.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="bg-muted/5 border-dashed border-white/10">
          <CardContent className="py-24 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-white/50">Company Dashboard Restricted</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              Connect your wallet as an employer or employee to unlock personalized analytics and real-time transaction history.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
