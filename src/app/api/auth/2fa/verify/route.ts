import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  try {
    await dbConnect();

    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: "Invalid code format" },
        { status: 400 }
      );
    }

    const fullUser = await User.findById(user._id || user.id);
    if (!fullUser || !fullUser.two_factor_secret) {
      return NextResponse.json(
        { success: false, error: "2FA setup not initiated" },
        { status: 400 }
      );
    }

    // Vérifier le code TOTP
    const isValid = authenticator.verify({
      token: code,
      secret: fullUser.two_factor_secret,
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    // Générer 8 backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    // Activer 2FA + sauvegarder backup codes
    await User.findByIdAndUpdate(fullUser._id, {
      two_factor_enabled: true,
      two_factor_backup_codes: backupCodes,
    });

    return NextResponse.json({
      success: true,
      message: "2FA enabled successfully",
      data: {
        backupCodes, // Afficher une seule fois à l'utilisateur
      },
    });
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
