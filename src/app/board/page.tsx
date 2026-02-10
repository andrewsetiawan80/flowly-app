"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Task, Priority, Status } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Columns3, Calendar, Flag, GripVertical, Plus, 
  AlertCircle, Clock, CheckCircle2, XCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerRefresh, REFRESH_EVENTS } from "@/lib/events";
import { cn } from "@/lib/utils";
import { TaskForm } from "@/components/task-form";
import { TaskDetailPanel } from "@/components/task-detail-panel";

type TaskWithList = Task & {
  list?: { id: string; name: string; color: string | null };
  subtasks?: any[];
  subtaskCount?: number;
  subtaskCompletedCount?: number;
};

const STATUS_COLUMNS: { status: Status; label: string; icon: any; color: string }[] = [
  { status: "TODO", label: "To Do", icon: AlertCircle, color: "text-slate-500" },
  { status: "DOING", label: "In Progress", icon: Clock, color: "text-blue-500" },
  { status: "DONE", label: "Done", icon: CheckCircle2, color: "text-emerald-500" },
  { status: "CANCELED", label: "Canceled", icon: XCircle, color: "text-red-500" },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-slate-400",
};

export default function KanbanBoardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithList | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    if (status !== "authenticated") return;

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
        setLists(data.lists?.map((l: any) => ({ id: l.id, name: l.name })) || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener(REFRESH_EVENTS.TASKS, handleRefresh);
    window.addEventListener(REFRESH_EVENTS.PROJECTS, handleRefresh);
    return () => {
      window.removeEventListener(REFRESH_EVENTS.TASKS, handleRefresh);
      window.removeEventListener(REFRESH_EVENTS.PROJECTS, handleRefresh);
    };
  }, [fetchData]);

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Status) => {
    e.preventDefault();
    if (!draggedTask) return;

    const task = tasks.find((t) => t.id === draggedTask);
    if (!task || task.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTask ? { ...t, status: newStatus } : t))
    );
    setDraggedTask(null);

    try {
      const res = await fetch(`/api/tasks/${draggedTask}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        triggerRefresh("ALL");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      fetchData();
    }
  };

  const handleTaskClick = (task: TaskWithList) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleCreateTask = async (data: any) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (res.ok) {
        triggerRefresh("ALL");
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (res.ok) {
        triggerRefresh("ALL");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        triggerRefresh("ALL");
        setIsDetailOpen(false);
        setSelectedTask(null);
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-muted-foreground">Loading board...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Columns3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Kanban Board
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Drag tasks between columns to update status
            </p>
          </div>
        </div>

        <Button onClick={() => setIsFormOpen(true)} className="shadow-lg">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </motion.div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
        {STATUS_COLUMNS.map((column, colIndex) => {
          const columnTasks = tasks.filter((t) => t.status === column.status);
          const Icon = column.icon;

          return (
            <motion.div
              key={column.status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: colIndex * 0.1 }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
              className="min-h-[400px] min-w-[220px]"
            >
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className={cn("h-4 w-4", column.color)} />
                    {column.label}
                    <Badge variant="secondary" className="ml-auto">
                      {columnTasks.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <AnimatePresence>
                    {columnTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.02 }}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onClick={() => handleTaskClick(task)}
                        className={cn(
                          "p-3 rounded-lg border bg-background cursor-grab active:cursor-grabbing",
                          "hover:border-primary/30 hover:shadow-md transition-all",
                          draggedTask === task.id && "opacity-50"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm break-words">{task.title}</p>
                            {task.list && (
                              <div className="flex items-center gap-1 mt-1">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: task.list.color || "#6366f1" }}
                                />
                                <span className="text-xs text-muted-foreground break-words">
                                  {task.list.name}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  PRIORITY_COLORS[task.priority]
                                )}
                              />
                              {task.dueAt && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(task.dueAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No tasks
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <TaskForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateTask}
        lists={lists}
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

