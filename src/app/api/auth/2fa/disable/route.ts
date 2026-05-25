import { NextRequest, NextResponse } from "next/server";
import { verifySync } from "otplib";
import bcryptjs from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  try {
    await dbConnect();

    const { password, code } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // FIX #6: Make twoFactorCode strictly required.
    // Without a TOTP code, an attacker with the JWT cookie + password could
    // disable 2FA, bypassing the entire second factor protection.
    if (!code) {
      return NextResponse.json(
        { success: false, error: "2FA code is required" },
        { status: 400 }
      );
    }

    const fullUser = await User.findById(user._id || user.id);
    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (!fullUser.two_factor_enabled) {
      return NextResponse.json(
        { success: false, error: "2FA is not enabled" },
        { status: 400 }
      );
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcryptjs.compare(password, fullUser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password" },
        { status: 400 }
      );
    }

    // FIX #6: Normalize the 2FA code (remove spaces and dashes),
    // following the same pattern as /api/auth/2fa/challenge/route.ts
    const normalizedCode = code.replace(/[\s-]/g, "");

    // Vérifier si c'est un code TOTP normal
    let isValidTotp = false;
    if (/^\d{6}$/.test(normalizedCode)) {
      try {
        const totpResult = verifySync({
          token: normalizedCode,
          secret: fullUser.two_factor_secret,
        });
        isValidTotp = totpResult.valid;
      } catch {
        isValidTotp = false;
      }
    }

    // Vérifier si c'est un backup code
    const backupCodes: string[] = fullUser.two_factor_backup_codes || [];
    const backupIndex = backupCodes.findIndex(
      (c: string) => c.trim().toUpperCase() === normalizedCode.toUpperCase()
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

    // Désactiver 2FA
    await User.findByIdAndUpdate(fullUser._id, {
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: [],
    });

    return NextResponse.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
