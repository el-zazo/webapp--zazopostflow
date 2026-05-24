import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib/authenticator";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { signToken, createAuthResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user || !user.two_factor_enabled) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const cleanCode = code.replace(/\s/g, "");

    // Vérifier code TOTP
    const isValidTotp = authenticator.verify({
      token: cleanCode,
      secret: user.two_factor_secret,
    });

    // Vérifier backup code
    const backupIndex = user.two_factor_backup_codes.indexOf(
      cleanCode.toUpperCase()
    );
    const isBackupCode = backupIndex !== -1;

    if (!isValidTotp && !isBackupCode) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication code" },
        { status: 400 }
      );
    }

    // Si backup code utilisé → le retirer de la liste
    if (isBackupCode) {
      const updatedCodes = user.two_factor_backup_codes.filter(
        (_: string, index: number) => index !== backupIndex
      );
      await User.findByIdAndUpdate(user._id, {
        two_factor_backup_codes: updatedCodes,
      });
    }

    // Générer le JWT final (même logique que le login normal)
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    const userData = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      theme: user.theme,
    };

    const response = createAuthResponse(
      {
        success: true,
        message: "2FA verified successfully",
        data: { user: userData },
        usedBackupCode: isBackupCode,
        remainingBackupCodes: isBackupCode
          ? user.two_factor_backup_codes.length - 1
          : undefined,
      },
      token
    );

    return response;
  } catch (error) {
    console.error("2FA challenge error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
