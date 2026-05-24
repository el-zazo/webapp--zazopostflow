import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Fetch full user data from DB (authUser already verified existence)
    const dbUser = await User.findById(authUser.userId)
      .select("-password -resetToken -resetTokenExpiry -email_verification_token -email_verification_expires -delete_account_token -delete_account_expires -delete_account_requested_at");

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          _id: dbUser._id.toString(),
          username: dbUser.username,
          email: dbUser.email,
          avatar: dbUser.avatar,
          theme: dbUser.theme,
          active: dbUser.active,
          createdAt: dbUser.createdAt?.toISOString(),
          updatedAt: dbUser.updatedAt?.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
