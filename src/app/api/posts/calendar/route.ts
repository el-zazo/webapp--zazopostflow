import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/posts/calendar?year=2024&month=6
 *
 * Returns post counts per day for a given month using aggregation.
 * Priority: uses published_date if available, otherwise scheduled_date.
 * This fixes the pagination bug where only 10 posts were fetched via
 * the old /api/posts?sort=newest endpoint, missing posts in the calendar.
 */
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

    // Validate year and month
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid year or month parameter" },
        { status: 400 }
      );
    }

    // Calculate month start/end dates
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get user's project IDs for ownership verification
    const userProjects = await Project.find({
      user_id: user.userId,
    }).select("_id");
    const userProjectIds = userProjects.map((p) => p._id);

    // Aggregation pipeline to count posts per day efficiently
    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          project_id: { $in: userProjectIds },
          $or: [
            { published_date: { $gte: startDate, $lte: endDate } },
            {
              published_date: null,
              scheduled_date: { $gte: startDate, $lte: endDate },
            },
          ],
        },
      },
      {
        $project: {
          day: {
            $dayOfMonth: {
              $ifNull: ["$published_date", "$scheduled_date"],
            },
          },
        },
      },
      {
        $group: {
          _id: "$day",
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Post.aggregate(pipeline);

    // Convert to { "1": 3, "15": 1 } format
    const postsByDay: Record<string, number> = {};
    for (const result of results) {
      postsByDay[String(result._id)] = result.count;
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
