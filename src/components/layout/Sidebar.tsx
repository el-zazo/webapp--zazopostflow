"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  Settings,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { apiFetch } from "@/lib/api-client";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Tags",
    href: "/tags",
    icon: Tags,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.data?.user?.username) {
          setUsername(data.data.user.username);
        }
      } catch {
        // Silently fail
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
      <div className="flex flex-col h-full bg-card border-r border-border">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-6 py-5 group">
          <img
            src="/logo.svg"
            alt="PostFlow"
            className="w-8 h-8 rounded-lg transition-transform duration-200 group-hover:scale-105"
          />
          <span className="text-lg font-bold text-foreground tracking-tight">
            Post<span className="text-orange-500">Flow</span>
          </span>
        </Link>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-orange-500/10 text-orange-500"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Logout - mt-auto pour forcer en bas */}
        <div className="p-3 mt-auto">
          <LogoutButton
            variant="sidebar"
            username={username || "Account"}
          />
        </div>
      </div>
    </div>
  );
}
