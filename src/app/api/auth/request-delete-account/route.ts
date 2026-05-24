import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";
import { sendAccountDeletionEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // Get full user with password hash
    const fullUser = await User.findById(user.userId);
    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, fullUser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password" },
        { status: 400 }
      );
    }

    // Generate deletion token (expires 1h)
    const deletionToken = crypto.randomBytes(32).toString("hex");
    const deletionExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token in user document
    await User.findByIdAndUpdate(fullUser._id, {
      delete_account_token: deletionToken,
      delete_account_expires: deletionExpires,
      delete_account_requested_at: new Date(),
    });

    // Send confirmation email
    const emailResult = await sendAccountDeletionEmail(
      fullUser.email,
      fullUser.username,
      deletionToken
    );

    if (!emailResult.success) {
      // Rollback token if email fails
      await User.findByIdAndUpdate(fullUser._id, {
        delete_account_token: null,
        delete_account_expires: null,
        delete_account_requested_at: null,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send confirmation email. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "A confirmation email has been sent. Please check your inbox.",
      email: fullUser.email,
    });
  } catch (error) {
    console.error("Request delete account error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
