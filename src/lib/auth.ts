import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// ── [FIX #1] Suppression du fallback JWT secret ─────────────────────────
// Avant: const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";
// Si JWT_SECRET n'est pas défini, l'application doit refuser de démarrer
// plutôt que de tourner avec une clé publique permettant le forgeage de JWT.
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error(
    "FATAL: JWT_SECRET environment variable is not set. " +
    "Refusing to start with a hardcoded secret — this would allow anyone " +
    "who reads the source code to forge valid authentication tokens."
  );
}

const TOKEN_NAME = "postflow_token";
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ── Types ────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
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
    return jwt.verify(token, JWT_SECRET) as unknown as JWTPayload;
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

// ── [FIX #6] Vérification passwordChangedAt pour invalider les sessions ──
// Après un changement de mot de passe, les anciens JWT doivent être
// rejetés. On compare le champ `iat` du JWT avec `passwordChangedAt` du
// document utilisateur. Si le token a été émis AVANT le changement de
// mot de passe, l'authentification est refusée.

/**
 * Check if a JWT was issued before the user's last password change.
 * Returns true if the token should be rejected (password was changed after token issuance).
 */
function isTokenOutdated(
  decodedToken: JWTPayload,
  passwordChangedAt: Date | undefined | null
): boolean {
  if (!passwordChangedAt) return false; // No password change recorded — token is valid

  // JWT iat is in seconds since epoch; convert passwordChangedAt to the same unit
  const iatSeconds = decodedToken.iat as number | undefined;
  if (!iatSeconds) return false; // No iat claim — cannot determine, allow

  const changedSeconds = Math.floor(new Date(passwordChangedAt).getTime() / 1000);

  // Add a 1-second leeway to avoid timing edge cases
  return iatSeconds + 1 < changedSeconds;
}

// ── Auth with DB verification ────────────────────────────────────────

/**
 * Verify JWT AND check that the user still exists in DB.
 * Returns null if:
 *  - No token
 *  - Token invalid/expired
 *  - User deleted from DB (even if token is valid)
 *  - User inactive (email not verified)
 *  - [FIX #6] Password was changed after token was issued
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId) return null;

    // Verify user exists in DB — include passwordChangedAt for session invalidation
    await connectDB();
    const user = await User.findById(payload.userId)
      .select("_id email username active passwordChangedAt")
      .lean();

    if (!user) {
      console.warn(`[Auth] JWT valid but user ${payload.userId} not found in DB`);
      return null;
    }

    if (!user.active) {
      console.warn(`[Auth] JWT valid but user ${payload.userId} is not active`);
      return null;
    }

    // [FIX #6] Reject token if password was changed after this token was issued
    if (isTokenOutdated(payload, (user as Record<string, unknown>).passwordChangedAt as Date | undefined)) {
      console.warn(`[Auth] JWT rejected — password changed after token issuance for user ${payload.userId}`);
      return null;
    }

    const userId = (user as Record<string, unknown>)._id as { toString(): string };

    return {
      _id: userId.toString(),
      id: userId.toString(),
      userId: userId.toString(),
      email: (user as Record<string, unknown>).email as string,
      username: (user as Record<string, unknown>).username as string,
      active: (user as Record<string, unknown>).active as boolean,
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

    // Verify user exists in DB — include passwordChangedAt for session invalidation
    await connectDB();
    const user = await User.findById(payload.userId)
      .select("_id email username active passwordChangedAt")
      .lean();

    if (!user) {
      console.warn(`[Auth] JWT valid but user ${payload.userId} not found in DB`);
      return null;
    }

    if (!user.active) {
      console.warn(`[Auth] JWT valid but user ${payload.userId} is not active`);
      return null;
    }

    // [FIX #6] Reject token if password was changed after this token was issued
    if (isTokenOutdated(payload, (user as Record<string, unknown>).passwordChangedAt as Date | undefined)) {
      console.warn(`[Auth] JWT rejected — password changed after token issuance for user ${payload.userId}`);
      return null;
    }

    const userId = (user as Record<string, unknown>)._id as { toString(): string };

    return {
      _id: userId.toString(),
      id: userId.toString(),
      userId: userId.toString(),
      email: (user as Record<string, unknown>).email as string,
      username: (user as Record<string, unknown>).username as string,
      active: (user as Record<string, unknown>).active as boolean,
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
