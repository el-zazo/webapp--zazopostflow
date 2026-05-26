import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/dashboard/top-tags
 *
 * Returns the top 5 tags by project count using aggregation.
 * Unwinds the tags array in projects, groups by tag, counts projects,
 * sorts descending, and limits to 5.
 */
export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 60000, max: 30, identifier: "api:dashboard:top-tags" });
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

    const pipeline: mongoose.PipelineStage[] = [
      // Match only the user's projects
      { $match: { user_id: new mongoose.Types.ObjectId(user.userId) } },
      // Unwind tags array
      { $unwind: "$tags" },
      // Group by tag and count
      {
        $group: {
          _id: "$tags",
          projectsCount: { $sum: 1 },
        },
      },
      // Lookup tag name
      {
        $lookup: {
          from: "tags",
          localField: "_id",
          foreignField: "_id",
          as: "tagInfo",
        },
      },
      // Unwind tagInfo (should be exactly one match)
      { $unwind: "$tagInfo" },
      // Project the final shape
      {
        $project: {
          _id: { $toString: "$_id" },
          name: "$tagInfo.name",
          projectsCount: 1,
        },
      },
      // Sort by count descending
      { $sort: { projectsCount: -1 } },
      // Limit to top 5
      { $limit: 5 },
    ];

    const results = await Project.aggregate(pipeline);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Top tags error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch top tags" },
      { status: 500 }
    );
  }
}
