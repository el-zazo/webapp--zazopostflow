"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md w-full">
        {/* 404 Number */}
        <div className="space-y-2">
          <h1 className="text-[120px] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-orange-500/20 select-none">
            404
          </h1>
          <div className="w-16 h-1 bg-orange-500 rounded-full mx-auto" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Page not found
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            <br />
            Check the URL or navigate back to safety.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>

          <Button
            asChild
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3">Quick links</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { label: "Projects", href: "/projects" },
              { label: "Tags", href: "/tags" },
              { label: "Calendar", href: "/calendar" },
              { label: "Settings", href: "/settings" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-orange-500 transition-colors underline-offset-4 hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
