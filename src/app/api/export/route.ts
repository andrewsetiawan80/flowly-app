import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/export - export all user data as JSON
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = req.nextUrl.searchParams.get("format") || "json";

  const [lists, tasks, tags] = await Promise.all([
    prisma.list.findMany({
      where: { ownerId: user.id },
      include: { children: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: { ownerId: user.id },
      include: {
        subtasks: true,
        tags: { include: { tag: true } },
        list: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tag.findMany({
      where: { ownerId: user.id },
    }),
  ]);

  if (format === "csv") {
    const csvRows = [
      "Title,Status,Priority,Due Date,Project,Notes,Tags,Created,Updated",
      ...tasks.map((t) => {
        const tags = t.tags.map((tt) => tt.tag.name).join(";");
        const escape = (s: string | null) => {
          if (!s) return "";
          return `"${s.replace(/"/g, '""')}"`;
        };
        return [
          escape(t.title),
          t.status,
          t.priority,
          t.dueAt ? new Date(t.dueAt).toISOString().split("T")[0] : "",
          escape(t.list?.name || ""),
          escape(t.notes),
          escape(tags),
          new Date(t.createdAt).toISOString(),
          new Date(t.updatedAt).toISOString(),
        ].join(",");
      }),
    ];

    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="flowly-export-${Date.now()}.csv"`,
      },
    });
  }

  const exportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    user: { email: user.email, name: user.name },
    projects: lists.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      color: l.color,
      type: l.type,
      parentId: l.parentId,
      createdAt: l.createdAt,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      notes: t.notes,
      status: t.status,
      priority: t.priority,
      dueAt: t.dueAt,
      projectName: t.list?.name,
      tags: t.tags.map((tt) => tt.tag.name),
      subtasks: t.subtasks.map((s) => ({
        title: s.title,
        completed: s.completed,
      })),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    tags: tags.map((t) => ({
      name: t.name,
      color: t.color,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="flowly-export-${Date.now()}.json"`,
    },
  });
}
