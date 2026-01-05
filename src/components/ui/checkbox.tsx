"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-md border-2 border-border/60 ring-offset-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "transition-all duration-200",
      "hover:border-sky-500/50 hover:shadow-sm hover:shadow-sky-500/20",
      "data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-sky-500 data-[state=checked]:to-cyan-500",
      "data-[state=checked]:border-sky-500 data-[state=checked]:text-white",
      "data-[state=checked]:shadow-md data-[state=checked]:shadow-sky-500/30",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
      asChild
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      >
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </motion.div>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
