"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-muted-foreground text-sm">
            An unexpected error occurred while loading this page. You can try
            again or go back to the dashboard.
          </p>
        </div>

        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => reset()}>
            Try Again
          </Button>
          <Button
            asChild
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <a href="/dashboard">Back to Dashboard</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
