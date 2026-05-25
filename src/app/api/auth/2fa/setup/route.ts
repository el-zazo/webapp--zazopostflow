import { NextRequest, NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const { user } = auth as { user: { _id?: string; id?: string } };

  try {
    await dbConnect();

    const fullUser = await User.findById(user._id || user.id);
    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Si 2FA déjà activé → refuser
    if (fullUser.two_factor_enabled) {
      return NextResponse.json(
        { success: false, error: "2FA is already enabled" },
        { status: 400 }
      );
    }

    // Générer un nouveau secret TOTP
    const secret = generateSecret();

    // Sauvegarder le secret (temporaire, pas encore activé)
    await User.findByIdAndUpdate(fullUser._id, {
      two_factor_secret: secret,
      two_factor_enabled: false, // Pas encore activé
    });

    // Générer l'URL TOTP pour le QR code
    const otpAuthUrl = generateURI({
      issuer: "PostFlow",
      label: fullUser.email,
      secret,
    });

    // Générer le QR code en base64
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        secret,           // Pour affichage manuel (token)
        qrCode: qrCodeDataUrl, // Image base64
      },
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to setup 2FA" },
      { status: 500 }
    );
  }
}
