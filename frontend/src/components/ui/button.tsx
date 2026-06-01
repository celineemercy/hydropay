import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        ghost: "text-slate-500 hover:bg-white hover:text-slate-800",
        segment: "rounded-full px-4 py-2.5 text-slate-500 hover:bg-white hover:text-slate-800",
        segmentActive: "rounded-full bg-cyan-100 px-4 py-2.5 text-slate-950 shadow-sm",
        filter: "w-full justify-between rounded-xl px-3 py-2.5 text-left text-slate-500 hover:bg-slate-50 hover:text-slate-900",
        filterActive: "w-full justify-between rounded-xl bg-blue-50 px-3 py-2.5 text-left text-blue-700",
        chip: "rounded-full px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-800",
        chipActive: "rounded-full bg-blue-50 px-3 py-1.5 text-xs text-blue-700 ring-1 ring-blue-100",
        linkCoral: "h-auto rounded-none p-0 text-rose-800 hover:text-rose-950",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "size-10",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
