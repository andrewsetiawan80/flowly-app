import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

// Always cache the instance to prevent connection pool exhaustion
// In development, this prevents creating new clients on hot reload
// In production with standalone output, module cache handles this,
// but this is an extra safety net
globalForPrisma.prisma = prisma;
