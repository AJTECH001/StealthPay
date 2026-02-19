import { cn } from "../../utils/cn";

interface ShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Shimmer({ className, width, height }: ShimmerProps) {
  return (
    <div
      className={cn("bg-white/5 rounded-md", className)}
      style={{ width, height }}
    />
  );
}
