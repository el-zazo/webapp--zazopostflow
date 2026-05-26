import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/posts/shorts
 *
 * Fetches ALL posts from user's projects with populated project + tags,
 * sorted by createdAt DESC (newest first).
 * Used for the Shorts vertical scrolling view.
 */
export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 60000, max: 30, identifier: "api:posts:shorts" });
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

    // Get user's project IDs
    const userProjects = await Project.find({
      user_id: user.userId,
    }).select("_id");
    const projectIds = userProjects.map((p) => p._id);

    // Fetch all posts from user's projects, populate project with tags
    const posts = await Post.find({
      project_id: { $in: projectIds },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "project_id",
        select: "name tags github_link demo_link",
        populate: {
          path: "tags",
          select: "name _id",
        },
      })
      .lean();

    // Safely serialize posts
    const serializedPosts = posts.map((p: Record<string, unknown>) => {
      let projectName = "Unknown";
      let projectId = "";
      let projectTags: Array<{ _id: string; name: string }> = [];
      let githubLink = "";
      let demoLink = "";

      try {
        const proj = p.project_id as Record<string, unknown> | undefined;
        if (proj && typeof proj === "object") {
          projectName = (proj.name as string) || "Unknown";
          const projId = proj._id as { toString(): string };
          projectId = projId?.toString() || "";
          githubLink = (proj.github_link as string) || "";
          demoLink = (proj.demo_link as string) || "";

          // Extract tags from populated project
          const rawTags = proj.tags as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(rawTags)) {
            projectTags = rawTags.map((t) => ({
              _id: (t._id as { toString(): string }).toString(),
              name: (t.name as string) || "",
            }));
          }
        }
      } catch {
        projectName = "Unknown";
        projectId = "";
        projectTags = [];
      }

      return {
        _id: (p._id as { toString(): string }).toString(),
        name: (p.name as string) || "Untitled",
        content: (p.content as string) || "",
        type: (p.type as string) || "main",
        platform: (p.platform as string) || "LinkedIn",
        status: (p.status as string) || "draft",
        scheduled_date: p.scheduled_date
          ? new Date(p.scheduled_date as Date).toISOString()
          : null,
        published_date: p.published_date
          ? new Date(p.published_date as Date).toISOString()
          : null,
        has_images: Boolean(p.has_images),
        has_videos: Boolean(p.has_videos),
        createdAt: p.createdAt
          ? new Date(p.createdAt as Date).toISOString()
          : new Date().toISOString(),
        updatedAt: p.updatedAt
          ? new Date(p.updatedAt as Date).toISOString()
          : new Date().toISOString(),
        project_id: projectId,
        project: {
          _id: projectId,
          name: projectName,
          tags: projectTags,
          github_link: githubLink,
          demo_link: demoLink,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: serializedPosts,
    });
  } catch (error) {
    console.error("Shorts posts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch shorts posts" },
      { status: 500 }
    );
  }
}
