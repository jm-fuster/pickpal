"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, CalendarDays, Users, Settings } from "lucide-react";
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

export function MobileNavSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0 flex flex-col">
        <SheetHeader className="px-5 py-5 border-b border-border">
          <SheetTitle>
            <Link
              href="/agenda"
              className="font-semibold text-lg text-foreground"
              onClick={() => onOpenChange(false)}
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
                onClick={() => onOpenChange(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  // La barra de la izquierda es la marca de «estás aquí» que no
                  // depende del color: el tinte solo da 1,1–1,2:1 contra el
                  // panel y el texto activo 1,7:1 contra los demás. La barra
                  // da 15:1 en claro y 6,3:1 en oscuro (docs/design-system.md).
                  isActive
                    ? "relative bg-primary/10 text-brand before:absolute before:top-1/2 before:left-1 before:h-4.5 before:w-0.75 before:-translate-y-1/2 before:rounded-full before:bg-brand"
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
  );
}
