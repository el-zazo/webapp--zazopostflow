"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Trash2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Status = "loading" | "success" | "error" | "no-token";

function ConfirmDeleteAccountContent() {
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

    const confirmDeletion = async () => {
      try {
        // [FIX #2] Envoi du token via POST body au lieu d'un paramètre URL GET.
        // Cela empêche les scanners d'emails (Outlook ATP, Slack, etc.) de
        // déclencher la suppression en préchargeant le lien.
        const res = await fetch("/api/auth/confirm-delete-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (data.success) {
          setStatus("success");
          // Auto-redirect after 4 seconds
          setTimeout(() => router.push("/register"), 4000);
        } else {
          setStatus("error");
          setMessage(data.error || "Deletion failed");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    confirmDeletion();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Loading */}
        {status === "loading" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-destructive animate-spin" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Deleting your account...
              </h1>
              <p className="text-muted-foreground mt-2">
                Please wait, this may take a moment.
              </p>
            </div>
          </>
        )}

        {/* Success */}
        {status === "success" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Account Deleted
              </h1>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                Your account and all associated data have been permanently
                deleted.
                <br />
                <span className="text-sm">
                  Redirecting to register in a few seconds...
                </span>
              </p>
            </div>

            {/* What was deleted */}
            <div className="bg-muted/30 border border-border rounded-lg p-4 text-left space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Data removed
              </p>
              {["Your account", "All projects", "All posts", "All tags"].map(
                (item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    <span className="text-foreground">{item}</span>
                  </div>
                )
              )}
            </div>

            <Button
              asChild
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Link href="/register">Create a New Account</Link>
            </Button>
          </>
        )}

        {/* Error */}
        {status === "error" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Account NOT Deleted
              </h1>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                {message}
              </p>
            </div>

            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-green-400">
                Your account is safe and remains active.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                asChild
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/settings">Back to Settings</Link>
              </Button>
            </div>
          </>
        )}

        {/* No Token */}
        {status === "no-token" && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Invalid Link
              </h1>
              <p className="text-muted-foreground mt-2">
                This deletion link is invalid or has already been used.
              </p>
            </div>
            <Button
              asChild
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ConfirmDeleteAccountLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-destructive animate-spin" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
          <p className="text-muted-foreground mt-2">Please wait a moment.</p>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmDeleteAccountPage() {
  return (
    <Suspense fallback={<ConfirmDeleteAccountLoading />}>
      <ConfirmDeleteAccountContent />
    </Suspense>
  );
}
