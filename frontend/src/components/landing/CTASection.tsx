import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CTASection() {
  return (
    <section className="py-28 px-4 border-t border-white/10 text-center">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-4xl sm:text-5xl font-bold text-white font-serif">
          Run your first private payroll today
        </h2>
        <p className="text-muted-foreground text-lg">
          Connect your Shield wallet, register your company, and pay your team
          on-chain — with full ZK privacy — in under five minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="polygon" size="lg" className="gap-2 px-8">
            <Link to="/employer">
              Start as Employer <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8">
            <Link to="/analytics">View Analytics</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
