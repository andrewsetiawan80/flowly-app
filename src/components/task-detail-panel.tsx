"use client";

import { useState, useEffect } from "react";
import { Task, Priority, Status } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  X,
  Calendar,
  Flag,
  List,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  Save,
  Plus,
  ListTodo,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { triggerRefresh } from "@/lib/events";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

interface TaskDetailPanelProps {
  task: (Task & { 
    list?: { id: string; name: string; color: string | null };
    subtasks?: Subtask[];
  }) | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  lists: Array<{ id: string; name: string }>;
}

const priorityOptions = [
  { value: "LOW", label: "Low", color: "bg-blue-500" },
  { value: "MEDIUM", label: "Medium", color: "bg-amber-500" },
  { value: "HIGH", label: "High", color: "bg-orange-500" },
  { value: "URGENT", label: "Urgent", color: "bg-red-500" },
];

const quickDates = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "Next Week", days: 7 },
  { label: "Next Month", days: 30 },
];

export function TaskDetailPanel({
  task,
  open,
  onClose,
  onUpdate,
  onDelete,
  lists,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueAt, setDueAt] = useState<string>("");
  const [listId, setListId] = useState<string>("");
  const [status, setStatus] = useState<Status>("TODO");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Subtask state
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes || "");
      setPriority(task.priority);
      setDueAt(task.dueAt ? format(new Date(task.dueAt), "yyyy-MM-dd'T'HH:mm") : "");
      setListId(task.listId);
      setStatus(task.status);
      setSubtasks(task.subtasks || []);
      setHasChanges(false);
      setNewSubtaskTitle("");
    }
  }, [task]);

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    try {
      const res = await fetch("/api/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taskId: task.id, title: newSubtaskTitle.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubtasks([...subtasks, data.subtask]);
        setNewSubtaskTitle("");
        triggerRefresh('TASKS');
      }
    } catch (error) {
      console.error("Failed to add subtask:", error);
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    // Optimistic update
    setSubtasks(subtasks.map(s => s.id === subtaskId ? { ...s, completed } : s));
    try {
      await fetch("/api/subtasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: subtaskId, completed }),
      });
      triggerRefresh('TASKS');
    } catch (error) {
      console.error("Failed to toggle subtask:", error);
      // Revert on error
      setSubtasks(subtasks.map(s => s.id === subtaskId ? { ...s, completed: !completed } : s));
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    // Optimistic update
    const previousSubtasks = subtasks;
    setSubtasks(subtasks.filter(s => s.id !== subtaskId));
    try {
      await fetch("/api/subtasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: subtaskId }),
      });
      triggerRefresh('TASKS');
    } catch (error) {
      console.error("Failed to delete subtask:", error);
      setSubtasks(previousSubtasks);
    }
  };

  const subtaskProgress = subtasks.length > 0 
    ? Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100)
    : 0;

  const handleSave = async () => {
    if (!task || !hasChanges) return;
    setSaving(true);
    try {
      await onUpdate(task.id, {
        title,
        notes: notes || null,
        priority,
        dueAt: dueAt ? new Date(dueAt) : null,
        listId,
        status,
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm("Are you sure you want to delete this task?")) return;
    await onDelete(task.id);
    onClose();
  };

  const setQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(9, 0, 0, 0);
    setDueAt(format(date, "yyyy-MM-dd'T'HH:mm"));
    setHasChanges(true);
  };

  const toggleComplete = () => {
    const newStatus = status === "DONE" ? "TODO" : "DONE";
    setStatus(newStatus);
    setHasChanges(true);
  };

  return (
    <AnimatePresence>
      {open && task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:bg-transparent"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-md bg-white dark:bg-gray-900 border-l border-black/5 dark:border-white/5 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleComplete}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                      status === "DONE"
                        ? "bg-gradient-to-br from-emerald-500 to-green-500 text-white"
                        : "border-2 border-gray-300 dark:border-gray-600 hover:border-orange-500"
                    )}
                  >
                    {status === "DONE" && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <span className="text-sm font-medium text-muted-foreground">
                    {status === "DONE" ? "Completed" : "Mark complete"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Task title"
                  className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Add notes..."
                  rows={4}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50"
                />
              </div>

              {/* Subtasks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Subtasks
                    {subtasks.length > 0 && (
                      <span className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                        {subtasks.filter(s => s.completed).length}/{subtasks.length}
                      </span>
                    )}
                  </label>
                  {subtasks.length > 0 && (
                    <span className="text-xs text-muted-foreground">{subtaskProgress}%</span>
                  )}
                </div>

                {/* Progress bar */}
                {subtasks.length > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.04]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subtaskProgress}%` }}
                      transition={{ duration: 0.3 }}
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                    />
                  </div>
                )}

                {/* Subtask list */}
                <div className="space-y-1">
                  <AnimatePresence mode="popLayout">
                    {subtasks.map((subtask) => (
                      <motion.div
                        key={subtask.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="group flex items-center gap-3 p-2 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={(checked) => handleToggleSubtask(subtask.id, checked === true)}
                          className="h-4 w-4 rounded border-2 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-orange-500 data-[state=checked]:to-amber-500 data-[state=checked]:border-orange-500"
                        />
                        <span className={cn(
                          "flex-1 text-sm",
                          subtask.completed && "line-through text-muted-foreground"
                        )}>
                          {subtask.title}
                        </span>
                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Add subtask input */}
                <div className="flex items-center gap-2">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubtaskTitle.trim()) {
                        handleAddSubtask();
                      }
                    }}
                    placeholder="Add a subtask..."
                    className="flex-1 h-9 text-sm bg-black/[0.02] dark:bg-white/[0.02]"
                    disabled={addingSubtask}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim() || addingSubtask}
                    className="h-9 px-3"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickDates.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setQuickDate(option.days)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black/5 dark:bg-white/5 hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setDueAt("");
                      setHasChanges(true);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black/5 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <Input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => {
                    setDueAt(e.target.value);
                    setHasChanges(true);
                  }}
                  className="bg-black/[0.02] dark:bg-white/[0.02]"
                />
              </div>

              {/* Priority */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setPriority(option.value as Priority);
                        setHasChanges(true);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all",
                        priority === option.value
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/30"
                          : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                      )}
                    >
                      <div className={cn("h-2 w-2 rounded-full", option.color)} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </label>
                <select
                  value={listId}
                  onChange={(e) => {
                    setListId(e.target.value);
                    setHasChanges(true);
                  }}
                  className="w-full h-11 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50"
                >
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meta Info */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Created {format(new Date(task.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </div>
                {task.updatedAt !== task.createdAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Updated {format(new Date(task.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="w-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

