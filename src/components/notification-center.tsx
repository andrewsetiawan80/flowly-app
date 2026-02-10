"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  FileText,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityTitle: string | null;
  changes: Record<string, { old: string; new: string }> | null;
  createdAt: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE: <Plus className="h-3.5 w-3.5 text-green-500" />,
  UPDATE: <Edit3 className="h-3.5 w-3.5 text-blue-500" />,
  DELETE: <Trash2 className="h-3.5 w-3.5 text-red-500" />,
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  task: <CheckCircle2 className="h-3.5 w-3.5" />,
  list: <FileText className="h-3.5 w-3.5" />,
  comment: <MessageSquare className="h-3.5 w-3.5" />,
  subtask: <CheckCircle2 className="h-3.5 w-3.5" />,
  attachment: <Paperclip className="h-3.5 w-3.5" />,
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activity?limit=30", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchActivities();
    // Poll every 30 seconds for new activity
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const formatAction = (item: ActivityItem) => {
    const verb = item.action === "CREATE" ? "Created" : item.action === "UPDATE" ? "Updated" : "Deleted";
    return `${verb} ${item.entityType}`;
  };

  const formatChanges = (changes: Record<string, { old: string; new: string }> | null) => {
    if (!changes) return null;
    const entries = Object.entries(changes);
    if (entries.length === 0) return null;
    return entries.map(([key, val]) => (
      <span key={key} className="text-[10px] text-muted-foreground">
        {key}: <span className="line-through">{String(val.old)}</span> → <span className="font-medium text-foreground">{String(val.new)}</span>
      </span>
    ));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(!open); setHasNew(false); }}
        className="relative p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {hasNew && (
          <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.97 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-white dark:bg-gray-900 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5">
              <h3 className="text-sm font-semibold">Activity</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Activity List */}
            <div className="overflow-y-auto max-h-[calc(70vh-50px)]">
              {loading && activities.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : activities.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No activity yet</div>
              ) : (
                <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                  {activities.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 flex-shrink-0">
                        {ACTION_ICONS[item.action] || ENTITY_ICONS[item.entityType]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs">
                          <span className="font-medium">{formatAction(item)}</span>
                          {item.entityTitle && (
                            <span className="text-muted-foreground"> &quot;{item.entityTitle}&quot;</span>
                          )}
                        </p>
                        {item.changes && (
                          <div className="flex flex-col gap-0.5 mt-1">
                            {formatChanges(item.changes as Record<string, { old: string; new: string }>)}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
