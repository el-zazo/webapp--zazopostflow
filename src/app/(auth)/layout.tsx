"use client";

import { LogoFull } from "@/components/shared/LogoFull";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo Premium */}
        <div className="mb-8">
          <LogoFull iconSize={40} className="justify-center" />
        </div>
        {children}
      </div>
    </div>
  );
}
