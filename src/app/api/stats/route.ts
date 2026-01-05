import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/stats - Get comprehensive productivity statistics
export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "week"; // 'today', 'week', 'month', 'year', 'all'

  // Calculate date range
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate = new Date(0); // All time
  }

  try {
    // Get all tasks for the user
    const allTasks = await prisma.task.findMany({
      where: { ownerId: me.id },
      include: { subtasks: true },
    });

    type TaskType = typeof allTasks[number];

    // Tasks in period
    const tasksInPeriod = allTasks.filter(
      (t: TaskType) => new Date(t.createdAt) >= startDate
    );
    const completedInPeriod = allTasks.filter(
      (t: TaskType) => t.status === "DONE" && t.completedAt && new Date(t.completedAt) >= startDate
    );

    // Overall stats
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t: TaskType) => t.status === "DONE").length;
    const pendingTasks = allTasks.filter((t: TaskType) => t.status === "TODO").length;
    const inProgressTasks = allTasks.filter((t: TaskType) => t.status === "DOING").length;

    // Overdue tasks
    const overdueTasks = allTasks.filter(
      (t: TaskType) => t.dueAt && new Date(t.dueAt) < now && t.status !== "DONE" && t.status !== "CANCELED"
    ).length;

    // Due today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const dueToday = allTasks.filter(
      (t: TaskType) => t.dueAt && new Date(t.dueAt) >= todayStart && new Date(t.dueAt) < todayEnd && t.status !== "DONE"
    ).length;

    // This week due
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);
    const dueThisWeek = allTasks.filter(
      (t: TaskType) => t.dueAt && new Date(t.dueAt) >= now && new Date(t.dueAt) < weekEnd && t.status !== "DONE"
    ).length;

    // Completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Tasks by priority
    const byPriority = {
      URGENT: allTasks.filter((t: TaskType) => t.priority === "URGENT" && t.status !== "DONE").length,
      HIGH: allTasks.filter((t: TaskType) => t.priority === "HIGH" && t.status !== "DONE").length,
      MEDIUM: allTasks.filter((t: TaskType) => t.priority === "MEDIUM" && t.status !== "DONE").length,
      LOW: allTasks.filter((t: TaskType) => t.priority === "LOW" && t.status !== "DONE").length,
    };

    // Subtask stats
    const totalSubtasks = allTasks.reduce((sum: number, t: TaskType) => sum + t.subtasks.length, 0);
    const completedSubtasks = allTasks.reduce(
      (sum: number, t: TaskType) => sum + t.subtasks.filter((s: { completed: boolean }) => s.completed).length,
      0
    );

    // Daily completion trend (last 7 days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const created = allTasks.filter(
        (t: TaskType) => new Date(t.createdAt) >= dayStart && new Date(t.createdAt) < dayEnd
      ).length;
      const completed = allTasks.filter(
        (t: TaskType) => t.completedAt && new Date(t.completedAt) >= dayStart && new Date(t.completedAt) < dayEnd
      ).length;

      dailyTrend.push({
        date: dayStart.toISOString().split("T")[0],
        created,
        completed,
      });
    }

    // Focus sessions stats
    const focusSessions = await prisma.focusSession.findMany({
      where: {
        ownerId: me.id,
        startedAt: { gte: startDate },
      },
    });

    type FocusSessionType = typeof focusSessions[number];

    const totalFocusMinutes = focusSessions.reduce(
      (sum: number, s: FocusSessionType) => sum + (s.actualMinutes || 0),
      0
    );
    const completedSessions = focusSessions.filter((s: FocusSessionType) => s.completed).length;

    // Projects/lists count
    const projectCount = await prisma.list.count({
      where: { ownerId: me.id, type: "PROJECT" },
    });
    const checklistCount = await prisma.list.count({
      where: { ownerId: me.id, type: "CHECKLIST" },
    });

    // Streak calculation (consecutive days with completed tasks)
    let streak = 0;
    let checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);

    while (true) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const hasCompletion = allTasks.some(
        (t: TaskType) => t.completedAt && new Date(t.completedAt) >= dayStart && new Date(t.completedAt) < dayEnd
      );

      if (hasCompletion) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (checkDate.getTime() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
        // Today - no completion yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }

      // Safety limit
      if (streak > 365) break;
    }

    return NextResponse.json({
      overview: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        dueToday,
        dueThisWeek,
        completionRate,
        streak,
      },
      byPriority,
      subtasks: {
        total: totalSubtasks,
        completed: completedSubtasks,
        rate: totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0,
      },
      focus: {
        totalMinutes: totalFocusMinutes,
        sessionsCompleted: completedSessions,
        totalSessions: focusSessions.length,
      },
      projects: {
        total: projectCount,
        checklists: checklistCount,
      },
      dailyTrend,
      period,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

