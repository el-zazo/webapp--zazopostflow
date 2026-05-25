import { NextRequest, NextResponse } from "next/server";
import { verifySync } from "otplib";
import bcryptjs from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const { user } = auth as { user: { _id?: string; id?: string } };

  try {
    await dbConnect();

    const { password, code } = (await request.json()) as { password?: string; code?: string };

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

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

    // Vérifier mot de passe
    const isPasswordValid = await bcryptjs.compare(password, fullUser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password" },
        { status: 400 }
      );
    }

    // Vérifier code 2FA (TOTP seulement, pas backup code)
    const cleanCode = code.replace(/\s/g, "");
    let isValidCode = false;

    if (/^\d{6}$/.test(cleanCode)) {
      try {
        const result = verifySync({
          token: cleanCode,
          secret: fullUser.two_factor_secret,
        });
        isValidCode = result.valid;
      } catch {
        isValidCode = false;
      }
    }

    if (!isValidCode) {
      return NextResponse.json(
        { success: false, error: "Invalid 2FA code" },
        { status: 400 }
      );
    }

    // Retourner les backup codes
    return NextResponse.json({
      success: true,
      data: {
        backupCodes: fullUser.two_factor_backup_codes || [],
        remainingCount: (fullUser.two_factor_backup_codes || []).length,
      },
    });
  } catch (error) {
    console.error("Get backup codes error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve backup codes" },
      { status: 500 }
    );
  }
}
