import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";
const TOKEN_NAME = "postflow_token";
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ── Types ────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

export interface AuthUser {
  _id: string;
  id: string;
  userId: string;
  email: string;
  username: string;
  active: boolean;
}

// ── JWT helpers (pure, no DB) ────────────────────────────────────────

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_MAX_AGE,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ───────────────────────────────────────────────────

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
}

export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

export function getTokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(TOKEN_NAME)?.value;
}

// ── Auth with DB verification ────────────────────────────────────────

/**
 * Verify JWT AND check that the user still exists in DB.
 * Returns null if:
 *  - No token
 *  - Token invalid/expired
 *  - User deleted from DB (even if token is valid)
 *  - User inactive (email not verified)
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId) return null;

    // Verify user exists in DB
    await connectDB();
    const user = await User.findById(payload.userId)
      .select("_id email username active")
      .lean();

    if (!user) {
      console.warn(`[Auth] JWT valid but user ${payload.userId} not found in DB`);
      return null;
    }

    if (!user.active) {
      console.warn(`[Auth] JWT valid but user ${payload.userId} is not active`);
      return null;
    }

    return {
      _id: (user as any)._id.toString(),
      id: (user as any)._id.toString(),
      userId: (user as any)._id.toString(),
      email: (user as any).email,
      username: (user as any).username,
      active: (user as any).active,
    };
  } catch (error) {
    console.error("[Auth] getAuthUser error:", error);
    return null;
  }
}

/**
 * Verify JWT from request AND check user exists in DB.
 * Used by API routes that receive a NextRequest.
 */
export async function getAuthUserFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId) return null;

    // Verify user exists in DB
    await connectDB();
    const user = await User.findById(payload.userId)
      .select("_id email username active")
      .lean();

    if (!user) {
      console.warn(`[Auth] JWT valid but user ${payload.userId} not found in DB`);
      return null;
    }

    if (!user.active) {
      console.warn(`[Auth] JWT valid but user ${payload.userId} is not active`);
      return null;
    }

    return {
      _id: (user as any)._id.toString(),
      id: (user as any)._id.toString(),
      userId: (user as any)._id.toString(),
      email: (user as any).email,
      username: (user as any).username,
      active: (user as any).active,
    };
  } catch (error) {
    console.error("[Auth] getAuthUserFromRequest error:", error);
    return null;
  }
}

// ── requireAuth helper ───────────────────────────────────────────────

/**
 * Middleware helper - returns 401 if not authenticated.
 * Verifies JWT + checks user exists in DB.
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      ),
    };
  }

  return { user };
}

// ── Response helpers ─────────────────────────────────────────────────

export function createAuthResponse(
  data: Record<string, unknown>,
  token: string,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  response.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
  return response;
}

export function createLogoutResponse(): NextResponse {
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  // Clear the main auth cookie
  response.cookies.delete(TOKEN_NAME);

  // Also clear any fallback cookie names by setting them to expired
  const expiredOptions = {
    expires: new Date(0),
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
  response.cookies.set("token", "", expiredOptions);
  response.cookies.set("auth-token", "", expiredOptions);
  response.cookies.set("jwt", "", expiredOptions);
  response.cookies.set("session", "", expiredOptions);

  return response;
}
