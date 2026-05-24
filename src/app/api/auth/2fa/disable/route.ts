import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
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

    // Vérifier le code 2FA ou backup code (si fourni)
    if (code) {
      // Vérifier si c'est un code TOTP normal
      const isValidTotp = authenticator.verify({
        token: code,
        secret: fullUser.two_factor_secret,
      });

      // Vérifier si c'est un backup code
      const isBackupCode = fullUser.two_factor_backup_codes.includes(
        code.toUpperCase()
      );

      if (!isValidTotp && !isBackupCode) {
        return NextResponse.json(
          { success: false, error: "Invalid 2FA code" },
          { status: 400 }
        );
      }
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
