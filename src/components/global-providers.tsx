"use client";

import { useState, createContext, useContext, ReactNode } from "react";
import { Priority } from "@prisma/client";
import { ToastProvider } from "@/components/toast-provider";
import { CommandPalette } from "@/components/command-palette";
import { TaskForm } from "@/components/task-form";

interface GlobalContextType {
  openTaskForm: () => void;
  closeTaskForm: () => void;
}

const GlobalContext = createContext<GlobalContextType | null>(null);

export function useGlobal() {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobal must be used within GlobalProviders");
  }
  return context;
}

export function GlobalProviders({ children }: { children: ReactNode }) {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);

  const openTaskForm = async () => {
    // Fetch lists first
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error("Failed to fetch lists:", error);
    }
    setIsTaskFormOpen(true);
  };

  const closeTaskForm = () => {
    setIsTaskFormOpen(false);
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
        closeTaskForm();
        // Refresh the page to show the new task
        window.location.reload();
      } else {
        throw new Error("Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
    }
  };

  return (
    <GlobalContext.Provider value={{ openTaskForm, closeTaskForm }}>
      <ToastProvider>
        {children}
        <CommandPalette onCreateTask={openTaskForm} />
        <TaskForm
          open={isTaskFormOpen}
          onOpenChange={setIsTaskFormOpen}
          onSubmit={handleCreateTask}
          lists={lists}
          defaultListId={lists[0]?.id}
        />
      </ToastProvider>
    </GlobalContext.Provider>
  );
}

