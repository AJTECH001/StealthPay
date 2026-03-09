import React from "react";
import { cn } from "../../utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-white text-black hover:bg-slate-12 transition-all duration-300 shadow-premium",
      secondary:
        "bg-slate-3 text-white border border-glass-border hover:bg-slate-4 hover:border-glass-border-hover transition-all duration-300",
      outline:
        "bg-transparent border border-white/20 text-white hover:bg-white/5 hover:border-white/40 transition-all duration-300",
      ghost: "bg-transparent text-slate-11 hover:text-white hover:bg-white/5 transition-all duration-300",
      glass: "bg-glass-surface backdrop-blur-md border border-glass-border text-white hover:bg-glass-highlight hover:border-glass-border-hover transition-all duration-300",
    };

    const sizes = {
      sm: "px-4 py-1.5 text-xs font-medium",
      md: "px-6 py-2.5 text-sm font-semibold",
      lg: "px-8 py-3.5 text-base font-bold tracking-tight",
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative rounded-full flex items-center justify-center gap-2 overflow-hidden active:scale-[0.98] transition-transform",
          variants[variant as keyof typeof variants] || variants.primary,
          sizes[size as keyof typeof sizes] || sizes.md,
          className
        )}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children as React.ReactNode}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
