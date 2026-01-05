"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, TrendingUp, Target, Flame, Clock, 
  CheckCircle2, AlertCircle, Calendar, FolderOpen,
  Zap, Trophy
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type StatsData = {
  overview: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    dueToday: number;
    dueThisWeek: number;
    completionRate: number;
    streak: number;
  };
  byPriority: {
    URGENT: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  subtasks: {
    total: number;
    completed: number;
    rate: number;
  };
  focus: {
    totalMinutes: number;
    sessionsCompleted: number;
    totalSessions: number;
  };
  projects: {
    total: number;
    checklists: number;
  };
  dailyTrend: Array<{
    date: string;
    created: number;
    completed: number;
  }>;
  period: string;
};

export default function StatsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  const fetchStats = useCallback(async () => {
    if (status !== "authenticated") return;

    setLoading(true);
    try {
      const res = await fetch(`/api/stats?period=${period}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, [status, period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <span className="text-muted-foreground">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    );
  }

  const maxDailyValue = Math.max(
    ...stats.dailyTrend.flatMap((d) => [d.created, d.completed]),
    1
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Statistics
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Track your productivity
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {["today", "week", "month", "year"].map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="capitalize"
            >
              {p}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.overview.totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.overview.completedTasks}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.overview.streak}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Trophy className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.overview.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Daily Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end gap-2">
                {stats.dailyTrend.map((day, i) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 h-32">
                      <div
                        className="flex-1 bg-blue-500/60 rounded-t"
                        style={{ height: `${(day.created / maxDailyValue) * 100}%` }}
                        title={`Created: ${day.created}`}
                      />
                      <div
                        className="flex-1 bg-emerald-500/60 rounded-t"
                        style={{ height: `${(day.completed / maxDailyValue) * 100}%` }}
                        title={`Completed: ${day.completed}`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500/60" />
                  <span className="text-xs text-muted-foreground">Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500/60" />
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Priority Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4" />
                Tasks by Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "URGENT", label: "Urgent", color: "bg-red-500" },
                { key: "HIGH", label: "High", color: "bg-orange-500" },
                { key: "MEDIUM", label: "Medium", color: "bg-yellow-500" },
                { key: "LOW", label: "Low", color: "bg-slate-400" },
              ].map((priority) => {
                const count = stats.byPriority[priority.key as keyof typeof stats.byPriority];
                const total = Object.values(stats.byPriority).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={priority.key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", priority.color)} />
                        {priority.label}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Overdue
                </span>
                <Badge variant={stats.overview.overdueTasks > 0 ? "destructive" : "secondary"}>
                  {stats.overview.overdueTasks}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Due Today
                </span>
                <Badge variant="secondary">{stats.overview.dueToday}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-500" />
                  Due This Week
                </span>
                <Badge variant="secondary">{stats.overview.dueThisWeek}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  In Progress
                </span>
                <Badge variant="secondary">{stats.overview.inProgressTasks}</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Projects & Focus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-4 w-4" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Projects</span>
                <Badge variant="secondary">{stats.projects.total}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Checklists</span>
                <Badge variant="secondary">{stats.projects.checklists}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtasks Completed</span>
                <Badge variant="secondary">
                  {stats.subtasks.completed}/{stats.subtasks.total}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Focus Time</span>
                <Badge variant="secondary">
                  {Math.round(stats.focus.totalMinutes / 60)}h {stats.focus.totalMinutes % 60}m
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

