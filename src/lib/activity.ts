import { prisma } from "@/lib/prisma";

type ActivityAction = "CREATE" | "UPDATE" | "DELETE";
type EntityType = "task" | "list" | "subtask" | "comment" | "attachment";

interface LogActivityParams {
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  entityTitle?: string;
  changes?: Record<string, { old: any; new: any }>;
}

/**
 * Log an activity event to the activity_logs table
 */
export async function logActivity({
  action,
  entityType,
  entityId,
  entityTitle,
  changes,
}: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entityType,
        entityId,
        entityTitle,
        changes: changes || null,
      },
    });
  } catch (error) {
    // Log but don't throw - activity logging should not break the main operation
    console.error("Failed to log activity:", error);
  }
}

/**
 * Get recent activity logs
 */
export async function getActivityLogs({
  limit = 50,
  offset = 0,
  entityType,
  action,
}: {
  limit?: number;
  offset?: number;
  entityType?: string;
  action?: string;
} = {}) {
  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  const [activities, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
      skip: offset,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    activities,
    total,
    hasMore: offset + activities.length < total,
  };
}

