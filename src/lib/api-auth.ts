import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const API_SECRET = process.env.API_SECRET;
const DEFAULT_USER_EMAIL = process.env.DEFAULT_API_USER_EMAIL || "demo@example.com";

// In-memory user cache to avoid repeated DB lookups (1 min TTL)
const userCache = new Map<string, { user: any; expiry: number }>();
const CACHE_TTL = 60_000; // 1 minute

async function getCachedUser(email: string) {
  const cached = userCache.get(email);
  if (cached && Date.now() < cached.expiry) return cached.user;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    userCache.set(email, { user, expiry: Date.now() + CACHE_TTL });
  }
  return user;
}

// Evict stale entries periodically (max 1000 entries)
function pruneCache() {
  if (userCache.size > 1000) {
    const now = Date.now();
    for (const [key, val] of userCache) {
      if (now >= val.expiry) userCache.delete(key);
    }
  }
}

/**
 * Get the current user from either:
 * 1. API key authentication (x-api-key header) - for service-to-service calls
 * 2. Session-based authentication - for browser requests
 */
export async function getCurrentUser(request?: NextRequest) {
  pruneCache();

  // Check for API key authentication (service-to-service)
  if (request && API_SECRET) {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey === API_SECRET) {
      return getCachedUser(DEFAULT_USER_EMAIL);
    }
  }

  // Fall back to session-based auth
  const session = await auth();
  if (!session?.user?.email) return null;

  return getCachedUser(session.user.email);
}
