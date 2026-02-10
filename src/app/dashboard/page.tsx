"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Task, Priority, Status } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2, Clock, AlertCircle, TrendingUp, Flame,
  ChevronRight, Calendar, Flag, Plus, ArrowRight,
  Sparkles, Target, ListTodo, BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast-provider";
import { useGlobal } from "@/components/global-providers";
import { triggerRefresh } from "@/lib/events";

type TaskWithList = Task & {
  list?: { id: string; name: string; color: string | null };
};

const priorityColors = {
  LOW: "text-blue-500",
  MEDIUM: "text-amber-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showUndoToast } = useToast();
  const { openTaskForm } = useGlobal();
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskWithList | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Quick-add state
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  const fetchTasks = useCallback(async () => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    try {
      const [tasksRes, listsRes] = await Promise.all([
        fetch("/api/tasks", { credentials: "include" }),
        fetch("/api/lists", { credentials: "include" }),
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
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTasks();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, fetchTasks]);

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim() || !lists[0]) return;
    setQuickAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: quickAddTitle.trim(), listId: lists[0].id }),
      });
      if (res.ok) {
        setQuickAddTitle("");
        await fetchTasks();
        triggerRefresh("TASKS");
      }
    } catch (error) {
      console.error("Quick add failed:", error);
    } finally {
      setQuickAdding(false);
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: completed ? "DONE" as Status : "TODO" as Status } : t
    ));

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: taskId, status: completed ? "DONE" : "TODO" }),
      });

      if (res.ok && completed) {
        showUndoToast(`"${task.title}" completed`, async () => {
          await fetch("/api/tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: taskId, status: "TODO" }),
          });
          await fetchTasks();
        });
      }
      triggerRefresh("TASKS");
    } catch (error) {
      console.error("Failed to toggle task:", error);
      await fetchTasks();
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: taskId, ...data }),
      });
      if (res.ok) {
        await fetchTasks();
        if (selectedTask?.id === taskId) {
          const updated = tasks.find(t => t.id === taskId);
          if (updated) setSelectedTask({ ...updated, ...data } as TaskWithList);
        }
        triggerRefresh("TASKS");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: taskId }),
      });
      if (res.ok) {
        setDetailOpen(false);
        setSelectedTask(null);
        await fetchTasks();
        triggerRefresh("TASKS");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const openTaskDetail = (task: TaskWithList) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton loading */}
        <div className="space-y-3">
          <div className="h-8 w-64 bg-black/5 dark:bg-white/5 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-black/5 dark:bg-white/5 rounded-lg animate-pulse" />
        </div>
        <div className="h-12 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-16 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
          <div className="h-64 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const pendingTasks = tasks.filter((t) => t.status !== "DONE").length;
  const overdueTasks = tasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "DONE"
  );
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const todayTasks = tasks.filter((t) => {
    if (!t.dueAt || t.status === "DONE") return false;
    const due = new Date(t.dueAt);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  });

  const upcomingTasks = tasks
    .filter((t) => t.status !== "DONE")
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, 5);

  const recentlyCompleted = tasks
    .filter((t) => t.status === "DONE")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const userName = session?.user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Header with Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {getGreeting()}, <span className="text-primary">{userName}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {pendingTasks === 0
            ? "You're all caught up! Great job."
            : `You have ${pendingTasks} task${pendingTasks !== 1 ? "s" : ""} pending${overdueTasks.length > 0 ? ` and ${overdueTasks.length} overdue` : ""}.`}
        </p>
      </motion.div>

      {/* Quick Add */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
              placeholder="Quick add a task..."
              className="pl-10 h-11 bg-black/[0.02] dark:bg-white/[0.02]"
              disabled={quickAdding || lists.length === 0}
            />
          </div>
          <Button
            onClick={handleQuickAdd}
            disabled={!quickAddTitle.trim() || quickAdding || lists.length === 0}
            className="h-11 px-5 bg-primary hover:bg-primary/90"
          >
            Add
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total", value: totalTasks, icon: Target, color: "text-blue-500", bg: "bg-blue-500/10" },
          { title: "Done", value: completedTasks, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { title: "Pending", value: pendingTasks, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { title: "Overdue", value: overdueTasks.length, icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
          >
            <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Completion Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-lg font-bold text-primary">{completionRate}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.04]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Nav Shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { href: "/board", label: "Board", icon: ListTodo, color: "text-violet-500", bg: "bg-violet-500/10" },
          { href: "/table", label: "Table", icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" },
          { href: "/calendar", label: "Calendar", icon: Calendar, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { href: "/stats", label: "Statistics", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer group">
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className={cn("p-1.5 rounded-lg", item.bg)}>
                  <item.icon className={cn("h-4 w-4", item.color)} />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </motion.div>

      {/* Task Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="h-6 w-1 bg-primary rounded-full" />
                  Upcoming
                </CardTitle>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {upcomingTasks.length === 0 ? (
                <EmptyState
                  type="tasks"
                  title="No pending tasks"
                  description="You're all caught up!"
                  action={{ label: "New Task", onClick: openTaskForm }}
                />
              ) : (
                <AnimatePresence>
                  {upcomingTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.03 }}
                      className="group"
                    >
                      <div
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => openTaskDetail(task)}
                      >
                        <Checkbox
                          checked={task.status === "DONE"}
                          onCheckedChange={(checked) => handleToggleTask(task.id, checked === true)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 h-4.5 w-4.5 rounded-md border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm truncate",
                            task.status === "DONE" && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            {task.dueAt && (
                              <span className={cn(
                                "flex items-center gap-0.5",
                                new Date(task.dueAt) < new Date() && task.status !== "DONE" && "text-red-500"
                              )}>
                                <Calendar className="h-2.5 w-2.5" />
                                {format(new Date(task.dueAt), "MMM d")}
                              </span>
                            )}
                            <span className={cn("flex items-center gap-0.5", priorityColors[task.priority])}>
                              <Flag className="h-2.5 w-2.5" />
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <Card className="border-red-500/20 bg-red-500/5 dark:bg-red-500/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  Overdue ({overdueTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {overdueTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/50 dark:bg-white/5 cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                    onClick={() => openTaskDetail(task)}
                  >
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => handleToggleTask(task.id, true)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-2 border-red-500/50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {format(new Date(task.dueAt!), "MMM d")}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recently Completed */}
          <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="h-5 w-1 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full" />
                Recently Done
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentlyCompleted.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No completed tasks yet</p>
              ) : (
                recentlyCompleted.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => openTaskDetail(task)}
                  >
                    <div className="h-4 w-4 rounded bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                    </div>
                    <p className="font-medium text-sm line-through text-muted-foreground truncate flex-1">
                      {task.title}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Achievement */}
      <AnimatePresence>
        {completionRate >= 80 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-green-500/5">
              <CardContent className="flex items-center gap-4 py-4">
                <Sparkles className="h-8 w-8 text-emerald-500 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-300">Great Progress!</h3>
                  <p className="text-xs text-muted-foreground">
                    You've completed {completionRate}% of your tasks. Keep it up!
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={selectedTask}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedTask(null); }}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        lists={lists}
      />
    </div>
  );
}
