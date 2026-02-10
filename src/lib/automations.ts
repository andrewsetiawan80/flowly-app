import { prisma } from "@/lib/prisma";

export type AutomationEvent =
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.deleted"
  | "task.overdue"
  | "list.created"
  | "list.updated"
  | "list.deleted";

export interface AutomationTrigger {
  event: AutomationEvent;
  conditions?: AutomationCondition[];
}

export interface AutomationCondition {
  field: string;   // 'priority', 'status', 'listId', 'title'
  operator: string; // 'equals', 'not_equals', 'contains', 'gte', 'lte'
  value: string;
}

export interface AutomationAction {
  type: string;
  params: Record<string, any>;
}

// Supported action types
export const ACTION_TYPES = {
  CHANGE_STATUS: "change_status",
  CHANGE_PRIORITY: "change_priority",
  MOVE_TO_PROJECT: "move_to_project",
  ASSIGN_TO_USER: "assign_to_user",
  SEND_SLACK: "send_slack",
} as const;

// Supported trigger events with labels
export const TRIGGER_EVENTS: { value: AutomationEvent; label: string }[] = [
  { value: "task.created", label: "When a task is created" },
  { value: "task.completed", label: "When a task is completed" },
  { value: "task.updated", label: "When a task is updated" },
  { value: "task.overdue", label: "When a task becomes overdue" },
  { value: "list.created", label: "When a project is created" },
];

// Priority ordering for gte/lte comparisons
const PRIORITY_ORDER: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

/**
 * Evaluate a single condition against entity data
 */
function evaluateCondition(condition: AutomationCondition, data: Record<string, any>): boolean {
  const fieldValue = data[condition.field];
  if (fieldValue === undefined || fieldValue === null) return false;

  const strValue = String(fieldValue);
  const condValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return strValue === condValue;
    case "not_equals":
      return strValue !== condValue;
    case "contains":
      return strValue.toLowerCase().includes(condValue.toLowerCase());
    case "gte":
      if (condition.field === "priority") {
        return (PRIORITY_ORDER[strValue] || 0) >= (PRIORITY_ORDER[condValue] || 0);
      }
      return strValue >= condValue;
    case "lte":
      if (condition.field === "priority") {
        return (PRIORITY_ORDER[strValue] || 0) <= (PRIORITY_ORDER[condValue] || 0);
      }
      return strValue <= condValue;
    default:
      return false;
  }
}

/**
 * Execute an automation action on a task
 */
async function executeAction(action: AutomationAction, entityData: Record<string, any>): Promise<void> {
  const taskId = entityData.id;
  if (!taskId) return;

  switch (action.type) {
    case ACTION_TYPES.CHANGE_STATUS:
      await prisma.task.update({
        where: { id: taskId },
        data: { status: action.params.status },
      });
      break;

    case ACTION_TYPES.CHANGE_PRIORITY:
      await prisma.task.update({
        where: { id: taskId },
        data: { priority: action.params.priority },
      });
      break;

    case ACTION_TYPES.MOVE_TO_PROJECT:
      await prisma.task.update({
        where: { id: taskId },
        data: { listId: action.params.listId },
      });
      break;

    case ACTION_TYPES.ASSIGN_TO_USER:
      await prisma.task.update({
        where: { id: taskId },
        data: { assigneeId: action.params.userId },
      });
      break;

    case ACTION_TYPES.SEND_SLACK:
      // Slack notifications are handled separately via the slack helper
      const { sendSlackNotification } = await import("@/lib/slack");
      const user = await prisma.user.findFirst({
        where: { id: entityData.ownerId },
      });
      if (user?.settings) {
        const settings = user.settings as any;
        if (settings.slackWebhookUrl) {
          const message = action.params.message || `Automation triggered for task: ${entityData.title}`;
          await sendSlackNotification(settings.slackWebhookUrl, {
            text: message,
            taskTitle: entityData.title,
            taskStatus: entityData.status,
            taskPriority: entityData.priority,
            event: "automation",
          });
        }
      }
      break;

    default:
      console.warn(`Unknown automation action type: ${action.type}`);
  }
}

/**
 * Main entry point: evaluate and execute all matching automations for an event
 */
export async function triggerAutomations(
  event: AutomationEvent,
  data: Record<string, any>,
  ownerId?: string
): Promise<void> {
  try {
    // Find all active automations that match this event
    const automations = await prisma.automation.findMany({
      where: {
        isActive: true,
        ...(ownerId ? { ownerId } : {}),
      },
    });

    for (const automation of automations) {
      try {
        const trigger = automation.trigger as unknown as AutomationTrigger;
        const action = automation.action as unknown as AutomationAction;

        // Check if this automation's trigger event matches
        if (trigger.event !== event) continue;

        // Check if owner matches (automation only runs for its owner's data)
        if (ownerId && automation.ownerId !== ownerId) continue;

        // Evaluate conditions
        const conditions = trigger.conditions || [];
        const allMatch = conditions.every((c) => evaluateCondition(c, data));
        if (!allMatch) continue;

        // Execute the action
        await executeAction(action, data);

        // Log success and update counters
        await prisma.$transaction([
          prisma.automationLog.create({
            data: {
              automationId: automation.id,
              event,
              success: true,
              data: { taskId: data.id, title: data.title },
            },
          }),
          prisma.automation.update({
            where: { id: automation.id },
            data: {
              lastTriggeredAt: new Date(),
              triggerCount: { increment: 1 },
            },
          }),
        ]);
      } catch (err) {
        // Log failure for this specific automation
        await prisma.automationLog.create({
          data: {
            automationId: automation.id,
            event,
            success: false,
            error: err instanceof Error ? err.message : String(err),
            data: { taskId: data.id, title: data.title },
          },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Automation engine error:", err);
  }
}
