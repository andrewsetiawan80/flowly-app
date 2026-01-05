"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Task, Priority } from "@prisma/client";
import { TaskForm } from "@/components/task-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

type TaskWithList = Task & {
  list?: { name: string; color: string | null };
};

export default function MyDay() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<TaskWithList[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchTasks = async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/tasks", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      } else if (res.status === 401) {
        setTasks([]);
      }
    } catch (error) {
      // Silently fail
      setTasks([]);
    }
  };

  const fetchLists = async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/lists", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
      } else if (res.status === 401) {
        setLists([]);
      }
    } catch (error) {
      // Silently fail
      setLists([]);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchTasks();
      fetchLists();
    }
  }, [status]);

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
        await fetchTasks();
      } else {
        throw new Error("Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      throw error;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const todayDate = format(new Date(), "EEE d MMMM").toUpperCase();

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <h1 className="text-4xl xl:text-5xl font-light text-foreground">
          {getGreeting()}
        </h1>
        <p className="text-lg text-muted-foreground">
          Time to add your first task
        </p>
      </div>

      <Card className="border-border/30 bg-muted/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              {todayDate}
            </div>
            <div className="space-y-3">
              <p className="text-base text-foreground">
                Join video meetings with one tap
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm border-primary/30 text-primary hover:bg-primary/10"
                >
                  Connect Google Calendar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm border-primary/30 text-primary hover:bg-primary/10"
                >
                  Connect Outlook Calendar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm border-primary/30 text-primary hover:bg-primary/10"
                >
                  Connect iCloud Calendar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-8">
        <Button
          onClick={() => setIsFormOpen(true)}
          size="lg"
          className="text-base font-medium"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add task
        </Button>
      </div>

      <TaskForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreateTask}
        lists={lists}
        defaultListId={lists[0]?.id}
      />
    </div>
  );
}

