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
        "bg-gradient-to-r from-neon-primary to-neon-accent text-white font-bold border-none hover:shadow-[0_0_20px_rgba(0,0,0,0.25)]",
      secondary:
        "bg-black/5 text-foreground border border-glass-border hover:bg-black/10 hover:border-glass-border-hover",
      outline:
        "bg-transparent border border-neon-primary/50 text-neon-primary hover:bg-neon-primary/10",
      ghost: "bg-transparent text-gray-500 hover:text-foreground hover:bg-black/5",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative rounded-xl flex items-center justify-center gap-2 overflow-hidden",
          variants[variant],
          sizes[size],
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
