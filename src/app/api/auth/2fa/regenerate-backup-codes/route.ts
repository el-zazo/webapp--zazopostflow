import { NextRequest, NextResponse } from "next/server";
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

    // Générer 8 nouveaux backup codes
    const newBackupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    // Remplacer les anciens codes
    await User.findByIdAndUpdate(fullUser._id, {
      two_factor_backup_codes: newBackupCodes,
    });

    return NextResponse.json({
      success: true,
      message: "Backup codes regenerated successfully",
      data: {
        backupCodes: newBackupCodes,
      },
    });
  } catch (error) {
    console.error("Regenerate backup codes error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to regenerate backup codes" },
      { status: 500 }
    );
  }
}
