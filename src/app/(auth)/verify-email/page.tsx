"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Status = "loading" | "success" | "error" | "no-token";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "loading" : "no-token");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = (await res.json()) as { success: boolean; message: string; error?: string };

        if (data.success) {
          setStatus("success");
          setMessage(data.message);
          // Auto-redirect after 3 seconds
          setTimeout(() => router.push("/login"), 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Loading */}
        {status === "loading" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Verifying your email...</h1>
              <p className="text-muted-foreground mt-2">Please wait a moment.</p>
            </div>
          </>
        )}

        {/* Success */}
        {status === "success" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Email Verified!</h1>
              <p className="text-muted-foreground mt-2">
                Your account is now active. Redirecting to login...
              </p>
            </div>
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
              <Link href="/login">Go to Login</Link>
            </Button>
          </>
        )}

        {/* Error */}
        {status === "error" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Verification Failed</h1>
              <p className="text-muted-foreground mt-2">{message}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild variant="outline">
                <Link href="/register">Register Again</Link>
              </Button>
              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          </>
        )}

        {/* No Token */}
        {status === "no-token" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Check Your Email</h1>
              <p className="text-muted-foreground mt-2">
                We sent a verification link to your email address.
                <br />
                Click the link to activate your account.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <Link href="/register" className="text-orange-500 hover:underline ml-1">
                try again
              </Link>
            </p>
          </>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
              <p className="text-muted-foreground mt-2">Please wait a moment.</p>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
