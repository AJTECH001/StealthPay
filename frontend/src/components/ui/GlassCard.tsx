import React from "react";
import { cn } from "../../utils/cn";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  hover?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  animate = true,
  hover = true,
}) => {
  return (
    <div
      className={cn(
        "relative group rounded-3xl overflow-hidden",
        "bg-[#0a0a0a] border border-white/5 shadow-2xl transition-all duration-500",
        hover && "hover:border-white/10 hover:shadow-premium hover:-translate-y-1",
        animate && "animate-in fade-in slide-in-from-bottom-4 duration-1000",
        className
      )}
    >
      {/* Premium Glass Effect Layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
      
      {/* Subtle Glow - Top Left */}
      <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-white/5 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
};

GlassCard.displayName = "GlassCard";

export { GlassCard };
