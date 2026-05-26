import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
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
    let projectIds: mongoose.Types.ObjectId[] = [];
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
    const [totalProjects, totalPosts, scheduledThisWeek, publishedThisMonth, totalDraftsCount] =
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
        Post.countDocuments({
          project_id: { $in: projectIds },
          status: "draft",
        }).catch(() => 0),
      ]);

    // Recent posts (last 5) - with defensive populate
    let recentPosts: Record<string, unknown>[] = [];
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
    const serializedRecentPosts = (recentPosts || []).map((p: Record<string, unknown>) => {
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
        _id: (p._id as { toString(): string }).toString() || "",
        name: (p.name as string) || "Untitled Post",
        status: (p.status as string) || "draft",
        createdAt: (p.createdAt as Date)?.toISOString() || new Date().toISOString(),
        projectName,
        projectId,
        type: (p.type as string) || "main",
        has_images: Boolean(p.has_images),
        has_videos: Boolean(p.has_videos),
      };
    });

    // Upcoming posts: status="scheduled" AND scheduled_date >= today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let upcomingPosts: Record<string, unknown>[] = [];
    try {
      upcomingPosts = await Post.find({
        project_id: { $in: projectIds },
        status: "scheduled",
        scheduled_date: { $gte: today },
      })
        .sort({ scheduled_date: 1 })
        .limit(5)
        .populate("project_id", "name")
        .lean()
        .catch(() => []);
    } catch {
      upcomingPosts = [];
    }

    const serializedUpcomingPosts = (upcomingPosts || []).map((p: Record<string, unknown>) => {
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
        _id: (p._id as { toString(): string }).toString() || "",
        name: (p.name as string) || "Untitled Post",
        status: (p.status as string) || "scheduled",
        scheduled_date: p.scheduled_date
          ? new Date(p.scheduled_date as Date).toISOString()
          : null,
        projectName,
        projectId,
      };
    });

    // Missed posts: status="scheduled" AND scheduled_date < today
    let missedPosts: Record<string, unknown>[] = [];
    try {
      missedPosts = await Post.find({
        project_id: { $in: projectIds },
        status: "scheduled",
        scheduled_date: { $lt: today },
      })
        .sort({ scheduled_date: -1 })
        .populate("project_id", "name")
        .lean()
        .catch(() => []);
    } catch {
      missedPosts = [];
    }

    const serializedMissedPosts = (missedPosts || []).map((p: Record<string, unknown>) => {
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
        _id: (p._id as { toString(): string }).toString() || "",
        name: (p.name as string) || "Untitled Post",
        status: (p.status as string) || "scheduled",
        scheduled_date: p.scheduled_date
          ? new Date(p.scheduled_date as Date).toISOString()
          : null,
        projectName,
        projectId,
      };
    });

    // Draft posts: status="draft" (triés par date de dernière modification)
    let draftPosts: Record<string, unknown>[] = [];
    try {
      draftPosts = await Post.find({
        project_id: { $in: projectIds },
        status: "draft",
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("project_id", "name")
        .lean()
        .catch(() => []);
    } catch {
      draftPosts = [];
    }

    const serializedDraftPosts = (draftPosts || []).map((p: Record<string, unknown>) => {
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
        _id: (p._id as { toString(): string }).toString() || "",
        name: (p.name as string) || "Untitled Post",
        status: (p.status as string) || "draft",
        updatedAt: p.updatedAt
          ? new Date(p.updatedAt as Date).toISOString()
          : new Date().toISOString(),
        projectName,
        projectId,
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
        upcomingPosts: serializedUpcomingPosts,
        missedPosts: serializedMissedPosts,
        draftPosts: serializedDraftPosts,
        totalDraftsCount,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
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
        upcomingPosts: [],
        missedPosts: [],
        draftPosts: [],
        totalDraftsCount: 0,
      },
    });
  }
}
