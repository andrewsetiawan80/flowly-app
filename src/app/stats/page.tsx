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
  Zap, Trophy, PieChart as PieChartIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

const PRIORITY_COLORS = {
  URGENT: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#94a3b8",
};

const STATUS_COLORS = {
  completed: "#22c55e",
  inProgress: "#3b82f6",
  pending: "#94a3b8",
  overdue: "#ef4444",
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
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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

  // Prepare chart data
  const trendData = stats.dailyTrend.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }),
    Created: d.created,
    Completed: d.completed,
  }));

  const priorityData = [
    { name: "Urgent", value: stats.byPriority.URGENT, color: PRIORITY_COLORS.URGENT },
    { name: "High", value: stats.byPriority.HIGH, color: PRIORITY_COLORS.HIGH },
    { name: "Medium", value: stats.byPriority.MEDIUM, color: PRIORITY_COLORS.MEDIUM },
    { name: "Low", value: stats.byPriority.LOW, color: PRIORITY_COLORS.LOW },
  ].filter((d) => d.value > 0);

  const statusData = [
    { name: "Completed", value: stats.overview.completedTasks, color: STATUS_COLORS.completed },
    { name: "In Progress", value: stats.overview.inProgressTasks, color: STATUS_COLORS.inProgress },
    { name: "Pending", value: stats.overview.pendingTasks, color: STATUS_COLORS.pending },
    { name: "Overdue", value: stats.overview.overdueTasks, color: STATUS_COLORS.overdue },
  ].filter((d) => d.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-xl bg-white dark:bg-gray-800 p-3 shadow-xl border border-black/10 dark:border-white/10">
        <p className="text-xs font-semibold mb-1">{label}</p>
        {payload.map((item: any) => (
          <p key={item.name} className="text-xs" style={{ color: item.color }}>
            {item.name}: <span className="font-semibold">{item.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Statistics</h1>
            <p className="text-sm text-muted-foreground">Track your productivity</p>
          </div>
        </div>

        <div className="flex gap-2 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl p-1">
          {["today", "week", "month", "year"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                period === p
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Target, label: "Total Tasks", value: stats.overview.totalTasks, gradient: "from-blue-500/10 to-blue-600/5", iconBg: "bg-blue-500/20", iconColor: "text-blue-500" },
          { icon: CheckCircle2, label: "Completed", value: stats.overview.completedTasks, gradient: "from-emerald-500/10 to-emerald-600/5", iconBg: "bg-emerald-500/20", iconColor: "text-emerald-500" },
          { icon: Flame, label: "Day Streak", value: stats.overview.streak, gradient: "from-primary/10 to-primary/5", iconBg: "bg-primary/20", iconColor: "text-primary" },
          { icon: Trophy, label: "Completion Rate", value: `${stats.overview.completionRate}%`, gradient: "from-purple-500/10 to-purple-600/5", iconBg: "bg-purple-500/20", iconColor: "text-purple-500" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Card className={cn("bg-gradient-to-br", card.gradient)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", card.iconBg)}>
                    <card.icon className={cn("h-5 w-5", card.iconColor)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Area Chart - Daily Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Daily Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground, 128 128 128))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground, 128 128 128))" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Created"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorCreated)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Completed"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#colorCompleted)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Donut Chart - Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Task Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg bg-white dark:bg-gray-800 p-2 shadow-xl border border-black/10 dark:border-white/10">
                            <p className="text-xs font-semibold" style={{ color: data.color }}>
                              {data.name}: {data.value}
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-muted-foreground">
                      {item.name} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bar Chart - Priority Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4 text-primary" />
                Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg bg-white dark:bg-gray-800 p-2 shadow-xl border border-black/10 dark:border-white/10">
                            <p className="text-xs font-semibold" style={{ color: data.color }}>
                              {data.name}: {data.value}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Overdue
                </span>
                <Badge variant={stats.overview.overdueTasks > 0 ? "destructive" : "secondary"}>
                  {stats.overview.overdueTasks}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Due Today
                </span>
                <Badge variant="secondary">{stats.overview.dueToday}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-500" />
                  Due This Week
                </span>
                <Badge variant="secondary">{stats.overview.dueThisWeek}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-purple-500" />
                  Projects
                </span>
                <Badge variant="secondary">{stats.projects.total}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Focus Time
                </span>
                <Badge variant="secondary">
                  {Math.round(stats.focus.totalMinutes / 60)}h {stats.focus.totalMinutes % 60}m
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Completion Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-primary" />
                Completion Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks</span>
                  <span className="font-semibold">{stats.overview.completionRate}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.overview.completionRate}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtasks</span>
                  <span className="font-semibold">{stats.subtasks.rate}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.subtasks.rate}%` }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                  />
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground pt-2 border-t border-black/5 dark:border-white/5">
                {stats.overview.completedTasks} of {stats.overview.totalTasks} tasks completed
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
