import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/calendar/ical?token=xxx
 * Returns an iCalendar (.ics) feed of the user's tasks with due dates.
 * Authentication is via a per-user calendarToken (no session needed).
 * Users subscribe to this URL in Google Calendar / Apple Calendar / etc.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing token parameter", { status: 400 });
  }

  // Look up user by calendar token
  const user = await prisma.user.findFirst({
    where: { calendarToken: token },
  });

  if (!user) {
    return new NextResponse("Invalid token", { status: 401 });
  }

  // Fetch tasks with due dates
  const tasks = await prisma.task.findMany({
    where: {
      ownerId: user.id,
      dueAt: { not: null },
    },
    include: {
      list: { select: { name: true } },
    },
    orderBy: { dueAt: "asc" },
    take: 500,
  });

  // Build iCalendar
  const now = formatICalDate(new Date());
  const events = tasks.map((task) => {
    const dueDate = new Date(task.dueAt!);
    const uid = `${task.id}@flowly`;
    const summary = escapeICalText(task.title);
    const description = escapeICalText(
      [
        task.notes || "",
        `Priority: ${task.priority}`,
        `Status: ${task.status}`,
        task.list ? `Project: ${task.list.name}` : "",
      ]
        .filter(Boolean)
        .join("\\n")
    );

    // All-day event for the due date
    const dtStart = formatICalDateOnly(dueDate);

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `STATUS:${task.status === "DONE" ? "COMPLETED" : "NEEDS-ACTION"}`,
      task.priority === "URGENT" || task.priority === "HIGH"
        ? "PRIORITY:1"
        : task.priority === "MEDIUM"
          ? "PRIORITY:5"
          : "PRIORITY:9",
      "END:VEVENT",
    ].join("\r\n");
  });

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Flowly//Task Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Flowly Tasks",
    "X-WR-TIMEZONE:UTC",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="flowly-tasks.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function formatICalDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
