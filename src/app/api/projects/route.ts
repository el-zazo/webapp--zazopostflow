import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import Tag from "@/models/Tag";
import { requireAuth } from "@/lib/auth";
// [FIX #7] Import de la fonction d'échappement regex
import { escapeRegExp } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

const projectCreateSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().max(500).optional(),
  github_link: z.string().url("Invalid GitHub URL").or(z.literal("")).optional(),
  demo_link: z.string().url("Invalid demo URL").or(z.literal("")).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 60000, max: 60, identifier: "api:projects:get" });
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
          "X-RateLimit-Limit": String(60),
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const tag = searchParams.get("tag");
    const tagsParam = searchParams.get("tags");
    const tagIds = tagsParam
      ? tagsParam.split(",").filter(Boolean)
      : [];
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const sortDirection: 1 | -1 = sortOrder === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    // [FIX #15] Validation des ObjectId dans le paramètre tags.
    // Avant: Des tags invalides comme ?tags=foo,bar provoquaient une
    // exception BSONTypeError dans `new mongoose.Types.ObjectId("foo")`,
    // causant un 500. Maintenant: on valide chaque ID et on retourne 400
    // si un ID est invalide.
    for (const tagId of tagIds) {
      if (!mongoose.Types.ObjectId.isValid(tagId)) {
        return NextResponse.json(
          { success: false, error: `Invalid tag ID: "${tagId}". Each tag ID must be a valid 24-character hex string.` },
          { status: 400 }
        );
      }
    }

    // Build match query — use ObjectId for aggregation
    const matchQuery: Record<string, unknown> = {
      user_id: new mongoose.Types.ObjectId(user.userId),
    };

    if (status && status !== "all") {
      matchQuery.status = status;
    }

    // Build search conditions
    const andConditions: Record<string, unknown>[] = [];

    // [FIX #7] Échappement regex dans la recherche de tags et de projets
    if (search) {
      const escapedSearch = escapeRegExp(search);

      const matchingTags = await Tag.find({
        user_id: user.userId,
        name: { $regex: escapedSearch, $options: "i" },
      }).select("_id");

      const matchingTagIds = matchingTags.map((t) => t._id);

      andConditions.push({
        $or: [
          { name: { $regex: escapedSearch, $options: "i" } },
          ...(matchingTagIds.length > 0 ? [{ tags: { $in: matchingTagIds } }] : []),
        ],
      });
    }

    // Filter by specific tag ObjectId (legacy single-tag filter)
    if (tag && tag !== "all" && tagIds.length === 0) {
      andConditions.push({ tags: tag });
    }

    // Filter by multiple tags (all must match)
    if (tagIds.length > 0) {
      andConditions.push({
        tags: {
          $all: tagIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      });
    }

    // Merge AND conditions into matchQuery
    if (andConditions.length === 1) {
      Object.assign(matchQuery, andConditions[0]);
    } else if (andConditions.length > 1) {
      matchQuery.$and = andConditions;
    }

    // ─── AGGREGATION PIPELINE (all sort fields) ───
    // FIX #1: Use aggregation for ALL sort cases to eliminate N+1 queries.
    // The pipeline handles postsCount via $lookup + $size, and also supports
    // simple field sorts (name, status, createdAt, etc.) directly.
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchQuery },

      // Count posts for each project
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "project_id",
          as: "postsData",
        },
      },

      // Add computed fields
      {
        $addFields: {
          postsCount: { $size: "$postsData" },
          tagsCount: { $size: { $ifNull: ["$tags", []] } },
        },
      },

      // Remove heavy postsData array
      { $project: { postsData: 0 } },

      // Sort by requested field + tiebreaker
      { $sort: { [sortBy]: sortDirection, _id: 1 } },

      // Facet for pagination + total in one query
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            // Populate tags via lookup
            {
              $lookup: {
                from: "tags",
                localField: "tags",
                foreignField: "_id",
                as: "tags",
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const result = await Project.aggregate(pipeline);
    const projects = result[0]?.data || [];
    const totalItems = result[0]?.total[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    // Normalize: aggregate returns ObjectId, frontend expects string
    const serialized = projects.map((p: Record<string, unknown>) => ({
      ...p,
      _id: (p._id as { toString: () => string }).toString(),
      user_id: (p.user_id as { toString: () => string })?.toString?.(),
      tags: (p.tags as Array<Record<string, unknown>>)?.map((t) => ({
        _id: (t._id as { toString: () => string }).toString(),
        name: t.name,
      })) || [],
      createdAt: (p.createdAt as Date)?.toISOString?.(),
      updatedAt: (p.updatedAt as Date)?.toISOString?.(),
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
    console.error("Get projects error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { windowMs: 60000, max: 20, identifier: "api:projects:post" });
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

    const body = await request.json();
    const validation = projectCreateSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    await dbConnect();

    const project = await Project.create({
      ...validation.data,
      user_id: user.userId,
    });

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

    return NextResponse.json(
      { success: true, data: serialized },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
