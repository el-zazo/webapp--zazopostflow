import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import Post from "@/models/Post";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const projectUpdateSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100).optional(),
  description: z.string().max(500).optional(),
  github_link: z.string().url("Invalid GitHub URL").or(z.literal("")).optional(),
  demo_link: z.string().url("Invalid demo URL").or(z.literal("")).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const { id } = await params;
    await dbConnect();

    const project = await Project.findOne({
      _id: id,
      user_id: user.userId,
    })
      .populate("tags", "name _id")
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const postsCount = await Post.countDocuments({ project_id: project._id });

    const serialized = {
      ...project,
      _id: project._id.toString(),
      user_id: project.user_id.toString(),
      tags: (project.tags as Array<{ _id: { toString(): string } | string; name: string }>).map((t) => ({
        _id: t._id.toString(),
        name: t.name,
      })),
      postsCount,
      createdAt: project.createdAt?.toISOString(),
      updatedAt: project.updatedAt?.toISOString(),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(request, { windowMs: 60000, max: 20, identifier: "api:projects:id:put" });
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
          "X-RateLimit-Limit": String(20),
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

    const { id } = await params;
    const body = await request.json();
    const validation = projectUpdateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    await dbConnect();

    const project = await Project.findOneAndUpdate(
      { _id: id, user_id: user.userId },
      validation.data,
      { new: true, runValidators: true }
    );

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Populate tags for the response
    await project.populate("tags", "name _id");

    const serialized = {
      ...project.toObject(),
      _id: project._id.toString(),
      user_id: project.user_id.toString(),
      tags: (project.tags as Array<{ _id: unknown; name: string }>).map((t) => ({
        _id: t._id.toString(),
        name: t.name,
      })),
      createdAt: project.createdAt?.toISOString(),
      updatedAt: project.updatedAt?.toISOString(),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(request, { windowMs: 60000, max: 10, identifier: "api:projects:id:delete" });
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
          "X-RateLimit-Limit": String(10),
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

    const { id } = await params;
    await dbConnect();

    const project = await Project.findOneAndDelete({
      _id: id,
      user_id: user.userId,
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Delete all posts in this project
    await Post.deleteMany({ project_id: id });

    return NextResponse.json({
      success: true,
      data: { message: "Project and all its posts deleted" },
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
