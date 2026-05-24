"use client";

import { useState, useMemo, useRef } from "react";
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
import { Loader2, Mail, CheckCircle, XCircle } from "lucide-react";
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

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters"),
    email: z.string().email("Invalid email address"),
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

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Email real-time validation states
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailValid, setEmailValid] = useState(false);
  const emailDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = form.watch("password");
  const strength = useMemo(() => getPasswordStrength(passwordValue ?? ""), [passwordValue]);
  const strengthInfo = STRENGTH_CONFIG[strength];

  // Real-time email validation with debounce
  const validateEmailRealtime = (email: string) => {
    if (!email || email.length < 5) {
      setEmailError(null);
      setEmailValid(false);
      return;
    }

    // Debounce 800ms to avoid spamming APIs
    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current);
    }

    emailDebounceRef.current = setTimeout(async () => {
      setEmailValidating(true);
      setEmailError(null);

      try {
        const res = await fetch("/api/auth/validate-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();

        if (!data.valid) {
          setEmailError(data.message || "Invalid email address");
          setEmailValid(false);
        } else {
          setEmailError(null);
          setEmailValid(true);
        }
      } catch {
        // Network error → don't block
        setEmailError(null);
        setEmailValid(false);
      } finally {
        setEmailValidating(false);
      }
    }, 800);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        toast({
          title: result.resent ? "Verification Email Resent" : "Registration Failed",
          description: result.error,
          variant: result.resent ? "default" : "destructive",
        });
        return;
      }

      // Show email verification screen instead of redirecting to dashboard
      setRegisteredEmail(result.email || data.email);
      setRegistered(true);
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

  // Email verification sent screen
  if (registered) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Check Your Email!</h1>
            <p className="text-muted-foreground mt-2">
              We sent a verification link to:
            </p>
            <p className="font-medium text-foreground mt-1 text-orange-500">
              {registeredEmail}
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              Click the link in the email to activate your account.
              The link expires in 24 hours.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Wrong email?{" "}
            <button
              onClick={() => setRegistered(false)}
              className="text-orange-500 hover:underline"
            >
              Go back
            </button>
          </p>
        </CardContent>
        <CardFooter className="justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
            <Link
              href="/login"
              className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          Create Account
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Start managing your LinkedIn posts today
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="johndoe"
                      className="bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className={`bg-background border-border pr-10 ${
                          emailError
                            ? "border-destructive focus-visible:ring-destructive"
                            : emailValid
                            ? "border-green-500 focus-visible:ring-green-500"
                            : ""
                        }`}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          validateEmailRealtime(e.target.value);
                        }}
                      />
                      {/* Validation indicator */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailValidating && (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                        {!emailValidating && emailValid && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {!emailValidating && emailError && (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  </FormControl>
                  {/* Real-time validation error message */}
                  {emailError && (
                    <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      {emailError}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
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
                            <span className="text-xs text-green-500 animate-pulse">&#10003; Ready</span>
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
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
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
              disabled={isLoading || strength < 4 || emailValidating || Boolean(emailError)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : emailValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating email...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
          >
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
