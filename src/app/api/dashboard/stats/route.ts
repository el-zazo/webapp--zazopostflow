import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import Post from "@/models/Post";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth as { user: { userId: string } };

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

    return NextResponse.json({
      success: true,
      data: {
        totalProjects,
        totalPosts,
        scheduledThisWeek,
        publishedThisMonth,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    // Return safe defaults instead of 500 - prevents dashboard crash
    return NextResponse.json({
      success: true,
      data: {
        totalProjects: 0,
        totalPosts: 0,
        scheduledThisWeek: 0,
        publishedThisMonth: 0,
      },
    });
  }
}
