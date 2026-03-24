import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface Props {
  employer: string;
}

export default function PayrollStatusCard({ employer: _ }: Props) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="font-medium text-sm text-white">
            Payroll is employee-driven
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            — employees claim their own salary directly from the contract
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
