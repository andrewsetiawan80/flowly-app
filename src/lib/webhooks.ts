import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type WebhookEvent =
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "task.completed"
  | "list.created"
  | "list.updated"
  | "list.deleted"
  | "subtask.created"
  | "subtask.updated"
  | "subtask.deleted"
  | "comment.created"
  | "comment.updated"
  | "comment.deleted";

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Generate a webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(
  event: WebhookEvent,
  data: any
): Promise<void> {
  try {
    // Find all active webhooks subscribed to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
      },
    });

    // Filter webhooks that are subscribed to this event
    const subscribedWebhooks = webhooks.filter((webhook: typeof webhooks[number]) => {
      const events = webhook.events as string[];
      return events.includes(event);
    });

    if (subscribedWebhooks.length === 0) return;

    const payload = {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);

    // Send webhooks in parallel (fire and forget)
    await Promise.allSettled(
      subscribedWebhooks.map(async (webhook: typeof subscribedWebhooks[number]) => {
        const signature = generateSignature(payloadString, webhook.secret);
        let success = false;
        let responseStatus: number | null = null;
        let responseBody: string | null = null;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-Webhook-Event": event,
            },
            body: payloadString,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          responseStatus = response.status;
          responseBody = await response.text().catch(() => null);
          success = response.ok;
        } catch (error: any) {
          responseBody = error.message || "Request failed";
          success = false;
        }

        // Log the webhook delivery
        await prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            event,
            payload,
            responseStatus,
            responseBody,
            success,
          },
        });

        // Update webhook status
        if (success) {
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              lastTriggeredAt: new Date(),
              failureCount: 0,
            },
          });
        } else {
          const newFailureCount = webhook.failureCount + 1;
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              failureCount: newFailureCount,
              // Disable after 10 consecutive failures
              isActive: newFailureCount < 10,
            },
          });
        }
      })
    );
  } catch (error) {
    // Log but don't throw - webhook failures should not break the main operation
    console.error("Failed to trigger webhooks:", error);
  }
}

