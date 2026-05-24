import { NextRequest, NextResponse } from "next/server";
import { verifySync } from "otplib";
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

    // Nettoyer le code saisi (supprimer espaces, tirets)
    const cleanCode = code.replace(/[\s\-]/g, "").trim();

    // ── Vérifier code TOTP (6 chiffres) ──────────────────
    let isValidTotp = false;
    if (/^\d{6}$/.test(cleanCode)) {
      try {
        const totpResult = verifySync({
          token: cleanCode,
          secret: user.two_factor_secret,
        });
        isValidTotp = totpResult.valid;
      } catch {
        isValidTotp = false;
      }
    }

    // ── Vérifier backup code ──────────────────────────────
    // Normaliser: uppercase + sans espaces
    const normalizedInput = cleanCode.toUpperCase();

    // Chercher dans la liste des backup codes
    const backupCodes: string[] = user.two_factor_backup_codes || [];

    // Comparaison normalisée: trim + uppercase des deux côtés
    const backupIndex = backupCodes.findIndex(
      (storedCode: string) =>
        storedCode.trim().toUpperCase() === normalizedInput
    );
    const isBackupCode = backupIndex !== -1;

    console.log("[2FA Challenge] Input:", normalizedInput);
    console.log("[2FA Challenge] Stored backup codes:", backupCodes);
    console.log("[2FA Challenge] isValidTotp:", isValidTotp);
    console.log("[2FA Challenge] isBackupCode:", isBackupCode, "index:", backupIndex);

    if (!isValidTotp && !isBackupCode) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication code" },
        { status: 400 }
      );
    }

    // Si backup code utilisé → le retirer de la liste
    if (isBackupCode) {
      const updatedCodes = backupCodes.filter(
        (_: string, index: number) => index !== backupIndex
      );
      await User.findByIdAndUpdate(user._id, {
        two_factor_backup_codes: updatedCodes,
      });
      console.log("[2FA Challenge] Backup code used, remaining:", updatedCodes.length);
    }

    // ── Générer le JWT final (même logique que le login normal) ──
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
          ? backupCodes.length - 1
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
