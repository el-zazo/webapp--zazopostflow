import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProject extends Document {
  user_id: Types.ObjectId;
  name: string;
  description: string;
  github_link: string;
  demo_link: string;
  tags: Types.ObjectId[];
  status: "active" | "archived" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [1, "Project name must be at least 1 character"],
      maxlength: [100, "Project name must be at most 100 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Description must be at most 500 characters"],
    },
    github_link: {
      type: String,
      default: "",
    },
    demo_link: {
      type: String,
      default: "",
    },
    tags: {
      type: [Schema.Types.ObjectId],
      ref: "Tag",
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "archived", "completed"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ user_id: 1, name: 1 });

const Project =
  mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
