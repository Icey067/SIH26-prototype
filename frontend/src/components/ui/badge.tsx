import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-600 text-white shadow hover:bg-blue-700",
        secondary:
          "border-transparent bg-gray-800 text-gray-200 hover:bg-gray-700",
        destructive:
          "border-transparent bg-red-600 text-white shadow hover:bg-red-700",
        outline: "text-gray-300 border-gray-700",
        success: "border-transparent bg-emerald-600 text-white",
        warning: "border-transparent bg-amber-500 text-black font-bold",
        critical: "border-red-500 bg-red-950/80 text-red-300 animate-pulse border",
        tms: "border-blue-500/50 bg-blue-950/60 text-blue-300",
        smms: "border-emerald-500/50 bg-emerald-950/60 text-emerald-300",
        tdms: "border-purple-500/50 bg-purple-950/60 text-purple-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
