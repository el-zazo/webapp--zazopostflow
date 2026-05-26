"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  Settings,
  Tags,
  Film,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

// 1. Boutons principaux visibles directement en bas (4 boutons max)
const mainNavItems = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Shorts", href: "/shorts", icon: Film },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
];

// 2. Boutons secondaires cachés dans le tiroir "More"
const moreNavItems = [
  { title: "Tags", href: "/tags", icon: Tags },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Vérifier si une des pages du menu caché est active pour colorer le bouton "More" en orange
  const isMoreActive = moreNavItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href)
  );

  return (
    <>
      {/* Mobile Bottom Navigation (SOLUTION B : Drawer coulissant) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-around h-16 px-2">
          
          {/* Rendu des 4 boutons principaux */}
          {mainNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors",
                  isActive ? "text-orange-500" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.title}</span>
              </Link>
            );
          })}

          {/* 5ème bouton : Menu "More" qui déclenche le Sheet */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors outline-none cursor-pointer",
                  isMoreActive || isOpen ? "text-orange-500" : "text-muted-foreground"
                )}
              >
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            
            {/* Tiroir qui glisse du bas (side="bottom") */}
            <SheetContent 
              side="bottom" 
              className="rounded-t-2xl border-t border-border bg-card pb-8 px-6"
            >
              <SheetHeader className="pb-3 border-b border-border text-left">
                <SheetTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Menu
                </SheetTitle>
              </SheetHeader>
              
              <div className="grid grid-cols-1 gap-1.5 py-4">
                {moreNavItems.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href);
                  return (
                    // SheetClose entoure le lien pour fermer automatiquement le menu lors du clic
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-orange-500/10 text-orange-500"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </nav>
    </>
  );
}