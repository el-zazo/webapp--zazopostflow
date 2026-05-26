import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/posts/calendar/day?year=2024&month=6&day=15
 *
 * Returns full post objects for a specific day with project info.
 * Priority: uses published_date if available, otherwise scheduled_date.
 */
export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 60000, max: 30, identifier: "api:posts:calendar:day:get" });
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

  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const { user } = auth as { user: { userId: string } };

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const day = parseInt(searchParams.get("day") || String(new Date().getDate()));

    // Validate parameters
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return NextResponse.json(
        { success: false, error: "Invalid year, month, or day parameter" },
        { status: 400 }
      );
    }

    // Calculate day start/end
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Get user's project IDs for ownership verification
    const userProjects = await Project.find({
      user_id: user.userId,
    }).select("_id");
    const userProjectIds = userProjects.map((p) => p._id);

    // Find posts that fall on this day
    // Priority: published_date if exists, otherwise scheduled_date
    const posts = await Post.find({
      project_id: { $in: userProjectIds },
      $or: [
        { published_date: { $gte: dayStart, $lte: dayEnd } },
        {
          published_date: null,
          scheduled_date: { $gte: dayStart, $lte: dayEnd },
        },
      ],
    })
      .populate("project_id", "name")
      .lean();

    // Safely serialize posts
    const serializedPosts = posts.map((p: Record<string, unknown>) => {
      let projectName = "Unknown";
      let projectId = "";

      try {
        const proj = p.project_id as Record<string, unknown> | undefined;
        if (proj && typeof proj === "object") {
          projectName = (proj.name as string) || "Unknown";
          const projId = proj._id as { toString(): string };
          projectId = projId?.toString() || "";
        }
      } catch {
        projectName = "Unknown";
        projectId = "";
      }

      return {
        _id: (p._id as { toString(): string }).toString(),
        name: (p.name as string) || "Untitled",
        content: (p.content as string) || "",
        status: p.status as string,
        type: (p.type as string) || "main",
        platform: (p.platform as string) || "LinkedIn",
        has_images: Boolean(p.has_images),
        has_videos: Boolean(p.has_videos),
        scheduled_date: p.scheduled_date
          ? new Date(p.scheduled_date as Date).toISOString()
          : null,
        published_date: p.published_date
          ? new Date(p.published_date as Date).toISOString()
          : null,
        project_id: projectId,
        projectName,
        createdAt: p.createdAt
          ? new Date(p.createdAt as Date).toISOString()
          : new Date().toISOString(),
        updatedAt: p.updatedAt
          ? new Date(p.updatedAt as Date).toISOString()
          : new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: serializedPosts,
      meta: { year, month, day },
    });
  } catch (error) {
    console.error("Calendar day posts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch calendar day posts" },
      { status: 500 }
    );
  }
}
