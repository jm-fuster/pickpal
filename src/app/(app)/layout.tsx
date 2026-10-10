import Link from "next/link";
import { BookHeart, CalendarDays, Users, Settings } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { SafeNotificationBell } from "@/components/layout/SafeNotificationBell";
import { SidebarLink } from "@/components/layout/SidebarLink";
import { SidebarUserInfo } from "@/components/layout/SidebarUserInfo";
import { MobileNav } from "@/components/layout/MobileNav";
import { LogoMark } from "@/components/ui/LogoMark";
import { UserInitializer } from "@/components/layout/UserInitializer";
import { SessionGuard } from "@/components/layout/SessionGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <SessionGuard />
      <UserInitializer />
      {/* Skip link — primer elemento enfocable, visible solo al recibir foco */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-md focus:outline-none focus:ring-3 focus:ring-ring/50"
      >
        Saltar al contenido
      </a>
      {/* Sidebar — lg+ */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-background text-foreground border-r border-border h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <Link
            href="/agenda"
            className="font-semibold text-lg text-foreground flex items-center gap-2"
          >
            <LogoMark className="size-7" />
            PickPal
          </Link>
          <SafeNotificationBell />
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
          <SidebarLink href="/agenda">
            <CalendarDays className="size-4" aria-hidden />
            Agenda
          </SidebarLink>
          <SidebarLink href="/seres-queridos">
            <Users className="size-4" aria-hidden />
            Seres queridos
          </SidebarLink>
          <SidebarLink href="/mi-lista">
            <BookHeart className="size-4" aria-hidden />
            Mi lista
          </SidebarLink>
          <SidebarLink href="/settings">
            <Settings className="size-4" aria-hidden />
            Ajustes
          </SidebarLink>
        </nav>
        <div className="p-4 border-t border-border">
          <SidebarUserInfo />
        </div>
      </aside>

      {/* Mobile header + content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Link href="/agenda" className="font-semibold text-lg flex items-center gap-2">
              <LogoMark className="size-6" />
              PickPal
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <SafeNotificationBell />
            <UserButton />
          </div>
        </header>
        <div id="contenido" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      </div>
    </div>
  );
}
