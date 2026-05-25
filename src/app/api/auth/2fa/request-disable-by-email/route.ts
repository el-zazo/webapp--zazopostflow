import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { sendDisable2FAEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 3600000, max: 3, identifier: "auth:2fa:request-disable-by-email" });
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
          "X-RateLimit-Limit": String(3),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": rl.resetAt.toISOString(),
        },
      }
    );
  }

  try {
    await dbConnect();

    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth as { user: { userId?: string } };

    // Get full user document
    const fullUser = await User.findById(user.userId);
    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Only proceed if 2FA is enabled — but always return same response
    // for security (do not reveal 2FA status to potential attackers)
    if (fullUser.two_factor_enabled) {
      // Generate a secure random token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = await bcryptjs.hash(rawToken, 10);
      const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save hashed token and expiry to user document
      await User.findByIdAndUpdate(fullUser._id, {
        disable_2fa_token: hashedToken,
        disable_2fa_expires: tokenExpires,
      });

      // Send confirmation email with the raw (unhashed) token
      const emailResult = await sendDisable2FAEmail(
        fullUser.email,
        fullUser.username,
        rawToken
      );

      if (!emailResult.success) {
        // Rollback token if email fails
        await User.findByIdAndUpdate(fullUser._id, {
          disable_2fa_token: null,
          disable_2fa_expires: null,
        });

        console.error(
          "[RequestDisable2FA] Failed to send email to:",
          fullUser.email
        );
      }
    }

    // Always return same success response regardless of 2FA status
    // to prevent enumeration of whether a user has 2FA enabled
    return NextResponse.json({
      success: true,
      message: "If 2FA is enabled on your account, an email has been sent.",
    });
  } catch (error) {
    console.error("Request disable 2FA by email error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
