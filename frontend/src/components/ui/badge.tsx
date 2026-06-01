import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        failed: "border-rose-200 bg-rose-50 text-rose-700",
        live: "gap-2 rounded-full border-teal-200 bg-teal-50 px-3.5 py-1.5 text-sm text-teal-800",
        count: "rounded-full border-blue-100 bg-blue-50 px-3.5 py-1.5 text-sm text-blue-700",
        active: "gap-1.5 rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700",
        statusSuccess:
          "gap-2 rounded-full border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-sm text-emerald-700",
        statusFailed:
          "gap-2 rounded-full border-rose-100 bg-rose-50 px-3.5 py-1.5 text-sm text-rose-700",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
