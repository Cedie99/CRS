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
      <Navbar
        userName={userName}
        userRole={userRole}
        agentCode={agentCode}
        avatarUrl={avatarUrl}
        onMenuToggle={() => setSidebarOpen((o) => !o)}
      />
      <div className="flex flex-1">
        <AppSidebar
          role={userRole}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1 bg-zinc-50">
          <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
