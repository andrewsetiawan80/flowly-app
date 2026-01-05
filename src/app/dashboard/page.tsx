"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Task, Priority, Status } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Flame, ChevronRight, Calendar, Flag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast-provider";
import { useGlobal } from "@/components/global-providers";

type TaskWithList = Task & {
  list?: { id: string; name: string; color: string | null };
};

const priorityColors = {
  LOW: "text-blue-500",
  MEDIUM: "text-amber-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  const fetchTasks = async () => {
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
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchTasks();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: completed ? "DONE" : "TODO" } : t
    ));

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: taskId,
          status: completed ? "DONE" : "TODO",
        }),
      });

      if (res.ok && completed) {
        showUndoToast(`"${task.title}" completed`, async () => {
          // Undo the completion
          await fetch("/api/tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: taskId, status: "TODO" }),
          });
          await fetchTasks();
        });
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
      await fetchTasks(); // Revert on error
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
        // Update selected task if it's the one being edited
        if (selectedTask?.id === taskId) {
          const updated = tasks.find(t => t.id === taskId);
          if (updated) setSelectedTask({ ...updated, ...data } as TaskWithList);
        }
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

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
      <div className="flex h-64 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3"
        >
          <div className="h-5 w-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <span className="text-muted-foreground font-medium">Loading dashboard...</span>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const pendingTasks = tasks.filter((t) => t.status !== "DONE").length;
  const overdueTasks = tasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "DONE"
  );
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get upcoming tasks (not done, sorted by due date)
  const upcomingTasks = tasks
    .filter((t) => t.status !== "DONE")
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, 5);

  // Get recently completed tasks
  const recentlyCompleted = tasks
    .filter((t) => t.status === "DONE")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const stats = [
    {
      title: "Total Tasks",
      value: totalTasks,
      icon: TrendingUp,
      iconBg: "from-blue-500 to-blue-600",
    },
    {
      title: "Completed",
      value: completedTasks,
      icon: CheckCircle2,
      iconBg: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Pending",
      value: pendingTasks,
      icon: Clock,
      iconBg: "from-amber-500 to-amber-600",
    },
    {
      title: "Overdue",
      value: overdueTasks.length,
      icon: AlertCircle,
      iconBg: "from-red-500 to-red-600",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 dark:from-orange-400 dark:via-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              Dashboard
            </span>
          </h1>
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1.1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 5
            }}
          >
            <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-orange-500" />
          </motion.div>
        </div>
        <p className="text-muted-foreground font-medium">
          Welcome back! Here's your task overview.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <Card className="relative overflow-hidden border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                        {stat.title}
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`rounded-xl p-2 sm:p-2.5 bg-gradient-to-br ${stat.iconBg} shadow-lg`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Completion Progress</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
                {completionRate}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.04]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 rounded-full"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Task Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-3">
                  <div className="h-8 w-1 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full" />
                  Upcoming Tasks
                </CardTitle>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingTasks.length === 0 ? (
                <EmptyState
                  type="tasks"
                  title="No pending tasks"
                  description="You're all caught up! Create a new task to get started."
                  action={{
                    label: "New Task",
                    onClick: openTaskForm,
                  }}
                />
              ) : (
                <AnimatePresence>
                  {upcomingTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.05 }}
                      className="group"
                    >
                      <div 
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => openTaskDetail(task)}
                      >
                        <Checkbox
                          checked={task.status === "DONE"}
                          onCheckedChange={(checked) => {
                            handleToggleTask(task.id, checked === true);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 h-5 w-5 rounded-md border-2 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-orange-500 data-[state=checked]:to-amber-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm truncate",
                            task.status === "DONE" && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {task.dueAt && (
                              <span className={cn(
                                "flex items-center gap-1",
                                new Date(task.dueAt) < new Date() && task.status !== "DONE" && "text-red-500"
                              )}>
                                <Calendar className="h-3 w-3" />
                                {format(new Date(task.dueAt), "MMM d")}
                              </span>
                            )}
                            <span className={cn("flex items-center gap-1", priorityColors[task.priority])}>
                              <Flag className="h-3 w-3" />
                              {task.priority}
                            </span>
                            {task.list && (
                              <span className="flex items-center gap-1">
                                <div 
                                  className="h-2 w-2 rounded-full" 
                                  style={{ backgroundColor: task.list.color || "#f97316" }}
                                />
                                {task.list.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Overdue & Recently Completed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="space-y-6"
        >
          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <Card className="border-red-500/20 bg-red-500/5 dark:bg-red-500/10 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-3 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  Overdue Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdueTasks.slice(0, 3).map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                  >
                    <div 
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                      onClick={() => openTaskDetail(task)}
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => handleToggleTask(task.id, true)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 h-5 w-5 rounded-md border-2 border-red-500/50"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due {format(new Date(task.dueAt!), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recently Completed */}
          <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="h-8 w-1 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full" />
                Recently Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentlyCompleted.length === 0 ? (
                <EmptyState
                  type="completed"
                  title="No completed tasks"
                  description="Complete a task to see it here!"
                />
              ) : (
                recentlyCompleted.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.05 }}
                  >
                    <div 
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => openTaskDetail(task)}
                    >
                      <div className="h-5 w-5 rounded-md bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                      <p className="font-medium text-sm line-through text-muted-foreground truncate flex-1">
                        {task.title}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Achievement Badge */}
      <AnimatePresence>
        {completionRate >= 80 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-green-500/5 to-emerald-500/5 backdrop-blur-sm">
              <CardContent className="flex items-center gap-5 py-5">
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 10, 0],
                    scale: [1, 1.1, 1.1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="text-4xl sm:text-5xl"
                >
                  🎉
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">
                    Great Progress!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You've completed {completionRate}% of your tasks. Keep up the excellent work!
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
        onClose={() => {
          setDetailOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        lists={lists}
      />
    </div>
  );
}
