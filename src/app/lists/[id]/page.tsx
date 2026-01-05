"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Task, Priority } from "@prisma/client";
import { TaskCard } from "@/components/task-card";
import { TaskForm } from "@/components/task-form";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, FolderOpen, ArrowLeft, Trash2, ChevronRight, Folder, ShoppingCart, X, Trash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { triggerRefresh, REFRESH_EVENTS } from "@/lib/events";
import { cn } from "@/lib/utils";

type TaskWithList = Task & {
  list?: { id: string; name: string; color: string | null };
  subtasks?: any[];
  subtaskCount?: number;
  subtaskCompletedCount?: number;
};

type Project = {
  id: string;
  name: string;
  description?: string | null;
  color: string | null;
  type: "PROJECT" | "CHECKLIST";
  parentId: string | null;
  tasks: TaskWithList[];
  children?: Project[];
  _count?: { tasks: number; children: number };
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [subProjects, setSubProjects] = useState<Project[]>([]);
  const [parentProject, setParentProject] = useState<Project | null>(null);
  const [allLists, setAllLists] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithList | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Checklist specific state
  const [newItemText, setNewItemText] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const projectId = params?.id as string;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  const fetchProject = useCallback(async () => {
    if (status !== "authenticated" || !projectId) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch("/api/lists", {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        const allProjects = data.lists || [];
        const foundProject = allProjects.find((l: Project) => l.id === projectId);
        
        if (foundProject) {
          setProject(foundProject);
          setTasks(foundProject.tasks || []);
          
          // Find sub-projects (children)
          const children = allProjects.filter((p: Project) => p.parentId === projectId);
          setSubProjects(children);
          
          // Find parent project if exists
          if (foundProject.parentId) {
            const parent = allProjects.find((p: Project) => p.id === foundProject.parentId);
            setParentProject(parent || null);
          } else {
            setParentProject(null);
          }
        } else {
          router.push("/dashboard");
        }
        
        setAllLists(allProjects);
      } else if (res.status === 401) {
        router.push("/signin");
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  }, [status, projectId, router]);

  useEffect(() => {
    if (status === "authenticated" && projectId) {
      fetchProject();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, projectId, fetchProject]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (status === "authenticated" && projectId) {
        fetchProject();
      }
    };

    window.addEventListener(REFRESH_EVENTS.PROJECTS, handleRefresh);
    window.addEventListener(REFRESH_EVENTS.TASKS, handleRefresh);
    
    return () => {
      window.removeEventListener(REFRESH_EVENTS.PROJECTS, handleRefresh);
      window.removeEventListener(REFRESH_EVENTS.TASKS, handleRefresh);
    };
  }, [status, projectId, fetchProject]);

  // Quick add item for checklist
  const handleQuickAddItem = async () => {
    if (!newItemText.trim() || addingItem) return;
    
    setAddingItem(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newItemText.trim(),
          listId: projectId,
          priority: "LOW", // Default for checklist items
        }),
      });

      if (res.ok) {
        setNewItemText("");
        triggerRefresh('ALL');
        // Focus input again for quick successive adds
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setAddingItem(false);
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
    // Optimistic update for checklist
    if (project?.type === "CHECKLIST") {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: completed ? "DONE" : "TODO" } : t));
    }
    
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
      console.error("Failed to toggle task:", error);
      // Revert optimistic update
      if (project?.type === "CHECKLIST") {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: completed ? "TODO" : "DONE" } : t));
      }
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
    // Optimistic update for checklist
    if (project?.type === "CHECKLIST") {
      setTasks(tasks.filter(t => t.id !== taskId));
    }
    
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

  const handleClearCompleted = async () => {
    const completedTasks = tasks.filter(t => t.status === "DONE");
    if (completedTasks.length === 0) return;
    
    if (!confirm(`Clear ${completedTasks.length} completed items?`)) return;
    
    // Optimistic update
    setTasks(tasks.filter(t => t.status !== "DONE"));
    
    try {
      // Delete all completed tasks
      await Promise.all(
        completedTasks.map(task =>
          fetch("/api/tasks", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id: task.id }),
          })
        )
      );
      triggerRefresh('ALL');
    } catch (error) {
      console.error("Failed to clear completed:", error);
      fetchProject(); // Revert by re-fetching
    }
  };

  const handleTaskClick = (task: TaskWithList) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!project || !confirm(`Are you sure you want to delete "${project.name}"? This will also delete all items.`)) {
      return;
    }

    try {
      const res = await fetch("/api/lists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: project.id }),
      });

      if (res.ok) {
        triggerRefresh('ALL');
        router.push(parentProject ? `/lists/${parentProject.id}` : "/dashboard");
      } else {
        alert("Failed to delete");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("An error occurred");
    }
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
          <span className="text-muted-foreground font-medium">Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated" || !project) {
    return null;
  }

  const isChecklist = project.type === "CHECKLIST";
  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const completedTasks = tasks.filter((t) => t.status === "DONE");
  const totalTaskCount = tasks.length + subProjects.reduce((sum, sp) => sum + (sp._count?.tasks || 0), 0);

  // Render Checklist UI
  if (isChecklist) {
    return (
      <div className="space-y-6 pb-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(parentProject ? `/lists/${parentProject.id}` : "/dashboard")}
              className="-ml-2"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {parentProject ? parentProject.name : "Dashboard"}
            </Button>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <motion.div
                className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ 
                  backgroundColor: project.color || "#10b981",
                  boxShadow: `0 8px 24px -4px ${project.color || "#10b981"}40`
                }}
              >
                <ShoppingCart className="h-6 w-6 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 dark:from-emerald-400 dark:via-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    {project.name}
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  {activeTasks.length} items · {completedTasks.length} completed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {completedTasks.length > 0 && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleClearCompleted}
                  className="text-muted-foreground"
                >
                  <Trash className="sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Clear done</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleDeleteProject}
                className="text-red-600 hover:text-red-700 hover:bg-red-500/10 hover:border-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Add Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItemText.trim()) {
                      handleQuickAddItem();
                    }
                  }}
                  placeholder="Add an item... (press Enter)"
                  className="h-12 text-base border-border/50 focus:border-emerald-500"
                  disabled={addingItem}
                />
                <Button
                  onClick={handleQuickAddItem}
                  disabled={!newItemText.trim() || addingItem}
                  className="h-12 px-6 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Checklist Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          {/* Active Items */}
          <AnimatePresence>
            {activeTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card className="border-border/30 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Checkbox
                      checked={task.status === "DONE"}
                      onCheckedChange={(checked) => handleToggleTask(task.id, checked === true)}
                      className="h-5 w-5 rounded-md border-2 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-500 data-[state=checked]:border-emerald-500"
                    />
                    <span className="flex-1 text-base">{task.title}</span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Completed Items */}
          {completedTasks.length > 0 && (
            <div className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Completed ({completedTasks.length})
              </p>
              <AnimatePresence>
                {completedTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <Card className="border-border/20 bg-card/20 backdrop-blur-sm group">
                      <CardContent className="p-4 flex items-center gap-4">
                        <Checkbox
                          checked={true}
                          onCheckedChange={(checked) => handleToggleTask(task.id, checked === true)}
                          className="h-5 w-5 rounded-md border-2 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-500 data-[state=checked]:border-emerald-500"
                        />
                        <span className="flex-1 text-base line-through text-muted-foreground">{task.title}</span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
          {tasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-6 mb-4 inline-block">
                <ShoppingCart className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Empty checklist</h3>
              <p className="text-sm text-muted-foreground">Add your first item above</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // Render Project UI (existing code)
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(parentProject ? `/lists/${parentProject.id}` : "/dashboard")}
            className="-ml-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {parentProject ? parentProject.name : "Dashboard"}
          </Button>
          
          {parentProject && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{project.name}</span>
            </>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <motion.div
              className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ 
                backgroundColor: project.color || "#f97316",
                boxShadow: `0 8px 24px -4px ${project.color || "#f97316"}40`
              }}
              animate={{ 
                rotate: [0, 5, -5, 5, 0],
                scale: [1, 1.05, 1.05, 1.05, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 5
              }}
            >
              <FolderOpen className="h-6 w-6 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 dark:from-orange-400 dark:via-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                  {project.name}
                </span>
              </h1>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                {totalTaskCount} {totalTaskCount === 1 ? "task" : "tasks"} · {subProjects.length} sub-projects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={() => setIsFormOpen(true)}
                className="shadow-lg shadow-orange-500/25"
              >
                <Plus className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Task</span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                variant="outline"
                onClick={() => router.push(`/lists/new?parentId=${project.id}`)}
              >
                <Folder className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sub-project</span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDeleteProject}
                className="text-red-600 hover:text-red-700 hover:bg-red-500/10 hover:border-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Sub-projects */}
      {subProjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full" />
            <h2 className="text-lg font-bold">Sub-projects</h2>
            <span className="text-sm text-muted-foreground/70 font-medium">({subProjects.length})</span>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2">
            {subProjects.map((subProject, index) => (
              <motion.div
                key={subProject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Link href={`/lists/${subProject.id}`}>
                  <Card className="group cursor-pointer hover:border-orange-500/20 hover:shadow-lg transition-all">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div 
                        className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: subProject.color || "#f97316" }}
                      >
                        {subProject.type === "CHECKLIST" ? (
                          <ShoppingCart className="h-5 w-5 text-white" />
                        ) : (
                          <FolderOpen className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {subProject.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {subProject._count?.tasks || 0} {subProject.type === "CHECKLIST" ? "items" : "tasks"}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-8"
      >
        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="h-8 w-1 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full" />
              <h2 className="text-lg font-bold">Active Tasks</h2>
              <span className="text-sm text-muted-foreground/70 font-medium">({activeTasks.length})</span>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence>
                {activeTasks.map((task, index) => (
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
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full" />
                <h2 className="text-lg font-bold">Completed Tasks</h2>
                <span className="text-sm text-muted-foreground/70 font-medium">({completedTasks.length})</span>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleClearCompleted}
                className="text-muted-foreground hover:text-red-600 hover:border-red-500/30"
              >
                <Trash className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Clear done</span>
              </Button>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence>
                {completedTasks.map((task, index) => (
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
            </div>
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 && subProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.02]">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-3xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-6 mb-6">
                  <FolderOpen className="h-12 w-12 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Empty project</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-md">
                  Start by adding tasks or creating sub-projects
                </p>
                <div className="flex gap-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={() => setIsFormOpen(true)}
                      className="shadow-lg shadow-orange-500/25"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </Button>
                  </motion.div>
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/lists/new?parentId=${project.id}`)}
                  >
                    <Folder className="mr-2 h-4 w-4" />
                    Sub-project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      <TaskForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateTask}
        lists={allLists}
        defaultListId={projectId}
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
        lists={allLists}
      />
    </div>
  );
}
