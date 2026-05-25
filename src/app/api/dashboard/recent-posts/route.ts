import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    await dbConnect();

    const userId = user.userId;

    // Get all user project IDs - with fallback
    let projectIds: any[] = [];
    try {
      const userProjects = await Project.find({ user_id: userId }).select("_id");
      projectIds = userProjects.map((p) => p._id);
    } catch {
      projectIds = [];
    }

    // Fetch recent posts with defensive populate
    let recentPosts: any[] = [];
    try {
      recentPosts = await Post.find({
        project_id: { $in: projectIds },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("_id name title status type has_images has_videos project_id createdAt")
        .populate("project_id", "name")
        .lean();
    } catch {
      recentPosts = [];
    }

    // Safely serialize recent posts
    const serializedRecentPosts = (recentPosts || []).map((p: any) => {
      let projectName = "Unknown";
      let projectId = "";

      try {
        // project_id may be populated (object) or just an ObjectId (string)
        if (p.project_id && typeof p.project_id === "object") {
          projectName = p.project_id.name || "Unknown";
          projectId = p.project_id._id?.toString() || "";
        }
      } catch {
        projectName = "Unknown";
        projectId = "";
      }

      return {
        _id: p._id?.toString() || "",
        name: p.name || "Untitled Post",
        status: p.status || "draft",
        type: p.type || "main",
        has_images: p.has_images || false,
        has_videos: p.has_videos || false,
        createdAt: p.createdAt?.toISOString() || new Date().toISOString(),
        projectName,
        projectId,
      };
    });

    return NextResponse.json({
      success: true,
      data: serializedRecentPosts,
    });
  } catch (error) {
    console.error("Recent posts error:", error);
    // Return empty array instead of 500 - prevents dashboard crash
    return NextResponse.json({
      success: true,
      data: [],
    });
  }
}
