import { NextRequest, NextResponse } from "next/server";
import { validateEmailAdvanced } from "@/lib/email-validator";

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json({ valid: false, message: "Email is required" });
    }

    const result = await validateEmailAdvanced(email);

    return NextResponse.json({
      valid: result.valid,
      message: result.valid ? null : (result.userMessage || result.reason),
    });
  } catch (error) {
    console.error("Email validation error:", error);
    // En cas d'erreur → laisser passer (benefit of doubt)
    return NextResponse.json({ valid: true, message: null });
  }
}
