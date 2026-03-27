"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  ClipboardCheck,
  DollarSign,
  Scale,
  BadgeCheck,
  Inbox,
  FileText,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  sales_agent: [
    { label: "My Submissions", href: "/agent", icon: LayoutDashboard, exact: true },
    { label: "New Customer", href: "/agent/new", icon: Plus },
  ],
  rsr: [
    { label: "My Submissions", href: "/agent", icon: LayoutDashboard, exact: true },
    { label: "New Customer", href: "/agent/new", icon: Plus },
  ],
  sales_manager: [
    { label: "My Team", href: "/manager", icon: ClipboardCheck, exact: true },
    { label: "My Agents", href: "/manager/agents", icon: Users },
  ],
  rsr_manager: [
    { label: "My Team", href: "/manager", icon: ClipboardCheck, exact: true },
    { label: "My Agents", href: "/manager/agents", icon: Users },
  ],
  finance_reviewer: [
    { label: "Finance Review", href: "/finance", icon: DollarSign },
  ],
  legal_approver: [
    { label: "Legal Review", href: "/legal", icon: Scale },
  ],
  senior_approver: [
    { label: "Approval Queue", href: "/approver", icon: BadgeCheck },
  ],
  sales_support: [
    { label: "Sales Support", href: "/support", icon: Inbox },
  ],
  admin: [
    { label: "All Submissions", href: "/admin", icon: FileText, exact: true },
    { label: "Manage Users", href: "/admin/users", icon: Users },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  sales_agent: "Sales Agent",
  rsr: "RSR",
  sales_manager: "Sales Manager",
  rsr_manager: "RSR Manager",
  finance_reviewer: "Finance Reviewer",
  legal_approver: "Legal Approver",
  senior_approver: "Senior Approver",
  sales_support: "Sales Support",
  admin: "Admin",
};

function SidebarContent({ role, onClose }: { role: string; onClose?: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Navigation
          </p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-800">
            {ROLE_LABELS[role] ?? role}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#2d6e1e]/10 text-[#2d6e1e]"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-[#2d6e1e]" : "text-zinc-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-100 px-4 py-3">
        <p className="text-[10px] leading-relaxed text-zinc-400">
          Oracle Petroleum
          <br />
          Toll Blend Division
        </p>
      </div>
    </div>
  );
}

interface AppSidebarProps {
  role: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ role, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        <SidebarContent role={role} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
          />
          <div className="absolute left-0 top-0 z-50 h-full w-64 max-w-[80vw] bg-white shadow-xl">
            <SidebarContent role={role} onClose={onMobileClose} />
          </div>
        </div>
      )}
    </>
  );
}
