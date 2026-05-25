import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 60000, max: 30, identifier: "api:posts:calendar:get" });
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

    // Début et fin du mois
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get user's project IDs for ownership verification
    const userProjects = await Project.find({
      user_id: user.userId,
    }).select("_id");
    const projectIds = userProjects.map((p) => p._id);

    // Récupérer tous les posts du mois (scheduled + published)
    const posts = await Post.find({
      project_id: { $in: projectIds },
      $or: [
        {
          scheduled_date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        {
          published_date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      ],
    })
      .select("_id name status type has_images has_videos scheduled_date published_date project_id")
      .populate("project_id", "name")
      .lean();

    // Grouper par jour
    const postsByDay: Record<string, any[]> = {};

    for (const post of posts) {
      const p = post as any;
      const dateToUse = p.scheduled_date || p.published_date;
      if (!dateToUse) continue;

      const day = new Date(dateToUse).getDate();
      const key = String(day);

      if (!postsByDay[key]) postsByDay[key] = [];

      postsByDay[key].push({
        _id: p._id.toString(),
        name: p.name || "Untitled",
        status: p.status,
        type: p.type || "main",
        has_images: p.has_images || false,
        has_videos: p.has_videos || false,
        project_name: p.project_id?.name || "Unknown",
        date: new Date(dateToUse).toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: postsByDay,
      meta: { year, month },
    });
  } catch (error) {
    console.error("Calendar posts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch calendar posts" },
      { status: 500 }
    );
  }
}
