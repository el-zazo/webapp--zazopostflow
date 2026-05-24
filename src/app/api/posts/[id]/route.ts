import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Post from "@/models/Post";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";

const postUpdateSchema = z.object({
  name: z.string().min(1, "Post name is required").max(100).optional(),
  content: z.string().min(1, "Post content is required").optional(),
  type: z.enum(["main", "group"]).optional(),
  platform: z.string().optional(),
  scheduled_date: z.string().nullable().optional(),
  published_date: z.string().nullable().optional(),
  status: z.enum(["draft", "scheduled", "published"]).optional(),
  has_videos: z.boolean().optional(),
  has_images: z.boolean().optional(),
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

    const post = await Post.findById(id)
      .populate("project_id", "name user_id")
      .lean();

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    const project = post.project_id as { user_id: string; name: string; _id: string };
    if (project.user_id.toString() !== user.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const serialized = {
      ...post,
      _id: post._id.toString(),
      project_id: project._id.toString(),
      projectName: project.name,
      scheduled_date: post.scheduled_date
        ? new Date(post.scheduled_date).toISOString()
        : null,
      published_date: post.published_date
        ? new Date(post.published_date).toISOString()
        : null,
      createdAt: post.createdAt?.toISOString(),
      updatedAt: post.updatedAt?.toISOString(),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error("Get post error:", error);
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
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const body = await request.json();
    const validation = postUpdateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify ownership through project
    const existingPost = await Post.findById(id);
    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    const project = await Project.findOne({
      _id: existingPost.project_id,
      user_id: user.userId,
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { ...validation.data };

    if (validation.data.scheduled_date !== undefined) {
      updateData.scheduled_date = validation.data.scheduled_date
        ? new Date(validation.data.scheduled_date)
        : null;
    }

    // [FIX #4] Gestion correcte de published_date lors de la mise à jour.
    // Avant: Si `status` n'était pas fourni dans le payload (optionnel via Zod),
    // `validation.data.status` était `undefined`, ce qui tombait dans le `else`
    // et mettait `published_date = null`, détruisant la date de publication
    // d'un post publié lors d'un simple changement de nom.
    // Maintenant: On ne modifie `published_date` QUE si le statut est
    // explicitement fourni dans le payload.
    if (validation.data.status === "published") {
      // Si on passe explicitement à "published": utiliser la date fournie ou aujourd'hui
      if (validation.data.published_date) {
        updateData.published_date = new Date(validation.data.published_date);
      } else if (!existingPost.published_date) {
        updateData.published_date = new Date();
      }
      // Si le post a déjà une published_date, on la conserve (pas de changement)
    } else if (validation.data.status !== undefined) {
      // Si le statut change explicitement vers draft/scheduled: effacer published_date
      updateData.published_date = null;
    }
    // Si `status` n'est PAS fourni (undefined), on ne touche PAS à published_date

    // Handle media flags
    if (validation.data.has_videos !== undefined) {
      updateData.has_videos = validation.data.has_videos;
    }
    if (validation.data.has_images !== undefined) {
      updateData.has_images = validation.data.has_images;
    }

    const post = await Post.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    const serialized = {
      ...post!.toObject(),
      _id: post!._id.toString(),
      project_id: post!.project_id.toString(),
      scheduled_date: post!.scheduled_date?.toISOString() || null,
      published_date: post!.published_date?.toISOString() || null,
      createdAt: post!.createdAt?.toISOString(),
      updatedAt: post!.updatedAt?.toISOString(),
    };

    return NextResponse.json({ success: true, data: serialized });
  } catch (error) {
    console.error("Update post error:", error);
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
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const { id } = await params;
    await dbConnect();

    const existingPost = await Post.findById(id);
    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    const project = await Project.findOne({
      _id: existingPost.project_id,
      user_id: user.userId,
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    await Post.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      data: { message: "Post deleted" },
    });
  } catch (error) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
