import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

/**
 * GET handler — confirms a disable-2FA-by-email request.
 * The user clicks the tokenized link from the email, which hits this endpoint.
 * No JWT is required (the user may be on a different device/browser).
 *
 * Flow:
 *  1. Extract `?token=TOKEN` from the URL query string
 *  2. Find candidate users with a non-expired disable_2fa_token
 *  3. Compare the raw token with the stored bcrypt hash
 *  4. If matched: disable 2FA and redirect to settings
 *  5. If invalid/expired: redirect to settings with error
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/settings?tab=security&error=invalid-token", request.url)
      );
    }

    // Find all users with a non-expired disable_2fa_token
    // (Tokens are hashed with bcrypt, so we can't do a direct DB lookup.
    //  In practice, very few users will have a pending token at any time.)
    const candidates = await User.find({
      disable_2fa_token: { $ne: null },
      disable_2fa_expires: { $gt: new Date() },
    });

    let matchedUser: any = null;

    for (const candidate of candidates) {
      const isMatch = await bcryptjs.compare(
        token,
        candidate.disable_2fa_token
      );
      if (isMatch) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.redirect(
        new URL("/settings?tab=security&error=invalid-token", request.url)
      );
    }

    // Disable 2FA and clear the token
    await User.findByIdAndUpdate(matchedUser._id, {
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: [],
      disable_2fa_token: null,
      disable_2fa_expires: null,
    });

    console.log(
      `[Disable2FAByEmail] 2FA disabled for user: ${matchedUser.email}`
    );

    return NextResponse.redirect(
      new URL("/settings?tab=security&disabled=true", request.url)
    );
  } catch (error) {
    console.error("Disable 2FA by email error:", error);
    return NextResponse.redirect(
      new URL("/settings?tab=security&error=invalid-token", request.url)
    );
  }
}
