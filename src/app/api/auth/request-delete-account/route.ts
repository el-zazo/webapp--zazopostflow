import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { verifySync } from "otplib";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { sendAccountDeletionEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 3600000, max: 3, identifier: "auth:request-delete-account" });
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

    const { password, twoFactorCode } = (await request.json()) as { password?: string; twoFactorCode?: string };

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Get full user with password hash
    const fullUser = await User.findById(user.userId);
    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, fullUser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password" },
        { status: 400 }
      );
    }

    // ── Si 2FA activé → vérifier le code ─────────────────
    if (fullUser.two_factor_enabled) {
      if (!twoFactorCode) {
        return NextResponse.json(
          {
            success: false,
            error: "2FA code is required",
            requires2FA: true,
          },
          { status: 400 }
        );
      }

      const cleanCode = twoFactorCode.replace(/[\s\-]/g, "").trim();

      // Vérifier code TOTP (6 chiffres)
      let isValidTotp = false;
      if (/^\d{6}$/.test(cleanCode)) {
        try {
          const totpResult = verifySync({
            token: cleanCode,
            secret: fullUser.two_factor_secret,
          });
          isValidTotp = totpResult.valid;
        } catch {
          isValidTotp = false;
        }
      }

      // Vérifier backup code
      const backupCodes: string[] = fullUser.two_factor_backup_codes || [];
      const backupIndex = backupCodes.findIndex(
        (c: string) => c.trim().toUpperCase() === cleanCode.toUpperCase()
      );
      const isBackupCode = backupIndex !== -1;

      if (!isValidTotp && !isBackupCode) {
        return NextResponse.json(
          { success: false, error: "Invalid 2FA code" },
          { status: 400 }
        );
      }

      // Retirer backup code si utilisé
      if (isBackupCode) {
        const updatedCodes = backupCodes.filter(
          (_: string, i: number) => i !== backupIndex
        );
        await User.findByIdAndUpdate(fullUser._id, {
          two_factor_backup_codes: updatedCodes,
        });
      }
    }

    // Generate deletion token (expires 1h)
    const deletionToken = crypto.randomBytes(32).toString("hex");
    const deletionExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token in user document
    await User.findByIdAndUpdate(fullUser._id, {
      delete_account_token: deletionToken,
      delete_account_expires: deletionExpires,
      delete_account_requested_at: new Date(),
    });

    // Send confirmation email
    const emailResult = await sendAccountDeletionEmail(
      fullUser.email,
      fullUser.username,
      deletionToken
    );

    if (!emailResult.success) {
      // Rollback token if email fails
      await User.findByIdAndUpdate(fullUser._id, {
        delete_account_token: null,
        delete_account_expires: null,
        delete_account_requested_at: null,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send confirmation email. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "A confirmation email has been sent. Please check your inbox.",
      email: fullUser.email,
    });
  } catch (error) {
    console.error("Request delete account error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
