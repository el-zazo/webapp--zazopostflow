import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { validateEmailAdvanced } from "@/lib/email-validator";
import { sendVerificationEmail } from "@/lib/email";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const { username, email, password } = validation.data;

    // Advanced email validation (async - 5 steps: syntax, blocklist, DNS, APIs)
    const emailValidation = await validateEmailAdvanced(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.userMessage || emailValidation.reason },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) {
        // If account exists but not verified, resend verification email
        if (!existingUser.active) {
          const newToken = crypto.randomBytes(32).toString("hex");
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

          await User.findByIdAndUpdate(existingUser._id, {
            email_verification_token: newToken,
            email_verification_expires: expires,
          });

          await sendVerificationEmail(email, newToken);

          return NextResponse.json(
            {
              success: false,
              error: "Account exists but not verified. A new verification email has been sent.",
              resent: true,
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { success: false, error: "Email already registered" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Username already taken" },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcryptjs.genSalt(12);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Create user with active: false
    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      active: false,
      email_verification_token: verificationToken,
      email_verification_expires: verificationExpires,
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken);

    if (!emailResult.success) {
      // Delete the user if email fails to send
      await User.findByIdAndDelete(user._id);
      return NextResponse.json(
        { success: false, error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    // Respond without logging in (wait for verification)
    return NextResponse.json({
      success: true,
      message: "Account created! Please check your email to verify your account.",
      email: email,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
