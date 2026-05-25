import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tag from "@/models/Tag";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";
// [FIX #7] Import de la fonction d'échappement regex
import { escapeRegExp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(request, { windowMs: 60000, max: 20, identifier: "api:tags:id:put" });
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

    await dbConnect();

    const { id } = await params;
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Tag name is required" },
        { status: 400 }
      );
    }

    const normalizedName = name.trim();

    // [FIX #7] Échappement regex dans la vérification d'unicité.
    // Avant: `^${normalizedName}$` vulnérable à l'injection regex si
    // le nom du tag contient des métacaractères comme `(a+)+`.
    const escapedName = escapeRegExp(normalizedName);

    // Vérifier unicité (même user, même nom, autre id)
    const existing = await Tag.findOne({
      user_id: user.userId,
      name: { $regex: `^${escapedName}$`, $options: "i" },
      _id: { $ne: id },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A tag with this name already exists" },
        { status: 400 }
      );
    }

    const oldTag = await Tag.findById(id);
    if (!oldTag || oldTag.user_id.toString() !== user.userId) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }

    // Mettre à jour le tag
    const updatedTag = await Tag.findByIdAndUpdate(
      id,
      { name: normalizedName },
      { new: true }
    );

    const serialized = {
      ...updatedTag!.toObject(),
      _id: updatedTag!._id.toString(),
      user_id: updatedTag!.user_id.toString(),
      createdAt: updatedTag!.createdAt?.toISOString(),
      updatedAt: updatedTag!.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: serialized,
    });
  } catch (error) {
    console.error("PUT /api/tags/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(request, { windowMs: 60000, max: 10, identifier: "api:tags:id:delete" });
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

    await dbConnect();

    const { id } = await params;

    const tag = await Tag.findOne({ _id: id, user_id: user.userId });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 }
      );
    }

    // Cleanup: remove tag ObjectId from all projects that reference it
    await Project.updateMany(
      { user_id: user.userId, tags: tag._id },
      { $pull: { tags: tag._id } }
    );

    // Delete the tag
    await Tag.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      data: { _id: id, name: tag.name },
    });
  } catch (error) {
    console.error("Delete tag error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
