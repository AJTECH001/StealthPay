import React from "react";
import { cn } from "../../utils/cn";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "heavy" | "default" | "light";
  hoverEffect?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, variant = "default", hoverEffect = true, ...props }, ref) => {
    const variants = {
      default:
        "bg-glass-surface backdrop-blur-xl border border-glass-border shadow-glass hover:shadow-glass-hover",
      heavy:
        "bg-white/95 backdrop-blur-2xl border border-glass-border shadow-2xl",
      light:
        "bg-glass-surface backdrop-blur-lg border border-glass-border shadow-lg",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-3xl relative overflow-hidden",
          variants[variant],
          hoverEffect && "hover:border-glass-border-hover",
          className
        )}
        {...props}
      >
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
