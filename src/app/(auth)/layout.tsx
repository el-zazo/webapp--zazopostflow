"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500">
            <PenLine className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-foreground">PostFlow</span>
        </div>
        {children}
      </div>
    </div>
  );
}
