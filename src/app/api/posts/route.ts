import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";

const postCreateSchema = z.object({
  project_id: z.string().min(1, "Project ID is required"),
  name: z.string().min(1, "Post name is required").max(100),
  content: z.string().min(1, "Post content is required"),
  type: z.enum(["main", "group"]).optional(),
  platform: z.string().optional(),
  scheduled_date: z.string().nullable().optional(),
  published_date: z.string().nullable().optional(),
  status: z.enum(["draft", "scheduled", "published"]).optional(),
  has_videos: z.boolean().default(false),
  has_images: z.boolean().default(false),
});

// Map sortBy param to MongoDB field name
const SORT_FIELD_MAP: Record<string, string> = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  scheduled_date: "scheduled_date",
  published_date: "published_date",
  status: "status",
  type: "type",
  name: "name",
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));

    // Legacy sort param support (backward compat)
    const legacySort = searchParams.get("sort");

    // Get user's project IDs
    const userProjects = await Project.find({
      user_id: user.userId,
    }).select("_id");
    const projectIds = userProjects.map((p) => p._id);

    const filter: Record<string, unknown> = { project_id: { $in: projectIds } };

    if (projectId) {
      filter.project_id = projectId;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (type && type !== "all") {
      filter.type = type;
    }

    // Search filter on post name
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    // Media filter
    const mediaFilter = searchParams.get("mediaFilter") || "all";
    if (mediaFilter === "has_images") filter.has_images = true;
    if (mediaFilter === "has_videos") filter.has_videos = true;
    if (mediaFilter === "has_both") {
      filter.has_images = true;
      filter.has_videos = true;
    }
    if (mediaFilter === "none") {
      filter.has_images = false;
      filter.has_videos = false;
    }

    // Build sort object dynamically
    let sortOption: Record<string, 1 | -1>;

    if (legacySort) {
      // Legacy sort param for backward compatibility
      sortOption = { createdAt: -1 };
      if (legacySort === "oldest") sortOption = { createdAt: 1 };
      if (legacySort === "scheduled") sortOption = { scheduled_date: 1 };
      if (legacySort === "status") sortOption = { status: 1 };
    } else {
      // New dynamic sort
      const mongoField = SORT_FIELD_MAP[sortBy] || "createdAt";
      const order: 1 | -1 = sortOrder === "asc" ? 1 : -1;
      sortOption = { [mongoField]: order };
    }

    // Get total count for pagination
    const totalItems = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("project_id", "name")
      .lean();

    const totalPages = Math.ceil(totalItems / limit);

    const serialized = posts.map((p) => ({
      ...p,
      _id: p._id.toString(),
      project_id: p.project_id._id
        ? (p.project_id._id as { toString: () => string }).toString()
        : (p.project_id as unknown as string).toString(),
      projectName: p.project_id.name || "Unknown",
      scheduled_date: p.scheduled_date
        ? new Date(p.scheduled_date).toISOString()
        : null,
      published_date: p.published_date
        ? new Date(p.published_date).toISOString()
        : null,
      createdAt: p.createdAt?.toISOString(),
      updatedAt: p.updatedAt?.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: serialized,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get posts error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const validation = postCreateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify project belongs to user
    const project = await Project.findOne({
      _id: validation.data.project_id,
      user_id: user.userId,
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const postData: Record<string, unknown> = {
      ...validation.data,
      scheduled_date: validation.data.scheduled_date
        ? new Date(validation.data.scheduled_date)
        : null,
    };

    // If status is published, set published_date
    if (validation.data.status === "published") {
      if (validation.data.published_date) {
        postData.published_date = new Date(validation.data.published_date);
      } else {
        postData.published_date = new Date();
      }
    } else {
      // If not published, clear published_date
      postData.published_date = null;
    }

    // Remove published_date string from data (we handle it above)
    delete postData.published_date_string;

    const post = await Post.create(postData);

    const serialized = {
      ...post.toObject(),
      _id: post._id.toString(),
      project_id: post.project_id.toString(),
      scheduled_date: post.scheduled_date?.toISOString() || null,
      published_date: post.published_date?.toISOString() || null,
      createdAt: post.createdAt?.toISOString(),
      updatedAt: post.updatedAt?.toISOString(),
    };

    return NextResponse.json(
      { success: true, data: serialized },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
