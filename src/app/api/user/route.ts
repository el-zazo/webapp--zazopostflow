import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { verifySync } from "otplib";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const updateThemeSchema = z.object({
  theme: z.enum(["dark", "light"]),
});

export async function PUT(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 60000, max: 10, identifier: "api:user:put" });
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
          "X-RateLimit-Limit": String(10),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": rl.resetAt.toISOString(),
        },
      }
    );
  }

  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const { action } = body;

    await dbConnect();

    // Update profile
    if (action === "profile") {
      const validation = updateProfileSchema.safeParse(body);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        return NextResponse.json(
          { success: false, error: firstError.message },
          { status: 400 }
        );
      }

      // Check username uniqueness if changing
      if (validation.data.username) {
        const existing = await User.findOne({
          username: validation.data.username,
          _id: { $ne: user.userId },
        });
        if (existing) {
          return NextResponse.json(
            { success: false, error: "Username already taken" },
            { status: 409 }
          );
        }
      }

      const dbUser = await User.findByIdAndUpdate(
        user.userId,
        validation.data,
        { new: true, runValidators: true }
      ).select("-password -resetToken -resetTokenExpiry -email_verification_token -email_verification_expires");

      return NextResponse.json({
        success: true,
        data: {
          ...dbUser!.toObject(),
          _id: dbUser!._id.toString(),
          createdAt: dbUser!.createdAt?.toISOString(),
          updatedAt: dbUser!.updatedAt?.toISOString(),
        },
      });
    }

    // Update password
    if (action === "password") {
      const validation = updatePasswordSchema.safeParse(body);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        return NextResponse.json(
          { success: false, error: firstError.message },
          { status: 400 }
        );
      }

      const dbUser = await User.findById(user.userId);
      if (!dbUser) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      const isPasswordValid = await bcryptjs.compare(
        validation.data.currentPassword,
        dbUser.password
      );
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // ── Si 2FA activé → vérifier le code ─────────────────
      if (dbUser.two_factor_enabled) {
        const { twoFactorCode } = body;

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
              secret: dbUser.two_factor_secret,
            });
            isValidTotp = totpResult.valid;
          } catch {
            isValidTotp = false;
          }
        }

        // Vérifier backup code
        const backupCodes: string[] = dbUser.two_factor_backup_codes || [];
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
          await User.findByIdAndUpdate(dbUser._id, {
            two_factor_backup_codes: updatedCodes,
          });
        }
      }

      const salt = await bcryptjs.genSalt(12);
      const hashedPassword = await bcryptjs.hash(
        validation.data.newPassword,
        salt
      );

      dbUser.password = hashedPassword;
      await dbUser.save();

      return NextResponse.json({
        success: true,
        data: { message: "Password updated successfully" },
      });
    }

    // Update theme
    if (action === "theme") {
      const validation = updateThemeSchema.safeParse(body);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        return NextResponse.json(
          { success: false, error: firstError.message },
          { status: 400 }
        );
      }

      await User.findByIdAndUpdate(user.userId, {
        theme: validation.data.theme,
      });

      return NextResponse.json({
        success: true,
        data: { theme: validation.data.theme },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
