"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
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
  LogOut,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface SidebarContentProps {
  role: string;
  userName?: string;
  avatarUrl?: string | null;
  onClose?: () => void;
}

function SidebarContent({ role, userName, avatarUrl, onClose }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV_ITEMS[role] ?? [];

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Mobile close button */}
      {onClose && (
        <div className="flex items-center justify-end border-b border-zinc-100 px-3 py-3">
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
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
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#2d6e1e] text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-white" : "text-zinc-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + profile + logout */}
      <div className="space-y-0.5 border-t border-zinc-100 px-3 py-3">
        {userName && (
          <Link
            href="/profile"
            onClick={onClose}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors",
              pathname === "/profile"
                ? "bg-[#2d6e1e]/10"
                : "hover:bg-zinc-100"
            )}
          >
            <Avatar className="h-7 w-7 shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              <AvatarFallback className="bg-[#2d6e1e] text-[10px] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-800">{userName}</p>
              <p className="truncate text-xs text-zinc-400">{ROLE_LABELS[role] ?? role}</p>
            </div>
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );
}

interface AppSidebarProps {
  role: string;
  userName?: string;
  avatarUrl?: string | null;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ role, userName, avatarUrl, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex">
        <SidebarContent role={role} userName={userName} avatarUrl={avatarUrl} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onMobileClose}
          />
          <div className="absolute left-0 top-0 z-50 h-full w-64 max-w-[80vw] bg-white shadow-xl">
            <SidebarContent role={role} userName={userName} avatarUrl={avatarUrl} onClose={onMobileClose} />
          </div>
        </div>
      )}
    </>
  );
}
