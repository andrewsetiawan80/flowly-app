import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/35 active:scale-[0.98] border-0":
              variant === "default",
            "bg-red-500 text-white shadow-md shadow-red-500/20 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30 active:scale-[0.98]":
              variant === "destructive",
            "border border-black/[0.08] dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] backdrop-blur-sm hover:bg-white/80 dark:hover:bg-white/[0.04] hover:border-primary/20 active:scale-[0.98]":
              variant === "outline",
            "bg-black/[0.03] dark:bg-white/[0.03] backdrop-blur-sm text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06] active:scale-[0.98]":
              variant === "secondary",
            "hover:bg-black/[0.03] dark:hover:bg-white/[0.03] hover:text-foreground active:scale-[0.98]": variant === "ghost",
            "text-primary underline-offset-4 hover:underline": variant === "link",
            "h-10 px-5 py-2": size === "default",
            "h-9 rounded-lg px-3.5 text-[13px]": size === "sm",
            "h-12 rounded-xl px-8 text-base": size === "lg",
            "h-10 w-10 rounded-xl": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
