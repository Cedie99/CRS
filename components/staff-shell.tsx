"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { PageTransition } from "@/components/page-transition";
import { CurrentDate } from "@/components/current-date";
import { DashboardNotificationBell } from "@/components/dashboard-notification-bell";

interface StaffShellProps {
  userName: string;
  userRole: string;
  agentCode?: string | null;
  avatarUrl?: string | null;
  children: React.ReactNode;
}

export function StaffShell({
  userName,
  userRole,
  agentCode,
  avatarUrl,
  children,
}: StaffShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none">
      <div className="flex min-h-0 flex-1">
        <div className="fixed left-3 top-3 z-50 print:hidden lg:hidden">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-emerald-900/30 bg-[#0f3f26] text-emerald-50 shadow-sm transition-colors hover:bg-[#145a34]"
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <div className="print:hidden">
          <AppSidebar
            role={userRole}
            userName={userName}
            avatarUrl={avatarUrl}
            mobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
          />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-50">
          <div className="relative px-4 pb-6 pt-16 sm:px-6 sm:pt-8 lg:px-8 lg:pt-8 print:p-0">
            <div className="absolute right-4 top-3 z-10 hidden print:hidden sm:flex lg:right-8">
              <div className="inline-flex items-center gap-2">
                <DashboardNotificationBell role={userRole} />
                <CurrentDate />
              </div>
            </div>
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
