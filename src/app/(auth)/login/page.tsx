"use client";

import { Suspense, useState } from "react";
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
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // ── 2FA States ────────────────────────────────────────────────────────
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isUsingBackup, setIsUsingBackup] = useState(false);
  const [is2FALoading, setIs2FALoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = (await res.json()) as {
        success: boolean;
        notVerified?: boolean;
        requires2FA?: boolean;
        userId?: string;
        error?: string;
      };

      if (!result.success) {
        if (result.notVerified) {
          toast({
            title: "Email not verified",
            description: "Please check your inbox and verify your email first.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: result.error,
            variant: "destructive",
          });
        }
        return;
      }

      // ── 2FA : Si le backend demande un code 2FA ──
      if (result.requires2FA) {
        setRequires2FA(true);
        setTwoFactorUserId(result.userId || "");
        return;
      }

      // Login normal (sans 2FA)
      toast({
        title: "Welcome back!",
        description: "You've been logged in successfully.",
      });

      router.push("/dashboard");
      router.refresh();
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

  // ── Handler pour soumettre le code 2FA ──────────────────────────────
  const handle2FASubmit = async () => {
    const minLen = isUsingBackup ? 6 : 6;
    if (!twoFactorCode || twoFactorCode.length < minLen) return;

    setIs2FALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: twoFactorUserId,
          code: twoFactorCode.replace(/\s/g, ""),
        }),
      });

      const result = (await res.json()) as {
        success: boolean;
        usedBackupCode?: boolean;
        remainingBackupCodes?: number;
        error?: string;
      };

      if (result.success) {
        if (
          result.usedBackupCode && 
          result.remainingBackupCodes !== undefined && 
          result.remainingBackupCodes < 3
        ) {
          toast({
            title: "Backup code used",
            description: `${result.remainingBackupCodes} backup codes remaining.`,
          });
        }
        toast({
          title: "Welcome back!",
          description: "2FA verified. You've been logged in successfully.",
        });
        router.push("/dashboard");
        router.refresh();
      } else {
        toast({
          title: "Invalid code",
          description: result.error || "Please try again",
          variant: "destructive",
        });
        setTwoFactorCode("");
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setTwoFactorCode("");
    } finally {
      setIs2FALoading(false);
    }
  };

  // ── UI : Si 2FA requis → afficher le formulaire 2FA ──────────────────
  if (requires2FA) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-orange-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isUsingBackup
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder={isUsingBackup ? "XXXXXXXX" : "000000"}
            value={twoFactorCode}
            onChange={(e) => {
              if (isUsingBackup) {
                setTwoFactorCode(e.target.value.toUpperCase().slice(0, 8));
              } else {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTwoFactorCode(val);
              }
            }}
            maxLength={isUsingBackup ? 8 : 6}
            className="text-center text-2xl tracking-widest h-14 font-mono"
            onKeyDown={(e) => e.key === "Enter" && handle2FASubmit()}
            autoFocus
          />

          <Button
            onClick={handle2FASubmit}
            disabled={is2FALoading || twoFactorCode.length < 6}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {is2FALoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setIsUsingBackup(!isUsingBackup);
              setTwoFactorCode("");
            }}
            className="text-sm text-muted-foreground hover:text-orange-500 transition-colors"
          >
            {isUsingBackup
              ? "Use authenticator app instead"
              : "Use a backup code instead"}
          </button>

          <button
            type="button"
            onClick={() => {
              setRequires2FA(false);
              setTwoFactorUserId("");
              setTwoFactorCode("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to login
          </button>
        </CardFooter>
      </Card>
    );
  }

  // ── UI : Formulaire de login normal ──────────────────────────────────
  return (
    <Card className="bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in to manage your LinkedIn posts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Session expired banner */}
        {reason === "session_expired" && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-orange-400 text-center">
              Your session has expired. Please log in again.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-orange-500 hover:text-orange-400 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
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
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
          >
            Register
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              Welcome Back
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
