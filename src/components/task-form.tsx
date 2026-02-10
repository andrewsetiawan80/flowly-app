"use client";

import { useState, useEffect } from "react";
import { Priority, Status } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Calendar as CalendarIcon, Flag, List, FileText, Sun, Sunrise, CalendarDays } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    notes?: string;
    priority: Priority;
    dueAt?: string;
    listId: string;
  }) => Promise<void>;
  lists: Array<{ id: string; name: string }>;
  defaultListId?: string;
  defaultDueAt?: string;
}

const quickDates = [
  { label: "Today", icon: Sun, days: 0 },
  { label: "Tomorrow", icon: Sunrise, days: 1 },
  { label: "Next Week", icon: CalendarDays, days: 7 },
];

export function TaskForm({
  open,
  onOpenChange,
  onSubmit,
  lists,
  defaultListId,
  defaultDueAt,
}: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [listId, setListId] = useState(defaultListId || lists[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [selectedQuickDate, setSelectedQuickDate] = useState<number | null>(null);

  // Update dueAt when defaultDueAt changes
  useEffect(() => {
    if (defaultDueAt) {
      setDueAt(defaultDueAt.split("T")[0]);
    }
  }, [defaultDueAt]);

  // Update listId when defaultListId or lists change
  useEffect(() => {
    if (defaultListId) {
      setListId(defaultListId);
    } else if (lists.length > 0 && !listId) {
      setListId(lists[0].id);
    }
  }, [defaultListId, lists]);

  const handleQuickDate = (days: number) => {
    const date = addDays(new Date(), days);
    date.setHours(9, 0, 0, 0);
    setDueAt(format(date, "yyyy-MM-dd'T'HH:mm"));
    setSelectedQuickDate(days);
  };

  const clearDate = () => {
    setDueAt("");
    setSelectedQuickDate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !listId) return;

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        notes: notes.trim() || undefined,
        priority,
        dueAt: dueAt || undefined,
        listId,
      });
      // Reset form
      setTitle("");
      setNotes("");
      setPriority("MEDIUM");
      setDueAt("");
      setSelectedQuickDate(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[560px] border-black/[0.04] dark:border-white/[0.04] bg-white/95 dark:bg-[#0f0f14]/95 backdrop-blur-2xl shadow-2xl rounded-3xl">
            <motion.form 
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader className="space-y-4 pb-2">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="flex items-center gap-4"
                >
                  <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                    <Flame className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold">
                      Create New Task
                    </DialogTitle>
                    <DialogDescription className="text-sm mt-1 text-muted-foreground">
                      Add a new task to stay organized
                    </DialogDescription>
                  </div>
                </motion.div>
              </DialogHeader>

              <div className="space-y-5 py-6">
                <motion.div 
                  className="space-y-2.5"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                >
                  <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Title *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    required
                    autoFocus
                    className="h-12 text-base"
                  />
                </motion.div>

                <motion.div 
                  className="space-y-2.5"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <Label htmlFor="notes" className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Notes
                  </Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional details..."
                    rows={3}
                    className="flex min-h-[90px] w-full rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.02] px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none"
                  />
                </motion.div>

                <div className="grid grid-cols-2 gap-4">
                  <motion.div 
                    className="space-y-2.5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                  >
                    <Label htmlFor="priority" className="text-sm font-semibold flex items-center gap-2">
                      <Flag className="h-4 w-4 text-primary" />
                      Priority
                    </Label>
                    <Select
                      id="priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="h-12"
                    >
                      <option value="LOW">🔵 Low</option>
                      <option value="MEDIUM">🟡 Medium</option>
                      <option value="HIGH">🟠 High</option>
                      <option value="URGENT">🔴 Urgent</option>
                    </Select>
                  </motion.div>

                  <motion.div 
                    className="space-y-2.5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    <Label htmlFor="list" className="text-sm font-semibold flex items-center gap-2">
                      <List className="h-4 w-4 text-primary" />
                      List
                    </Label>
                    <Select
                      id="list"
                      value={listId}
                      onChange={(e) => setListId(e.target.value)}
                      required
                      className="h-12"
                    >
                      {lists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </Select>
                  </motion.div>
                </div>

                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                >
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Due Date
                  </Label>
                  
                  {/* Quick date buttons */}
                  <div className="flex flex-wrap gap-2">
                    {quickDates.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => handleQuickDate(option.days)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition-all",
                            selectedQuickDate === option.days
                              ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                              : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {option.label}
                        </button>
                      );
                    })}
                    {dueAt && (
                      <button
                        type="button"
                        onClick={clearDate}
                        className="px-3 py-2 text-xs font-medium rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <Input
                    id="dueAt"
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => {
                      setDueAt(e.target.value);
                      setSelectedQuickDate(null);
                    }}
                    className="h-12 text-base"
                  />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <DialogFooter className="gap-3 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                      className="font-semibold"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      type="submit" 
                      disabled={loading || !title.trim()}
                      className="font-semibold shadow-lg shadow-primary/25"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Flame className="h-4 w-4" />
                          </motion.div>
                          Creating...
                        </div>
                      ) : (
                        <>
                          <Flame className="mr-2 h-4 w-4" />
                          Create Task
                        </>
                      )}
                    </Button>
                  </motion.div>
                </DialogFooter>
              </motion.div>
            </motion.form>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
