import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PostFlow - LinkedIn Post Manager for Developers",
  description:
    "Organize, schedule, and manage your LinkedIn posts across all your development projects.",
  // Les icônes sont désormais gérées automatiquement par les fichiers
  // conventionnels Next.js :
  //   - src/app/icon.tsx        → /icon (favicon PNG 32×32)
  //   - src/app/apple-icon.tsx  → /apple-icon (PNG 180×180)
  // Plus besoin de déclarer manuellement icons.metadata — Next.js injecte
  // les balises <link rel="icon"> et <link rel="apple-touch-icon"> au build.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
