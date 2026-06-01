import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  indicatorClassName?: string;
  value: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, indicatorClassName, value, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-all", indicatorClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  ),
);
Progress.displayName = "Progress";

export { Progress };
