import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITag extends Document {
  user_id: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Tag name is required"],
      trim: true,
      minlength: [1, "Tag name must be at least 1 character"],
      maxlength: [50, "Tag name must be at most 50 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: one user cannot have duplicate tag names
TagSchema.index({ user_id: 1, name: 1 }, { unique: true });

const Tag =
  mongoose.models.Tag ||
  mongoose.model<ITag>("Tag", TagSchema);

export default Tag;
