import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main(){
  const user = await prisma.user.upsert({ where: { email: "demo@example.com" }, update: {}, create: { email: "demo@example.com", name: "Demo User", passwordHash: await bcrypt.hash("demo123",10) } });
  const list = await prisma.list.create({ data: { name: "Inbox", ownerId: user.id } });
  await prisma.task.createMany({ data: [
    { title: "Welcome to Premium Tasks", ownerId: user.id, listId: list.id, notes: "Click me to open details" },
    { title: "Try dark mode", ownerId: user.id, listId: list.id },
    { title: "Open Command Palette (⌘K)", ownerId: user.id, listId: list.id }
  ]});
  console.log("Seeded demo user: demo@example.com / demo123");
}
main().finally(()=>prisma.$disconnect());
