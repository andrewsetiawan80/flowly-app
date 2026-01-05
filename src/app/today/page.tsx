"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Search, Filter } from "lucide-react";
import { Task, Priority, Status } from "@prisma/client";
import { TaskCard } from "@/components/task-card";
import { TaskForm } from "@/components/task-form";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

type TaskWithList = Task & {
  list?: { id: string; name: string; color: string | null };
};

export default function Today() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithList | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
      // Silently fail
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
      // Silently fail
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

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => {
          const input = document.querySelector('input[placeholder="Search tasks..."]') as HTMLInputElement;
          input?.focus();
        }, 100);
      }
      if (e.key === 'Escape' && isSearchExpanded) {
        setIsSearchExpanded(false);
        setSearchQuery("");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchExpanded]);

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
      console.error("Failed to update task:", error);
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
      } else {
        throw new Error("Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.notes && task.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const todayTasks = filteredTasks.filter((task) => task.status !== "DONE");
  const completedTasks = filteredTasks.filter((task) => task.status === "DONE");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Next 7 days</h1>
        <Button 
          onClick={() => setIsFormOpen(true)} 
          size="sm"
          className="text-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add task
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!isSearchExpanded ? (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => setIsSearchExpanded(true)}
            className="group flex items-center gap-3 w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm hover:bg-background/50 hover:border-sky-500/30 transition-all duration-200 text-left"
          >
            <Search className="h-4 w-4 text-muted-foreground/60 group-hover:text-sky-500 transition-colors" />
            <span className="text-sm text-muted-foreground/70 group-hover:text-foreground/80">Search tasks...</span>
            <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded border border-border/30 bg-muted/30">
              <kbd className="text-xs font-medium text-muted-foreground">⌘</kbd>
              <kbd className="text-xs font-medium text-muted-foreground">K</kbd>
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500 pointer-events-none z-10" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  if (!searchQuery) {
                    setTimeout(() => setIsSearchExpanded(false), 200);
                  }
                }}
                className="pl-10 pr-20 h-11 text-sm backdrop-blur-sm bg-background/50 border-sky-500/30 focus:bg-background/80 focus:border-sky-500/50 transition-all duration-200"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchExpanded(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                ESC
              </button>
            </div>
            <div className="flex gap-2">
              <Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-32 h-11 text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-32 h-11 text-sm"
              >
                <option value="all">All Status</option>
                <option value="TODO">To Do</option>
                <option value="DOING">Doing</option>
                <option value="DONE">Done</option>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {todayTasks.length === 0 && !loading && (
        <Card className="border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || filterPriority !== "all" || filterStatus !== "all"
                ? "Try adjusting your filters"
                : "You have no tasks for today. Great job!"}
            </p>
            {!searchQuery && filterPriority === "all" && filterStatus === "all" && (
              <Button onClick={() => setIsFormOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {todayTasks.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggleTask}
                onClick={() => handleTaskClick(task)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="pt-6 border-t border-border/30 mt-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Completed ({completedTasks.length})
          </h2>
          <div className="space-y-2">
            <AnimatePresence>
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTask}
                  onClick={() => handleTaskClick(task)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

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
