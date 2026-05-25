import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Post from "@/models/Post";
import Project from "@/models/Project";
import Tag from "@/models/Tag";
import { z } from "zod";

// [FIX #2] Changement de GET à POST pour la suppression de compte.
// Avant: Un scanner d'email (Office 365 ATP, Slack, Discord, etc.) qui
// précharge les liens des emails déclenchait automatiquement la suppression
// du compte en suivant le lien GET. Avec POST, le navigateur ne peut pas
// déclencher l'action automatiquement — seul un clic utilisateur sur un
// formulaire soumettant en POST peut l'activer.

const confirmDeleteSchema = z.object({
  token: z.string().min(1, "Deletion token is required"),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // [FIX #2] Le token est maintenant envoyé dans le corps de la requête (POST body)
    // au lieu de l'URL query string, ce qui empêche les scanners d'emails de
    // déclencher la suppression automatiquement.
    const body = await request.json() as unknown;
    const validation = confirmDeleteSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Find user with this valid token
    const user = await User.findOne({
      delete_account_token: token,
      delete_account_expires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired deletion link. Your account has NOT been deleted.",
        },
        { status: 400 }
      );
    }

    const userId = user._id;

    // Delete all user data
    const userProjects = await Project.find({ user_id: userId });
    const projectIds = userProjects.map((p) => p._id);

    await Promise.all([
      Post.deleteMany({ project_id: { $in: projectIds } }),
      Project.deleteMany({ user_id: userId }),
      Tag.deleteMany({ user_id: userId }),
      User.findByIdAndDelete(userId),
    ]);

    console.log(`[DeleteAccount] Account deleted: ${user.email}`);

    // Invalidate JWT: clear all auth cookies
    const response = NextResponse.json({
      success: true,
      message:
        "Your account and all associated data have been permanently deleted.",
    });

    // Delete the main auth cookie
    response.cookies.delete("postflow_token");

    // Also clear any fallback cookie names by setting them to expired
    const expiredOptions = {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
    };
    response.cookies.set("token", "", expiredOptions);
    response.cookies.set("auth-token", "", expiredOptions);
    response.cookies.set("jwt", "", expiredOptions);
    response.cookies.set("session", "", expiredOptions);

    return response;
  } catch (error) {
    console.error("Confirm delete account error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }
}
