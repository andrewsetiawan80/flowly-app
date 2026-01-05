"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Calendar,
  CalendarDays,
  List,
  CheckCircle2,
  Moon,
  Sun,
  LogOut,
  Settings,
  Gem,
  Flame,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  onCreateTask?: () => void;
}

export function CommandPalette({ onCreateTask }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; listId: string }>>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);

  // Toggle command palette with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // Also allow Escape to close
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch data when opened
  useEffect(() => {
    if (open && session) {
      fetchData();
    }
  }, [open, session]);

  const fetchData = async () => {
    try {
      const [tasksRes, listsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/lists"),
      ]);
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
      if (listsRes.ok) {
        const data = await listsRes.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Trigger hint */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <Search className="h-3 w-3" />
        <span>Search...</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/10 dark:bg-white/10 rounded">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Command Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2"
            >
              <Command
                className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
                loop
              >
                <div className="flex items-center gap-3 px-4 border-b border-black/5 dark:border-white/5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Type a command or search..."
                    className="flex-1 h-14 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                <Command.List className="max-h-[400px] overflow-y-auto p-2">
                  <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                    No results found.
                  </Command.Empty>

                  {/* Quick Actions */}
                  <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Command.Item
                      onSelect={() => runCommand(() => onCreateTask?.())}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-orange-500/10 aria-selected:text-orange-600 dark:aria-selected:text-orange-400"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                        <Plus className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">New Task</span>
                      <kbd className="ml-auto text-[10px] px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded font-mono">N</kbd>
                    </Command.Item>
                  </Command.Group>

                  {/* Navigation */}
                  <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                    <Command.Item
                      onSelect={() => runCommand(() => router.push("/dashboard"))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-orange-500/10 aria-selected:text-orange-600 dark:aria-selected:text-orange-400"
                    >
                      <Flame className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Command.Item>
                    <Command.Item
                      onSelect={() => runCommand(() => router.push("/tasks"))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-orange-500/10 aria-selected:text-orange-600 dark:aria-selected:text-orange-400"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>All Tasks</span>
                    </Command.Item>
                    <Command.Item
                      onSelect={() => runCommand(() => router.push("/myday"))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-orange-500/10 aria-selected:text-orange-600 dark:aria-selected:text-orange-400"
                    >
                      <CalendarDays className="h-4 w-4" />
                      <span>My Day</span>
                    </Command.Item>
                    <Command.Item
                      onSelect={() => runCommand(() => router.push("/today"))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-orange-500/10 aria-selected:text-orange-600 dark:aria-selected:text-orange-400"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Next 7 Days</span>
                    </Command.Item>
                    <Command.Item
                      onSelect={() => runCommand(() => router.push("/premium"))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-orange-500/10 aria-selected:text-orange-600 dark:aria-selected:text-orange-400"
                    >
                      <Gem className="h-4 w-4" />
                      <span>Go Premium</span>
                    </Command.Item>
                  </Command.Group>

                  {/* Lists */}
                  {lists.length > 0 && (
                    <Command.Group heading="Lists" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                      {lists.map((list) => (
                        <Command.Item
                          key={list.id}
                          onSelect={() => runCommand(() => router.push(`/lists/${list.id}`))}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-orange-500/10 aria-selected:text-orange-600 dark:aria-selected:text-orange-400"
                        >
                          <List className="h-4 w-4" />
                          <span>{list.name}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Search Results */}
                  {search && filteredTasks.length > 0 && (
                    <Command.Group heading="Tasks" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                      {filteredTasks.slice(0, 5).map((task) => (
                        <Command.Item
                          key={task.id}
                          onSelect={() => runCommand(() => router.push(`/tasks?task=${task.id}`))}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-orange-500/10 aria-selected:text-orange-600 dark:aria-selected:text-orange-400"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="truncate">{task.title}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {/* Settings */}
                  <Command.Group heading="Settings" className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                    <Command.Item
                      onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-orange-500/10 aria-selected:text-orange-600 dark:aria-selected:text-orange-400"
                    >
                      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      <span>Toggle {theme === "dark" ? "Light" : "Dark"} Mode</span>
                    </Command.Item>
                    <Command.Item
                      onSelect={() => runCommand(() => signOut({ callbackUrl: "/signin" }))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm text-red-600 dark:text-red-400 aria-selected:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </Command.Item>
                  </Command.Group>
                </Command.List>

                <div className="flex items-center justify-between px-4 py-3 border-t border-black/5 dark:border-white/5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded font-mono">↑↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded font-mono">↵</kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded font-mono">Esc</kbd>
                      Close
                    </span>
                  </div>
                </div>
              </Command>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

