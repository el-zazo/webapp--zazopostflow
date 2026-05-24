import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Tag from "@/models/Tag";
import Project from "@/models/Project";
import { requireAuth } from "@/lib/auth";

const tagCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name must be at most 50 characters"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all"; // all | used | unused
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const sortDirection: 1 | -1 = sortOrder === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    // Use aggregation pipeline to support sort on projectsCount
    const matchStage: Record<string, unknown> = {
      user_id: new mongoose.Types.ObjectId(user.userId),
    };

    if (search) {
      matchStage.name = { $regex: search, $options: "i" };
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },

      // Lookup projects that reference this tag
      {
        $lookup: {
          from: "projects",
          let: { tagId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user_id", new mongoose.Types.ObjectId(user.userId)] },
                    { $in: ["$$tagId", "$tags"] },
                  ],
                },
              },
            },
          ],
          as: "projectsData",
        },
      },

      // Add computed projectsCount field
      {
        $addFields: {
          projectsCount: { $size: "$projectsData" },
        },
      },

      // Apply used/unused filter based on computed count
      ...(filter === "used"
        ? [{ $match: { projectsCount: { $gt: 0 } } }]
        : filter === "unused"
        ? [{ $match: { projectsCount: 0 } }]
        : []),

      // Dynamic sort
      { $sort: { [sortBy]: sortDirection } },

      // Pagination with facet to get total count
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const result = await Tag.aggregate(pipeline);
    const tags = result[0]?.data || [];
    const totalItems = result[0]?.total[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const serialized = tags.map((t: Record<string, unknown>) => ({
      ...t,
      _id: (t._id as { toString: () => string }).toString(),
      user_id: (t.user_id as { toString: () => string }).toString(),
      createdAt: (t.createdAt as Date)?.toISOString?.(),
      updatedAt: (t.updatedAt as Date)?.toISOString?.(),
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
    console.error("Get tags error:", error);
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
    const validation = tagCreateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check uniqueness case-insensitive
    const existing = await Tag.findOne({
      user_id: user.userId,
      name: { $regex: `^${validation.data.name}$`, $options: "i" },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Tag already exists" },
        { status: 409 }
      );
    }

    const tag = await Tag.create({
      user_id: user.userId,
      name: validation.data.name,
    });

    const serialized = {
      ...tag.toObject(),
      _id: tag._id.toString(),
      user_id: tag.user_id.toString(),
      projectsCount: 0,
      createdAt: tag.createdAt?.toISOString(),
      updatedAt: tag.updatedAt?.toISOString(),
    };

    return NextResponse.json(
      { success: true, data: serialized },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create tag error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
