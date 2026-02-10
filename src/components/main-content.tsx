"use client";

import { useSidebar } from "@/lib/sidebar-context";
import { cn } from "@/lib/utils";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main
      className={cn(
        "min-h-screen pt-16 pb-24 lg:pt-0 lg:pb-0 bg-background transition-all duration-300 overflow-x-hidden",
        collapsed ? "lg:pl-[80px]" : "lg:pl-[288px]"
      )}
    >
      <div className="w-full max-w-5xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:py-10 lg:px-8">
        {children}
      </div>
    </main>
  );
}
