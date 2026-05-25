import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 900000, max: 5, identifier: "auth:verify-email" });
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
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find user with this token and token not expired
    const user = await User.findOne({
      email_verification_token: token,
      email_verification_expires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired verification link. Please register again.",
        },
        { status: 400 }
      );
    }

    // Activate the account and clear the token
    await User.findByIdAndUpdate(user._id, {
      active: true,
      email_verification_token: null,
      email_verification_expires: null,
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You can now log in.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
