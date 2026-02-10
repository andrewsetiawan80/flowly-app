"use client";

import { themePresets } from "@/lib/themes";
import { useAccentTheme } from "@/components/theme-provider";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ThemeSelectorProps {
  compact?: boolean;
}

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { accentId, setAccentTheme } = useAccentTheme();

  return (
    <div className={cn(
      "flex flex-wrap gap-2",
      compact ? "gap-1.5" : "gap-3"
    )}>
      {themePresets.map((theme) => {
        const isActive = accentId === theme.id;
        return (
          <motion.button
            key={theme.id}
            onClick={() => setAccentTheme(theme.id)}
            className={cn(
              "relative rounded-full transition-all duration-200",
              compact ? "h-6 w-6" : "h-9 w-9",
              isActive && "ring-2 ring-offset-2 ring-offset-background",
            )}
            style={{
              backgroundColor: theme.hex,
              ...(isActive ? { boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${theme.hex}` } : {}),
            }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            title={theme.name}
          >
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Check className={cn(
                  "text-white",
                  compact ? "h-3 w-3" : "h-4 w-4"
                )} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
