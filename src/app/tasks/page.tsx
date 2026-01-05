"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Task, Priority } from "@prisma/client";
import { TaskCard } from "@/components/task-card";
import { TaskForm } from "@/components/task-form";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ListTodo, CheckCircle2, Clock, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TaskWithList = Task & {
  list?: { id: string; name: string; color: string | null };
};

export default function TasksPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedTask, setSelectedTask] = useState<TaskWithList | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
      const res = await fetch("/api/tasks", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      } else if (res.status === 401) {
        setTasks([]);
      }
    } catch (error) {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/lists", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
      } else if (res.status === 401) {
        setLists([]);
      }
    } catch (error) {
      setLists([]);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchTasks();
      fetchLists();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const handleCreateTask = async (data: {
    title: string;
    notes?: string;
    priority: Priority;
    dueAt?: string;
    listId: string;
  }) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await fetchTasks();
        setIsFormOpen(false);
      } else {
        throw new Error("Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
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

      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: taskId,
          ...data,
        }),
      });

      if (res.ok) {
        await fetchTasks();
        // Update selected task if it's the one being edited
        if (selectedTask?.id === taskId) {
          const updatedTasks = await res.json();
          const updated = tasks.find((t) => t.id === taskId);
          if (updated) {
            setSelectedTask({ ...updated, ...data } as TaskWithList);
          }
        }
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
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
        await fetchTasks();
        setIsDetailOpen(false);
        setSelectedTask(null);
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
    }
  };

  const handleTaskClick = (task: TaskWithList) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3"
        >
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-muted-foreground">Loading tasks...</span>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const allTasks = tasks;
  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const completedTasks = tasks.filter((t) => t.status === "DONE");
  const overdueTasks = tasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "DONE"
  );

  const stats = [
    {
      label: "All Tasks",
      count: allTasks.length,
      icon: ListTodo,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-950",
    },
    {
      label: "Active",
      count: activeTasks.length,
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-950",
    },
    {
      label: "Completed",
      count: completedTasks.length,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-950",
    },
    {
      label: "Overdue",
      count: overdueTasks.length,
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-950",
    },
  ];

  const getTabTasks = () => {
    switch (selectedTab) {
      case "active":
        return activeTasks;
      case "completed":
        return completedTasks;
      case "overdue":
        return overdueTasks;
      default:
        return allTasks;
    }
  };

  const tabTasks = getTabTasks();

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              All My Tasks
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
              <Sparkles className="h-6 w-6 text-purple-500" />
            </motion.div>
          </div>
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
        <p className="text-muted-foreground">
          Manage and organize all your tasks in one place
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl p-3 ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tasks List with Filter Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={selectedTab === "all" ? "default" : "outline"}
                onClick={() => setSelectedTab("all")}
                className={selectedTab === "all" ? "bg-gradient-to-r from-purple-600 to-indigo-600" : ""}
              >
                All ({allTasks.length})
              </Button>
              <Button
                variant={selectedTab === "active" ? "default" : "outline"}
                onClick={() => setSelectedTab("active")}
                className={selectedTab === "active" ? "bg-gradient-to-r from-purple-600 to-indigo-600" : ""}
              >
                Active ({activeTasks.length})
              </Button>
              <Button
                variant={selectedTab === "completed" ? "default" : "outline"}
                onClick={() => setSelectedTab("completed")}
                className={selectedTab === "completed" ? "bg-gradient-to-r from-purple-600 to-indigo-600" : ""}
              >
                Completed ({completedTasks.length})
              </Button>
              <Button
                variant={selectedTab === "overdue" ? "default" : "outline"}
                onClick={() => setSelectedTab("overdue")}
                className={selectedTab === "overdue" ? "bg-gradient-to-r from-purple-600 to-indigo-600" : ""}
              >
                Overdue ({overdueTasks.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {tabTasks.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="rounded-full bg-muted/50 p-6 mb-4">
                    <ListTodo className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    {selectedTab === "all" 
                      ? "Get started by creating your first task"
                      : `No ${selectedTab} tasks at the moment`}
                  </p>
                  {selectedTab === "all" && (
                    <Button 
                      onClick={() => setIsFormOpen(true)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={selectedTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <AnimatePresence>
                    {tabTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <TaskCard
                          task={task}
                          onToggle={handleToggleTask}
                          onClick={() => handleTaskClick(task)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      <TaskForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateTask}
        lists={lists}
        defaultListId={lists[0]?.id}
      />

      <TaskDetailPanel
        task={selectedTask}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        lists={lists}
      />
    </div>
  );
}
