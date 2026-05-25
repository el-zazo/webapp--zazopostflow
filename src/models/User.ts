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
  // [FIX #6] Champ pour l'invalidation des sessions après changement de mot de passe
  // Quand un utilisateur réinitialise ou change son mot de passe, ce champ est
  // mis à jour. Lors de la vérification du JWT, on compare `iat` du token
  // avec `passwordChangedAt`. Si le token est antérieur, il est rejeté.
  passwordChangedAt: Date | null;
  // ── 2FA TOTP ──────────────────────────────────────────────────────────
  two_factor_secret: string | null;
  two_factor_enabled: boolean;
  two_factor_backup_codes: string[];
  // ── 2FA disable-by-email fallback ────────────────────────────────────
  disable_2fa_token: string | null;
  disable_2fa_expires: Date | null;
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
      // Note: minlength validates the bcrypt hash (always 60+ chars), not the
      // plaintext. Real password-length validation is done at the route level
      // via Zod. This schema constraint is kept as a safety net only.
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
    // [FIX #6] Date du dernier changement de mot de passe.
    // Permet d'invalider les JWT émis avant ce changement.
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    // ── 2FA TOTP fields ─────────────────────────────────────────────────
    two_factor_secret: {
      type: String,
      default: null,
    },
    two_factor_enabled: {
      type: Boolean,
      default: false,
    },
    two_factor_backup_codes: {
      type: [String],
      default: [],
    },
    // ── 2FA disable-by-email fallback ─────────────────────────────────
    disable_2fa_token: {
      type: String,
      default: null,
    },
    disable_2fa_expires: {
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
