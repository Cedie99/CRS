"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { PageTransition } from "@/components/page-transition";
import { DashboardNotificationBell } from "@/components/dashboard-notification-bell";

interface StaffShellProps {
  userName: string;
  userRole: string;
  agentCode?: string | null;
  avatarUrl?: string | null;
  isTopManager?: boolean;
  children: React.ReactNode;
}

export function StaffShell({
  userName,
  userRole,
  agentCode,
  avatarUrl,
  isTopManager = false,
  children,
}: StaffShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none">
      <div className="flex min-h-0 flex-1">
        {/* Mobile top bar — hamburger + branding + notification bell */}
        <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-emerald-900/30 bg-[#0f3f26] px-3 print:hidden lg:hidden">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-emerald-50 transition-colors hover:bg-white/10 active:bg-white/20"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center leading-none">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-100/60">Oracle Petroleum</p>
            <p className="mt-0.5 text-xs font-bold tracking-wide text-white">Customer Request System</p>
          </div>
          <DashboardNotificationBell role={userRole} />
        </div>

        <div className="print:hidden">
          <AppSidebar
            role={userRole}
            userName={userName}
            avatarUrl={avatarUrl}
            isTopManager={isTopManager}
            mobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
          />
        </div>
        <main className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-zinc-50">
          <div aria-hidden className="pointer-events-none fixed bottom-0 left-0 right-0 z-0 h-120 overflow-hidden print:hidden lg:left-56">
            <div
              className="absolute inset-0 bg-bottom bg-no-repeat"
              style={{
                backgroundImage: "url('/dashboard-bg-wave.svg?v=2')",
                backgroundSize: "cover",
                opacity: 0.4,
              }}
            />
          </div>

          <div className="relative z-10 px-4 pb-6 pt-20 sm:px-6 lg:px-8 lg:pt-8 print:p-0">
            {/* Notification bell — desktop only (mobile sees it in the top bar) */}
            <div className="absolute right-4 top-3 z-10 hidden print:hidden lg:flex lg:right-8">
              <DashboardNotificationBell role={userRole} />
            </div>
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
