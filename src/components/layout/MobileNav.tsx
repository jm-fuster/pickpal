"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, BookHeart, CalendarDays, Users, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarUserInfo } from "@/components/layout/SidebarUserInfo";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/seres-queridos", label: "Seres queridos", icon: Users },
  { href: "/mi-lista", label: "Mi lista", icon: BookHeart },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetHeader className="px-5 py-5 border-b border-border">
            <SheetTitle>
              <Link
                href="/agenda"
                className="font-semibold text-lg text-foreground"
                onClick={() => setOpen(false)}
              >
                PickPal
              </Link>
            </SheetTitle>
          </SheetHeader>

          <nav aria-label="Principal" className="flex flex-col gap-1 p-3 flex-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-brand"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <SidebarUserInfo />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
