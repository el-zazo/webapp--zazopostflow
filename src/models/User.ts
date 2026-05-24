import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  avatar: string | null;
  theme: "dark" | "light";
  active: boolean;
  email_verification_token: string | null;
  email_verification_expires: Date | null;
  delete_account_token: string | null;
  delete_account_expires: Date | null;
  delete_account_requested_at: Date | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be at most 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    avatar: {
      type: String,
      default: null,
    },
    theme: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },
    active: {
      type: Boolean,
      default: false,
    },
    email_verification_token: {
      type: String,
      default: null,
    },
    email_verification_expires: {
      type: Date,
      default: null,
    },
    delete_account_token: {
      type: String,
      default: null,
    },
    delete_account_expires: {
      type: Date,
      default: null,
    },
    delete_account_requested_at: {
      type: Date,
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
