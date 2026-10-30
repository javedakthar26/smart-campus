"use client";

import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut } from "lucide-react";
import { avatarGradient, initials } from "@/lib/grades";
import type { RoleTheme } from "@/lib/campus-theme";
import type { SessionUser } from "@/lib/campus-types";
import { cn } from "@/lib/utils";
import { AIAssistant } from "./ai-assistant";

export type NavItem = { key: string; label: string; icon: React.ReactNode };

export function DashboardShell({
  user,
  theme,
  nav,
  active,
  onNav,
  onLogout,
  children,
}: {
  user: SessionUser;
  theme: RoleTheme;
  nav: NavItem[];
  active: string;
  onNav: (key: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-h-screen flex flex-col", theme.pageBg)}>
      {/* Top header — mobile nav bar lives here too */}
      <header className={cn("sticky top-0 z-40 bg-gradient-to-r text-white shadow-lg", theme.gradient)}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-black leading-tight truncate">Smart Campus · {theme.portalName}</div>
            <div className="text-[11px] opacity-85 truncate">{theme.tagline}</div>
          </div>
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-sm font-semibold leading-tight">{user.name}</div>
              <div className="text-[11px] opacity-85">{user.role} · {user.email}</div>
            </div>
            <div className={cn("h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/50", avatarGradient(user.name))}>
              {initials(user.name)}
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 gap-1.5" onClick={onLogout}>
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
        {/* Mobile nav */}
        <nav className="lg:hidden flex gap-1 overflow-x-auto px-3 pb-2.5" aria-label="Sections">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => onNav(n.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition",
                active === n.key ? "bg-white text-gray-800 shadow" : "bg-white/15 text-white hover:bg-white/25"
              )}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 p-4">
          <div className="sticky top-24 space-y-1.5">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => onNav(n.key)}
                aria-current={active === n.key ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                  active === n.key ? cn("shadow-md", theme.sidebar) : "text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm"
                )}
              >
                {n.icon} {n.label}
              </button>
            ))}
            <div className={cn("mt-4 rounded-2xl p-4 text-white bg-gradient-to-br", theme.statGradients[0])}>
              <div className="text-2xl">{theme.emoji}</div>
              <div className="mt-1 font-bold text-sm">{theme.portalName}</div>
              <div className="text-xs opacity-85 mt-0.5">Powered by AI ✨</div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6">{children}</main>
      </div>

      <footer className="mt-auto border-t bg-white/60 py-3 text-center text-xs text-gray-400">
        Smart Campus — the all-in-one student management platform · {new Date().getFullYear()}
      </footer>

      <AIAssistant user={user} theme={theme} />
    </div>
  );
}
