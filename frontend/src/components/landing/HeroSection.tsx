import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pt-24 pb-32 sm:pt-36 sm:pb-40">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center space-y-8">
        <Badge variant="outline" className="text-white/60 border-white/20 px-4 py-1 text-xs tracking-widest uppercase">
          Live on Aleo Testnet · stealthpay_payroll_v3.aleo
        </Badge>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white font-serif leading-[1.05]">
          Institutional Payroll.{" "}
          <span className="text-white/40">Zero Exposure.</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          StealthPay is the first privacy-native payroll protocol built on Aleo.
          Run global payroll on-chain without broadcasting salary data to the world.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="polygon" size="lg" className="gap-2 px-8">
            <Link to="/employer">
              Launch as Employer <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 px-8">
            <Link to="/employee">
              Employee Portal <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/60 pt-2">
          No sign-up. Connect your Shield wallet and start in 60 seconds.
        </p>
      </div>
    </section>
  );
}
