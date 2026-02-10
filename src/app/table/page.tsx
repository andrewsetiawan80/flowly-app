"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Search,
  Filter,
  Table2,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { triggerRefresh } from "@/lib/events";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  assignee?: { id: string; name: string | null; email: string } | null;
  list: { id: string; name: string; color: string | null };
  subtaskCount: number;
  subtaskCompletedCount: number;
}

type SortField = "title" | "status" | "priority" | "dueAt" | "createdAt" | "list";
type SortDirection = "asc" | "desc";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  TODO: <Circle className="h-4 w-4 text-gray-400" />,
  DOING: <Clock className="h-4 w-4 text-blue-500" />,
  DONE: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  CANCELED: <X className="h-4 w-4 text-gray-400" />,
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; sortOrder: number }> = {
  URGENT: { label: "Urgent", color: "text-red-500 bg-red-50 dark:bg-red-900/20", sortOrder: 4 },
  HIGH: { label: "High", color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20", sortOrder: 3 },
  MEDIUM: { label: "Medium", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20", sortOrder: 2 },
  LOW: { label: "Low", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", sortOrder: 1 },
};

const STATUS_OPTIONS = ["TODO", "DOING", "DONE", "CANCELED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function TableViewPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?limit=200", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Sort tasks
  const sortedTasks = [...tasks]
    .filter((t) =>
      search
        ? t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.list.name.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "status":
          return STATUS_OPTIONS.indexOf(a.status).toString().localeCompare(STATUS_OPTIONS.indexOf(b.status).toString()) * dir;
        case "priority":
          return ((PRIORITY_CONFIG[a.priority]?.sortOrder || 0) - (PRIORITY_CONFIG[b.priority]?.sortOrder || 0)) * dir;
        case "dueAt":
          if (!a.dueAt && !b.dueAt) return 0;
          if (!a.dueAt) return 1;
          if (!b.dueAt) return -1;
          return (new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) * dir;
        case "list":
          return a.list.name.localeCompare(b.list.name) * dir;
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary" />
    );
  };

  const startEditing = (taskId: string, field: string, currentValue: string) => {
    setEditingCell({ taskId, field });
    setEditValue(currentValue);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { taskId, field } = editingCell;

    try {
      const body: Record<string, string> = {};
      body[field] = editValue;

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(tasks.map((t) => (t.id === taskId ? { ...t, ...data.task } : t)));
        triggerRefresh("TASKS");
      }
    } catch (error) {
      console.error("Failed to update:", error);
    }
    setEditingCell(null);
  };

  const updateField = async (taskId: string, field: string, value: string) => {
    // Optimistic update
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)));

    try {
      const body: Record<string, string> = {};
      body[field] = value;

      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      triggerRefresh("TASKS");
    } catch (error) {
      console.error("Failed to update:", error);
      fetchTasks(); // Revert
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedTasks.map((t) => t.id)));
    }
  };

  const batchUpdate = async (field: string, value: string) => {
    setBatchLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/tasks/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ [field]: value }),
          })
        )
      );
      setSelectedIds(new Set());
      fetchTasks();
      triggerRefresh("TASKS");
    } catch (error) {
      console.error("Batch update failed:", error);
    } finally {
      setBatchLoading(false);
    }
  };

  const batchDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} tasks? This cannot be undone.`)) return;
    setBatchLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/tasks/${id}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );
      setSelectedIds(new Set());
      fetchTasks();
      triggerRefresh("TASKS");
    } catch (error) {
      console.error("Batch delete failed:", error);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Table2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Table View</h1>
            <p className="text-sm text-muted-foreground">{sortedTasks.length} tasks</p>
          </div>
        </div>
      </div>

      {/* Floating batch action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl px-3 sm:px-5 py-3 shadow-2xl max-w-[95vw]"
          >
            <span className="text-sm font-semibold">
              {selectedIds.size} selected
            </span>
            <div className="h-5 w-px bg-white/20 dark:bg-gray-300" />
            <button
              onClick={() => batchUpdate("status", "DONE")}
              disabled={batchLoading}
              className="text-xs font-medium px-3 py-2.5 rounded-lg hover:bg-white/10 dark:hover:bg-gray-100 transition-colors min-h-[44px] flex items-center"
            >
              <Check className="h-3.5 w-3.5 inline mr-1" />
              <span className="hidden sm:inline">Complete</span><span className="sm:hidden">Done</span>
            </button>
            <select
              onChange={(e) => { if (e.target.value) batchUpdate("priority", e.target.value); e.target.value = ""; }}
              disabled={batchLoading}
              className="text-xs font-medium px-2 py-2.5 rounded-lg bg-transparent hover:bg-white/10 dark:hover:bg-gray-100 cursor-pointer border-0 min-h-[44px]"
            >
              <option value="">Set Priority</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{PRIORITY_CONFIG[p]?.label}</option>
              ))}
            </select>
            <button
              onClick={batchDelete}
              disabled={batchLoading}
              className="text-xs font-medium px-3 py-2.5 rounded-lg hover:bg-red-500/20 text-red-300 dark:text-red-500 transition-colors min-h-[44px]"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2.5 rounded-lg hover:bg-white/10 dark:hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="pl-10 h-10"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border border-black/5 dark:border-white/5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                {/* Select All */}
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === sortedTasks.length && sortedTasks.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-2 border-gray-300 dark:border-gray-600 accent-primary cursor-pointer"
                  />
                </th>
                {/* Status */}
                <th className="w-10 px-3 py-3">
                  <button onClick={() => toggleSort("status")} className="flex items-center gap-1">
                    <SortIcon field="status" />
                  </button>
                </th>
                {/* Title */}
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => toggleSort("title")}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    Task <SortIcon field="title" />
                  </button>
                </th>
                {/* Priority */}
                <th className="px-3 py-3 text-left w-28">
                  <button
                    onClick={() => toggleSort("priority")}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    Priority <SortIcon field="priority" />
                  </button>
                </th>
                {/* Due Date */}
                <th className="px-3 py-3 text-left w-36">
                  <button
                    onClick={() => toggleSort("dueAt")}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    Due Date <SortIcon field="dueAt" />
                  </button>
                </th>
                {/* Project */}
                <th className="px-3 py-3 text-left w-40">
                  <button
                    onClick={() => toggleSort("list")}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    Project <SortIcon field="list" />
                  </button>
                </th>
                {/* Subtasks */}
                <th className="px-3 py-3 text-left w-24">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Subtasks
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sortedTasks.map((task) => (
                  <motion.tr
                    key={task.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors",
                      task.status === "DONE" && "opacity-60"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(task.id)}
                        onChange={() => toggleSelect(task.id)}
                        className="h-4 w-4 rounded border-2 border-gray-300 dark:border-gray-600 accent-primary cursor-pointer"
                      />
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() =>
                          updateField(task.id, "status", task.status === "DONE" ? "TODO" : "DONE")
                        }
                        className="hover:scale-110 transition-transform"
                      >
                        {STATUS_ICONS[task.status] || STATUS_ICONS.TODO}
                      </button>
                    </td>

                    {/* Title */}
                    <td className="px-3 py-2.5">
                      {editingCell?.taskId === task.id && editingCell?.field === "title" ? (
                        <Input
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          className="h-8 text-sm -my-1"
                        />
                      ) : (
                        <button
                          onClick={() => startEditing(task.id, "title", task.title)}
                          className={cn(
                            "text-left font-medium hover:text-primary transition-colors",
                            task.status === "DONE" && "line-through"
                          )}
                        >
                          {task.title}
                        </button>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-2.5">
                      <select
                        value={task.priority}
                        onChange={(e) => updateField(task.id, "priority", e.target.value)}
                        className={cn(
                          "text-[11px] font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer",
                          PRIORITY_CONFIG[task.priority]?.color
                        )}
                      >
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {PRIORITY_CONFIG[p]?.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Due Date */}
                    <td className="px-3 py-2.5">
                      <input
                        type="date"
                        value={task.dueAt ? format(new Date(task.dueAt), "yyyy-MM-dd") : ""}
                        onChange={(e) =>
                          updateField(task.id, "dueAt", e.target.value ? new Date(e.target.value).toISOString() : "")
                        }
                        className={cn(
                          "text-xs bg-transparent border-0 cursor-pointer hover:text-primary transition-colors",
                          task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "DONE"
                            ? "text-red-500"
                            : "text-muted-foreground"
                        )}
                      />
                    </td>

                    {/* Project */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: task.list.color || "#f97316" }}
                        />
                        <span className="text-xs text-muted-foreground truncate">{task.list.name}</span>
                      </div>
                    </td>

                    {/* Subtasks */}
                    <td className="px-3 py-2.5">
                      {task.subtaskCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden max-w-12">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${(task.subtaskCompletedCount / task.subtaskCount) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {task.subtaskCompletedCount}/{task.subtaskCount}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">--</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    {search ? "No tasks match your search" : "No tasks yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
