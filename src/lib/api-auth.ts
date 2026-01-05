import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const API_SECRET = process.env.API_SECRET;
const DEFAULT_USER_EMAIL = process.env.DEFAULT_API_USER_EMAIL || "demo@example.com";

/**
 * Get the current user from either:
 * 1. API key authentication (x-api-key header) - for service-to-service calls
 * 2. Session-based authentication - for browser requests
 */
export async function getCurrentUser(request?: NextRequest) {
  // Check for API key authentication (service-to-service)
  if (request && API_SECRET) {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey === API_SECRET) {
      // Return the default API user
      const user = await prisma.user.findUnique({
        where: { email: DEFAULT_USER_EMAIL },
      });
      return user;
    }
  }

  // Fall back to session-based auth
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  return user;
}

