import { getCurrentUser } from "@/lib/api-auth";
import { getActivityLogs } from "@/lib/activity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/activity - Get recent activity logs
export async function GET(request: NextRequest) {
  const me = await getCurrentUser(request);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const entityType = searchParams.get("entityType") || undefined;
  const action = searchParams.get("action") || undefined;

  try {
    const result = await getActivityLogs({
      limit,
      offset,
      entityType,
      action,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

