"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { format, addDays, differenceInDays, startOfDay, endOfDay, isToday, isBefore, isAfter, startOfWeek, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Flag, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  createdAt: string;
  list?: { id: string; name: string; color: string | null };
}

const priorityColors: Record<string, string> = {
  LOW: "#3b82f6",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  URGENT: "#ef4444",
};

const statusColors: Record<string, string> = {
  TODO: "#94a3b8",
  DOING: "#3b82f6",
  DONE: "#22c55e",
  CANCELED: "#6b7280",
};

export default function TimelinePage() {
  const { status: authStatus } = useSession();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date()));
  const [daysToShow, setDaysToShow] = useState(28); // 4 weeks
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetch("/api/tasks?limit=500", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [authStatus]);

  const days = useMemo(() => {
    return Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
  }, [startDate, daysToShow]);

  // Tasks with dates (use dueAt or createdAt as fallback)
  const tasksWithDates = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "CANCELED")
      .map((t) => {
        const start = new Date(t.createdAt);
        const end = t.dueAt ? new Date(t.dueAt) : addDays(start, 3);
        return { ...t, startDate: start, endDate: end };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [tasks]);

  // Group by project
  const groupedTasks = useMemo(() => {
    const groups: Record<string, { name: string; color: string; tasks: typeof tasksWithDates }> = {};

    tasksWithDates.forEach((t) => {
      const key = t.list?.id || "no-project";
      if (!groups[key]) {
        groups[key] = {
          name: t.list?.name || "No Project",
          color: t.list?.color || "#94a3b8",
          tasks: [],
        };
      }
      groups[key].tasks.push(t);
    });

    return Object.values(groups);
  }, [tasksWithDates]);

  const dayWidth = 40;
  const rowHeight = 36;

  const getBarPosition = (taskStart: Date, taskEnd: Date) => {
    const startOffset = Math.max(0, differenceInDays(taskStart, startDate));
    const endOffset = Math.min(daysToShow, differenceInDays(taskEnd, startDate) + 1);
    const left = startOffset * dayWidth;
    const width = Math.max(dayWidth, (endOffset - startOffset) * dayWidth);
    return { left, width };
  };

  const navigateWeeks = (dir: number) => {
    setStartDate((prev) => addWeeks(prev, dir));
  };

  const goToToday = () => {
    setStartDate(startOfWeek(new Date()));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-black/5 dark:bg-white/5 rounded-lg animate-pulse" />
        <div className="h-[400px] bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Timeline</h1>
            <p className="text-sm text-muted-foreground">
              {format(startDate, "MMM d")} - {format(addDays(startDate, daysToShow - 1), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateWeeks(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeeks(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <select
            value={daysToShow}
            onChange={(e) => setDaysToShow(Number(e.target.value))}
            className="h-8 px-2 text-sm rounded-md border bg-background"
          >
            <option value={14}>2 weeks</option>
            <option value={28}>4 weeks</option>
            <option value={56}>8 weeks</option>
            <option value={90}>3 months</option>
          </select>
        </div>
      </motion.div>

      {/* Gantt Chart */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto" ref={scrollRef}>
          <div style={{ minWidth: daysToShow * dayWidth + 200 }}>
            {/* Day headers */}
            <div className="flex border-b border-black/5 dark:border-white/5 sticky top-0 bg-background z-10">
              <div className="w-[200px] flex-shrink-0 p-2 text-xs font-semibold text-muted-foreground border-r border-black/5 dark:border-white/5">
                Task
              </div>
              <div className="flex">
                {days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const today = isToday(day);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 text-center border-r border-black/[0.03] dark:border-white/[0.03] py-1",
                        isWeekend && "bg-black/[0.02] dark:bg-white/[0.02]",
                        today && "bg-primary/5"
                      )}
                      style={{ width: dayWidth }}
                    >
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {format(day, "EEE")}
                      </div>
                      <div className={cn("text-xs font-semibold", today && "text-primary")}>
                        {format(day, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task rows grouped by project */}
            {groupedTasks.map((group, gi) => (
              <div key={gi}>
                {/* Group header */}
                <div className="flex border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="w-[200px] flex-shrink-0 p-2 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="text-xs font-bold truncate">{group.name}</span>
                    <span className="text-[10px] text-muted-foreground">({group.tasks.length})</span>
                  </div>
                  <div className="flex-1" />
                </div>

                {/* Task bars */}
                {group.tasks.map((task) => {
                  const { left, width } = getBarPosition(task.startDate, task.endDate);
                  const barColor = task.status === "DONE"
                    ? statusColors.DONE
                    : priorityColors[task.priority] || "#94a3b8";
                  const isDone = task.status === "DONE";
                  const isOverdue = task.dueAt && isBefore(new Date(task.dueAt), new Date()) && !isDone;

                  return (
                    <div
                      key={task.id}
                      className="flex border-b border-black/[0.03] dark:border-white/[0.03] hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
                      style={{ height: rowHeight }}
                    >
                      <div className="w-[200px] flex-shrink-0 px-2 flex items-center gap-2 border-r border-black/5 dark:border-white/5">
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: barColor }}
                        />
                        <span className={cn(
                          "text-xs truncate",
                          isDone && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </span>
                      </div>
                      <div className="flex-1 relative">
                        {/* Today line */}
                        {days.some(isToday) && (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-primary/50 z-10"
                            style={{ left: differenceInDays(startOfDay(new Date()), startDate) * dayWidth + dayWidth / 2 }}
                          />
                        )}
                        {/* Task bar */}
                        <div
                          className={cn(
                            "absolute top-1.5 rounded-md h-[22px] flex items-center px-2 text-white text-[10px] font-medium cursor-pointer transition-opacity",
                            isDone ? "opacity-50" : "opacity-90 hover:opacity-100",
                            isOverdue && "ring-2 ring-red-500/50"
                          )}
                          style={{
                            left,
                            width: Math.max(width, 24),
                            backgroundColor: barColor,
                          }}
                          title={`${task.title}${task.dueAt ? ` - Due: ${format(new Date(task.dueAt), "MMM d")}` : ""}`}
                        >
                          <span className="truncate">{width > 80 ? task.title : ""}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {groupedTasks.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No tasks to display. Create tasks with due dates to see them on the timeline.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="font-semibold">Priority:</span>
        {Object.entries(priorityColors).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: color }} />
            {name}
          </div>
        ))}
        <span className="ml-4 font-semibold">Status:</span>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: statusColors.DONE }} />
          Done
        </div>
      </div>
    </div>
  );
}
