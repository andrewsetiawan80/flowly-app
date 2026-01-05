"use client";

import { Task, Priority, Status } from "@prisma/client";
import { format } from "date-fns";
import { Calendar, Flag, ChevronRight, ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

interface TaskCardProps {
  task: Task & { 
    list?: { name: string; color: string | null };
    subtaskCount?: number;
    subtaskCompletedCount?: number;
  };
  onToggle?: (taskId: string, completed: boolean) => void;
  onClick?: () => void;
}

const priorityConfig = {
  LOW: {
    colors: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
  },
  MEDIUM: {
    colors: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  HIGH: {
    colors: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    dot: "bg-orange-500",
  },
  URGENT: {
    colors: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dot: "bg-red-500",
  },
};

export function TaskCard({ task, onToggle, onClick }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = task.status === "DONE";
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && !isCompleted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ 
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
      whileHover={{ scale: 1.01 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={cn(
          "group cursor-pointer transition-all duration-300",
          "border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02]",
          "hover:border-orange-500/20 hover:shadow-xl hover:shadow-orange-500/5",
          "hover:bg-white/80 dark:hover:bg-white/[0.04]",
          "relative overflow-hidden backdrop-blur-sm",
          isCompleted && "opacity-60 hover:opacity-80"
        )}
        onClick={onClick}
      >
        {/* Subtle gradient overlay on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-orange-500/[0.03] via-amber-500/[0.03] to-orange-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 relative z-10">
          <motion.div 
            className="pt-0.5"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Checkbox
              checked={isCompleted}
              onCheckedChange={(checked) => {
                onToggle?.(task.id, checked === true);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 rounded-md border-2 border-muted-foreground/30 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-orange-500 data-[state=checked]:to-amber-500 data-[state=checked]:border-orange-500 transition-all duration-200"
            />
          </motion.div>
          
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3
                className={cn(
                  "font-semibold text-[15px] leading-snug pr-2 transition-colors duration-200",
                  isCompleted 
                    ? "line-through text-muted-foreground/60" 
                    : "text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400"
                )}
              >
                {task.title}
              </h3>
              
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -8 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-5 w-5 text-orange-500/70 flex-shrink-0" />
              </motion.div>
            </div>

            {task.notes && (
              <p className="text-sm text-muted-foreground/70 line-clamp-2 leading-relaxed">
                {task.notes}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {task.priority !== "MEDIUM" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] px-2.5 py-0.5 rounded-lg border font-semibold uppercase tracking-wide",
                    priorityConfig[task.priority].colors
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", priorityConfig[task.priority].dot)} />
                  {task.priority}
                </Badge>
              )}

              {task.dueAt && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] px-2.5 py-0.5 rounded-lg border font-medium",
                    isOverdue 
                      ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" 
                      : "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-1.5 h-3 w-3" />
                  {format(new Date(task.dueAt), "MMM d")}
                </Badge>
              )}

              {task.list && (
                <Badge 
                  variant="secondary" 
                  className="text-[11px] px-2.5 py-0.5 rounded-lg font-medium bg-black/[0.03] dark:bg-white/[0.03] border-0"
                >
                  <div 
                    className="w-1.5 h-1.5 rounded-full mr-1.5"
                    style={{ backgroundColor: task.list.color || "#f97316" }}
                  />
                  {task.list.name}
                </Badge>
              )}

              {/* Subtask progress */}
              {task.subtaskCount && task.subtaskCount > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px] px-2.5 py-0.5 rounded-lg border font-medium",
                    task.subtaskCompletedCount === task.subtaskCount
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] text-muted-foreground"
                  )}
                >
                  <ListTodo className="mr-1.5 h-3 w-3" />
                  {task.subtaskCompletedCount}/{task.subtaskCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
