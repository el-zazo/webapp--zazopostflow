import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { signToken, createAuthResponse } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests / 15 minutes
  const rl = rateLimit(request, {
    windowMs: 15 * 60 * 1000,
    max: 5,
    identifier: "auth:login",
  });
  if (!rl.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many requests. Please try again later.",
        retryAfter: rl.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(5),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": rl.resetAt.toISOString(),
        },
      }
    );
  }

  try {
    const body = await request.json();

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    await dbConnect();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if account is active (email verified)
    if (!user.active) {
      return NextResponse.json(
        {
          success: false,
          error: "Please verify your email before logging in. Check your inbox.",
          notVerified: true,
        },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ── 2FA Check ────────────────────────────────────────────────────────
    // Si 2FA activé → ne pas encore connecter → demander le code 2FA
    if (user.two_factor_enabled) {
      return NextResponse.json({
        success: true,
        requires2FA: true,
        userId: user._id.toString(), // Temporaire pour le challenge
        message: "2FA code required",
      });
    }

    // Login normal → générer JWT
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    const userData = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      theme: user.theme,
    };

    return createAuthResponse(
      { success: true, data: { user: userData } },
      token
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
