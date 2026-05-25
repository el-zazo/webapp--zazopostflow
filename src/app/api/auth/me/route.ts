import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthUser } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 60000, max: 60, identifier: "auth:me" });
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
          "X-RateLimit-Limit": String(60),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": rl.resetAt.toISOString(),
        },
      }
    );
  }

  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Fetch full user data from DB (authUser already verified existence)
    const dbUser = await User.findById(authUser.userId)
      .select("-password -resetToken -resetTokenExpiry -email_verification_token -email_verification_expires -delete_account_token -delete_account_expires -delete_account_requested_at -two_factor_secret -two_factor_backup_codes -disable_2fa_token -disable_2fa_expires");

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: dbUser._id.toString(),
          username: dbUser.username,
          email: dbUser.email,
          avatar: dbUser.avatar,
          theme: dbUser.theme,
          active: dbUser.active,
          two_factor_enabled: dbUser.two_factor_enabled || false,
          createdAt: dbUser.createdAt?.toISOString(),
          updatedAt: dbUser.updatedAt?.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
