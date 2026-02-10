import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/tasks/:id/dependencies - list dependencies for a task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  const [dependsOn, dependedOnBy] = await Promise.all([
    prisma.taskDependency.findMany({
      where: { taskId },
      include: {
        dependsOn: { select: { id: true, title: true, status: true, priority: true, dueAt: true } },
      },
    }),
    prisma.taskDependency.findMany({
      where: { dependsOnTaskId: taskId },
      include: {
        task: { select: { id: true, title: true, status: true, priority: true, dueAt: true } },
      },
    }),
  ]);

  return NextResponse.json({
    dependsOn: dependsOn.map((d) => ({ ...d.dependsOn, dependencyId: d.id, type: d.type })),
    dependedOnBy: dependedOnBy.map((d) => ({ ...d.task, dependencyId: d.id, type: d.type })),
  });
}

// POST /api/tasks/:id/dependencies - add a dependency
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;
  const { dependsOnTaskId, type = "BLOCKS" } = await req.json();

  if (!dependsOnTaskId) {
    return NextResponse.json({ error: "dependsOnTaskId is required" }, { status: 400 });
  }

  if (taskId === dependsOnTaskId) {
    return NextResponse.json({ error: "A task cannot depend on itself" }, { status: 400 });
  }

  // Check both tasks exist and belong to user
  const [task, depTask] = await Promise.all([
    prisma.task.findFirst({ where: { id: taskId, ownerId: user.id } }),
    prisma.task.findFirst({ where: { id: dependsOnTaskId, ownerId: user.id } }),
  ]);

  if (!task || !depTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Check for existing dependency
  const existing = await prisma.taskDependency.findUnique({
    where: { taskId_dependsOnTaskId: { taskId, dependsOnTaskId } },
  });

  if (existing) {
    return NextResponse.json({ error: "Dependency already exists" }, { status: 409 });
  }

  const dep = await prisma.taskDependency.create({
    data: { taskId, dependsOnTaskId, type },
  });

  return NextResponse.json(dep, { status: 201 });
}

// DELETE /api/tasks/:id/dependencies - remove a dependency
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dependencyId } = await req.json();

  if (!dependencyId) {
    return NextResponse.json({ error: "dependencyId is required" }, { status: 400 });
  }

  await prisma.taskDependency.delete({ where: { id: dependencyId } });

  return NextResponse.json({ success: true });
}
