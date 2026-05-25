"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Password strength logic ──────────────────────────────────────────
function getPasswordStrength(pass: string): number {
  if (!pass) return 0;

  const hasLower = /[a-z]/.test(pass);
  const hasUpper = /[A-Z]/.test(pass);
  const hasDigit = /[0-9]/.test(pass);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pass);

  // Bar 4 (Green): ≥12 characters + uppercase + lowercase + digit + special
  if (pass.length >= 12 && hasUpper && hasLower && hasDigit && hasSpecial) {
    return 4;
  }
  // Bar 3 (Orange): ≥10 characters + uppercase + lowercase + digit
  if (pass.length >= 10 && hasUpper && hasLower && hasDigit) {
    return 3;
  }
  // Bar 2 (Yellow): ≥8 characters + (digit OR special)
  if (pass.length >= 8 && (hasDigit || hasSpecial)) {
    return 2;
  }
  // Bar 1 (Red): any non-empty password (weak baseline)
  return 1;
}

const STRENGTH_CONFIG: Record<number, { label: string; color: string; shadow: string }> = {
  0: { label: "", color: "bg-muted", shadow: "" },
  1: { label: "Weak", color: "bg-red-500", shadow: "shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
  2: { label: "Fair", color: "bg-yellow-500", shadow: "shadow-[0_0_8px_rgba(234,179,8,0.5)]" },
  3: { label: "Good", color: "bg-orange-500", shadow: "shadow-[0_0_8px_rgba(249,115,22,0.5)]" },
  4: { label: "Very Strong", color: "bg-green-500", shadow: "shadow-[0_0_8px_rgba(34,197,94,0.5)]" },
};

const resetPasswordSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string(),
  })
  .refine((data) => getPasswordStrength(data.password) >= 4, {
    message: "Password must be very strong",
    path: ["password"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const token = searchParams.get("token");

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = form.watch("password");
  const strength = useMemo(() => getPasswordStrength(passwordValue ?? ""), [passwordValue]);
  const strengthInfo = STRENGTH_CONFIG[strength];

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast({
        title: "Error",
        description: "Invalid or missing reset token",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = (await res.json()) as { success: boolean; error?: string };

      if (result.success) {
        setIsSuccess(true);
        toast({
          title: "Password Reset!",
          description: "You can now log in with your new password.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            Invalid Link
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            This password reset link is invalid or has expired. Please request a
            new one.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href="/forgot-password"
            className="text-sm text-orange-500 hover:text-orange-400 font-medium transition-colors inline-flex items-center gap-1"
          >
            Request New Link
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Password Reset Successfully
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Your password has been updated. You can now sign in with your new
            password.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="text-sm text-orange-500 hover:text-orange-400 font-medium transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          Reset Your Password
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="At least 12 characters"
                      className="bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  {/* Password strength bars */}
                  {passwordValue && passwordValue.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map((bar) => (
                          <div
                            key={bar}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              bar <= strength
                                ? `${strengthInfo.color} ${strengthInfo.shadow}`
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      {strengthInfo.label && (
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-medium transition-all duration-300 ${
                              strength === 4
                                ? "text-green-500"
                                : strength === 3
                                ? "text-orange-500"
                                : strength === 2
                                ? "text-yellow-500"
                                : "text-red-500"
                            }`}
                          >
                            {strengthInfo.label}
                          </span>
                          {strength === 4 && (
                            <span className="text-xs text-green-500 animate-pulse">✓ Ready</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your new password"
                      className="bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isLoading || strength < 4}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              Loading...
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Please wait while we verify your reset link.
            </CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
