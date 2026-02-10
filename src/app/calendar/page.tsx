"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Task, Priority } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, ChevronLeft, ChevronRight, Plus,
  Circle, CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { triggerRefresh, REFRESH_EVENTS } from "@/lib/events";
import { cn } from "@/lib/utils";
import { TaskForm } from "@/components/task-form";
import { TaskDetailPanel } from "@/components/task-detail-panel";

type TaskWithList = Task & {
  list?: { id: string; name: string; color: string | null };
};

const PRIORITY_COLORS: Record<Priority, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-slate-400",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithList | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.dueAt) return false;
      const taskDate = new Date(task.dueAt);
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
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
        body: JSON.stringify({
          ...data,
          dueAt: selectedDate?.toISOString() || data.dueAt,
        }),
      });

      if (res.ok) {
        triggerRefresh("ALL");
        setIsFormOpen(false);
        setSelectedDate(null);
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsFormOpen(true);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-muted-foreground">Loading calendar...</span>
        </div>
      </div>
    );
  }

  const calendarDays = getCalendarDays();

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Calendar
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              View tasks by due date
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Month Title */}
      <div className="text-center">
        <h2 className="text-xl font-semibold">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-muted/50">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-muted-foreground border-b"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const dayTasks = date ? getTasksForDate(date) : [];
              const completedCount = dayTasks.filter((t) => t.status === "DONE").length;

              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[100px] md:min-h-[120px] p-2 border-b border-r last:border-r-0",
                    "hover:bg-muted/30 transition-colors cursor-pointer",
                    date && isToday(date) && "bg-primary/5"
                  )}
                  onClick={() => date && handleDateClick(date)}
                >
                  {date && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isToday(date) &&
                              "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                          )}
                        >
                          {date.getDate()}
                        </span>
                        {dayTasks.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {completedCount}/{dayTasks.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        {dayTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskClick(task);
                            }}
                            className={cn(
                              "flex items-center gap-1 p-1 rounded text-xs truncate",
                              "hover:bg-muted transition-colors",
                              task.status === "DONE" && "opacity-50"
                            )}
                          >
                            {task.status === "DONE" ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full flex-shrink-0",
                                  PRIORITY_COLORS[task.priority]
                                )}
                              />
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-muted-foreground pl-3">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <TaskForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedDate(null);
        }}
        onSubmit={handleCreateTask}
        lists={lists}
        defaultDueAt={selectedDate?.toISOString()}
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

