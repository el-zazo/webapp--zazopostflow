import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import Post from "@/models/Post";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 60000, max: 30, identifier: "api:dashboard:get" });
  if (!rl.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many requests. Please try again later.",
        retryAfter: rl.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(30),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": rl.resetAt.toISOString(),
        },
      }
    );
  }

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
      // If project query fails, continue with empty array
      projectIds = [];
    }

    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // All queries in parallel with individual catch - never throw
    const [totalProjects, totalPosts, scheduledThisWeek, publishedThisMonth] =
      await Promise.all([
        Project.countDocuments({ user_id: userId }).catch(() => 0),
        Post.countDocuments({ project_id: { $in: projectIds } }).catch(() => 0),
        Post.countDocuments({
          project_id: { $in: projectIds },
          status: "scheduled",
          scheduled_date: { $gte: startOfWeek, $lt: endOfWeek },
        }).catch(() => 0),
        Post.countDocuments({
          project_id: { $in: projectIds },
          status: "published",
          published_date: { $gte: startOfMonth },
        }).catch(() => 0),
      ]);

    // Recent posts (last 5) - with defensive populate
    let recentPosts: any[] = [];
    try {
      recentPosts = await Post.find({
        project_id: { $in: projectIds },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("project_id", "name")
        .lean()
        .catch(() => []);
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
        createdAt: p.createdAt?.toISOString() || new Date().toISOString(),
        projectName,
        projectId,
        type: p.type || "main",
        has_images: Boolean(p.has_images),
        has_videos: Boolean(p.has_videos),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProjects,
          totalPosts,
          scheduledThisWeek,
          publishedThisMonth,
        },
        recentPosts: serializedRecentPosts,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    // Return safe defaults instead of 500 - prevents dashboard crash
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProjects: 0,
          totalPosts: 0,
          scheduledThisWeek: 0,
          publishedThisMonth: 0,
        },
        recentPosts: [],
      },
    });
  }
}
