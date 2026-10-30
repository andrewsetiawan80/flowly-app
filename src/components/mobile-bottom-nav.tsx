"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Inbox, Folder, BookOpen, Home, ListTodo, CalendarDays, Calendar, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/myday", icon: CalendarDays, label: "Today" },
  { href: "/inbox", icon: Inbox, label: "Inbox" },
  { href: "/projects", icon: Folder, label: "Projects" },
  { href: "/notes", icon: BookOpen, label: "Notes" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Quick navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-black/5 dark:border-white/5 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/projects" && pathname.startsWith("/lists/")) || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] px-3 py-2 rounded-xl transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-xs font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
