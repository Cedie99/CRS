"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { AppSidebar } from "@/components/app-sidebar";

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
    <div className="flex min-h-screen flex-col">
      <div className="print:hidden">
        <Navbar
          userRole={userRole}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
        />
      </div>
      <div className="flex flex-1">
        <div className="print:hidden">
          <AppSidebar
            role={userRole}
            userName={userName}
            avatarUrl={avatarUrl}
            mobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
          />
        </div>
        <main className="min-w-0 flex-1 bg-zinc-50">
          <div className="px-4 py-6 sm:px-6 lg:px-8 print:p-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
