"use client";

import { useEffect, useState } from "react";
import { Task } from "@prisma/client";
import { Sparkles, Search, Filter, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

type TaskWithList = Task & {
  list?: { name: string; color: string | null };
};

export function SuggestionsSidebar() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Only fetch if session is authenticated
    if (status === "authenticated") {
      fetchTasks();
    }
  }, [status]);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        // Show overdue tasks as suggestions
        const overdueTasks = data.tasks.filter(
          (task: TaskWithList) =>
            task.dueAt &&
            new Date(task.dueAt) < new Date() &&
            task.status !== "DONE"
        );
        setTasks(overdueTasks || []);
      } else if (res.status === 401) {
        // User not authenticated, don't show error
        setTasks([]);
      }
    } catch (error) {
      // Silently fail - user might not be authenticated yet
      setTasks([]);
    }
  };

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="fixed right-0 top-0 z-20 h-screen w-80 xl:w-96 glass-sidebar border-l border-black/[0.04] dark:border-white/[0.04] overflow-y-auto">
      <div className="p-6 space-y-6">
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10">
              <Sparkles className="h-4 w-4 text-orange-500" />
            </div>
            <h2 className="text-base font-bold">Suggestions</h2>
          </div>
          <motion.button 
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Filter className="h-4 w-4" />
          </motion.button>
        </motion.div>

        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <Input
            placeholder="Search suggestions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm bg-white/50 dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] focus:border-orange-500/30 focus-visible:ring-orange-500/20 rounded-xl"
          />
        </motion.div>

        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatePresence>
            {filteredTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.02]">
                  <CardContent className="p-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No suggestions available
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      You're all caught up!
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredTasks.map((task, index) => (
                <motion.div 
                  key={task.id} 
                  className="space-y-1.5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <p className="text-[11px] text-muted-foreground/60 px-1 font-medium uppercase tracking-wider">
                    {task.list?.name || "Default"}
                  </p>
                  <motion.div whileHover={{ scale: 1.01, x: 4 }}>
                    <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.02] hover:border-orange-500/20 hover:bg-white/60 dark:hover:bg-white/[0.03] transition-all duration-200 cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-1.5 rounded-lg bg-red-500/10">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight line-clamp-2">
                              {task.title}
                            </p>
                            <p className="text-[11px] text-red-500 mt-1.5 font-medium">
                              Overdue · {task.dueAt && format(new Date(task.dueAt), "MMM d")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </aside>
  );
}
