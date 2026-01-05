import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/webhooks/:id/test - Send a test event to the webhook
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const payload = {
      id: crypto.randomUUID(),
      event: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook event from Flowly",
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(payloadString)
      .digest("hex");

    let success = false;
    let responseStatus: number | null = null;
    let responseBody: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": "test",
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

    // Log the test delivery
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event: "test",
        payload,
        responseStatus,
        responseBody,
        success,
      },
    });

    return NextResponse.json({
      success,
      responseStatus,
      responseBody,
    });
  } catch (error) {
    console.error("Error testing webhook:", error);
    return NextResponse.json(
      { error: "Failed to test webhook" },
      { status: 500 }
    );
  }
}

