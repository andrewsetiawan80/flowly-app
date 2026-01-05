"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Search } from "lucide-react";
import { Task, Priority } from "@prisma/client";
import { TaskCard } from "@/components/task-card";
import { TaskForm } from "@/components/task-form";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { triggerRefresh, REFRESH_EVENTS } from "@/lib/events";

type TaskWithList = Task & {
  list?: { id: string; name: string; color: string | null };
  subtasks?: any[];
  subtaskCount?: number;
  subtaskCompletedCount?: number;
};

export default function AllTasks() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Task detail panel state
  const [selectedTask, setSelectedTask] = useState<TaskWithList | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
  }, [status]);

  const fetchLists = useCallback(async () => {
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
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTasks();
      fetchLists();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, fetchTasks, fetchLists]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (status === "authenticated") {
        fetchTasks();
        fetchLists();
      }
    };

    window.addEventListener(REFRESH_EVENTS.PROJECTS, handleRefresh);
    window.addEventListener(REFRESH_EVENTS.TASKS, handleRefresh);
    
    return () => {
      window.removeEventListener(REFRESH_EVENTS.PROJECTS, handleRefresh);
      window.removeEventListener(REFRESH_EVENTS.TASKS, handleRefresh);
    };
  }, [status, fetchTasks, fetchLists]);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchExpanded(true);
        // Focus the input after expansion
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
        triggerRefresh('ALL');
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
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
        triggerRefresh('ALL');
      } else {
        throw new Error("Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
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
        triggerRefresh('ALL');
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
        triggerRefresh('ALL');
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

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.notes && task.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  if (status === "loading" || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.div 
        className="flex items-center justify-between gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text truncate">
            All my tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0"
        >
          <Button 
            onClick={() => setIsFormOpen(true)} 
            size="default"
            className="shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add task</span>
          </Button>
        </motion.div>
      </motion.div>

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
            className="flex flex-col gap-3"
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
                className="pl-10 pr-16 h-11 text-sm backdrop-blur-sm bg-background/50 border-sky-500/30 focus:bg-background/80 focus:border-sky-500/50 transition-all duration-200"
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
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="min-w-[130px] flex-1 sm:flex-none sm:w-36 h-11 text-sm backdrop-blur-sm bg-background/50 border-border/50"
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
                className="min-w-[110px] flex-1 sm:flex-none sm:w-32 h-11 text-sm backdrop-blur-sm bg-background/50 border-border/50"
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

      {filteredTasks.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="mb-6 h-20 w-20 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center"
              >
                <Plus className="h-10 w-10 text-purple-500" />
              </motion.div>
              <p className="text-base text-muted-foreground mb-6 text-center max-w-md">
                {searchQuery || filterPriority !== "all" || filterStatus !== "all"
                  ? "No tasks match your filters. Try adjusting them to see more results."
                  : "Your task list is empty. Get started by creating your first task!"}
              </p>
              {!searchQuery && filterPriority === "all" && filterStatus === "all" && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => setIsFormOpen(true)} 
                    size="lg"
                    className="shadow-lg shadow-purple-500/30"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Task
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {filteredTasks.length > 0 && (
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ 
                  delay: index * 0.05,
                  layout: { type: "spring", stiffness: 300, damping: 30 }
                }}
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
    </motion.div>
  );
}
