import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPost extends Document {
  project_id: Types.ObjectId;
  name: string;
  content: string;
  type: "main" | "group";
  platform: string;
  scheduled_date: Date | null;
  published_date: Date | null;
  status: "draft" | "scheduled" | "published";
  has_videos: boolean;
  has_images: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Post name is required"],
      trim: true,
      minlength: [1, "Post name must be at least 1 character"],
      maxlength: [100, "Post name must be at most 100 characters"],
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      minlength: [1, "Post content must be at least 1 character"],
    },
    type: {
      type: String,
      enum: ["main", "group"],
      default: "main",
    },
    platform: {
      type: String,
      default: "LinkedIn",
    },
    scheduled_date: {
      type: Date,
      default: null,
      index: true,
      sparse: true,
    },
    published_date: {
      type: Date,
      default: null,
      index: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published"],
      default: "draft",
    },
    has_videos: {
      type: Boolean,
      default: false,
    },
    has_images: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common query patterns
PostSchema.index({ project_id: 1, status: 1 });
PostSchema.index({ project_id: 1, scheduled_date: 1 });
PostSchema.index({ project_id: 1, published_date: 1 });

const Post = mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
