"use client";

import { motion } from "framer-motion";
import { LucideIcon, Plus, Inbox, CheckCircle2, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: "tasks" | "lists" | "search" | "completed";
}

const illustrations = {
  tasks: (
    <div className="relative w-32 h-32">
      {/* Floating task cards */}
      <motion.div
        className="absolute top-0 left-4 w-20 h-6 bg-primary/20 dark:bg-primary/10 rounded-lg"
        animate={{ y: [0, -5, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-8 left-8 w-24 h-6 bg-primary/30 dark:bg-primary/15 rounded-lg"
        animate={{ y: [0, -8, 0], rotate: [2, -2, 2] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      <motion.div
        className="absolute top-16 left-2 w-28 h-6 bg-primary/40 dark:bg-primary/20 rounded-lg"
        animate={{ y: [0, -6, 0], rotate: [-1, 1, -1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      {/* Decorative circles */}
      <motion.div
        className="absolute -top-4 -right-4 w-8 h-8 bg-primary/20 rounded-full"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-0 -left-4 w-6 h-6 bg-primary/20 rounded-full"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      />
    </div>
  ),
  lists: (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Inbox className="w-16 h-16 text-primary/40" />
      </motion.div>
      <motion.div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-full"
        animate={{ scaleX: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  ),
  search: (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Search className="w-16 h-16 text-primary/40" />
      </motion.div>
      <motion.div
        className="absolute top-2 right-2 w-4 h-4 bg-primary/20 rounded-full"
        animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-4 left-4 w-3 h-3 bg-primary/20 rounded-full"
        animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
      />
    </div>
  ),
  completed: (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, 10, 0] }}
        transition={{ duration: 0.5, type: "spring", rotate: { duration: 2, repeat: Infinity } }}
      >
        <CheckCircle2 className="w-20 h-20 text-emerald-500/40" />
      </motion.div>
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        animate={{ y: [0, -20], opacity: [1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
      >
        ✨
      </motion.div>
    </div>
  ),
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  type = "tasks",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        className="mb-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {illustrations[type]}
      </motion.div>

      <motion.h3
        className="text-xl font-bold mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {title}
      </motion.h3>

      <motion.p
        className="text-sm text-muted-foreground mb-6 max-w-xs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {description}
      </motion.p>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={action.onClick}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

