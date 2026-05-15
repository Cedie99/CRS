"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Plus,
  RefreshCw,
  ClipboardCheck,
  DollarSign,
  Scale,
  BadgeCheck,
  Inbox,
  FileText,
  Users,
  LogOut,
  X,
  Database,
  Network,
  List,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, humanizeDisplayValue } from "@/lib/utils";

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
    { label: "All Records", href: "/agent/records", icon: List },
    { label: "Customer Updates", href: "/agent/cus", icon: RefreshCw },
  ],
  rsr: [
    { label: "My Submissions", href: "/agent", icon: LayoutDashboard, exact: true },
    { label: "New Customer", href: "/agent/new", icon: Plus },
    { label: "All Records", href: "/agent/records", icon: List },
    { label: "Customer Updates", href: "/agent/cus", icon: RefreshCw },
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
    { label: "Finance Review", href: "/finance", icon: DollarSign, exact: true },
    { label: "Customer Updates", href: "/finance/cus", icon: RefreshCw },
  ],
  legal_approver: [
    { label: "Legal Review", href: "/legal", icon: Scale, exact: true },
    { label: "Customer Updates", href: "/legal/cus", icon: RefreshCw },
  ],
  senior_approver: [
    { label: "Approval Queue", href: "/approver", icon: BadgeCheck },
  ],
  sales_support: [
    { label: "Sales Support", href: "/support", icon: Inbox },
  ],
  project_development_specialist: [
    { label: "ERP Encoding Queue", href: "/specialist", icon: Database },
  ],
  admin: [
    { label: "All Submissions", href: "/admin", icon: FileText, exact: true },
    { label: "Manage Users", href: "/admin/users", icon: Users, exact: true },
    { label: "Create User", href: "/admin/users/new", icon: Plus },
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
  project_development_specialist: "Project Dev Specialist",
  admin: "Admin",
};

interface SidebarContentProps {
  role: string;
  userName?: string;
  avatarUrl?: string | null;
  isTopManager?: boolean;
  onClose?: () => void;
}

function useSidebarBadges(role: string) {
  const [badges, setBadges] = useState<Record<string, number>>({});

  const fetchBadges = useCallback(async () => {
    if (
      role !== "finance_reviewer" &&
      role !== "legal_approver" &&
      role !== "admin" &&
      role !== "sales_agent" &&
      role !== "rsr"
    ) return;
    try {
      const res = await fetch("/api/sidebar-badges");
      if (res.ok) setBadges(await res.json());
    } catch { /* silent */ }
  }, [role]);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchBadges();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchBadges]);

  return badges;
}

function SidebarContent({ role, userName, avatarUrl, isTopManager = false, onClose }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const baseItems = NAV_ITEMS[role] ?? [];
  const badges = useSidebarBadges(role);

  // Inject "Team Overview" for top-level managers
  const items: NavItem[] =
    isTopManager && (role === "sales_manager" || role === "rsr_manager")
      ? [...baseItems, { label: "Team Overview", href: "/manager/team", icon: Network }]
      : baseItems;

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-linear-to-b from-[#0c3b22] via-[#125a31] to-[#1f7a43] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(166,247,199,0.2),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(220,252,231,0.18),transparent_35%)]" />

      <div className="relative border-b border-white/15 px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Oracle Petroleum</p>
        <h2 className="mt-1 text-sm font-semibold tracking-wide text-emerald-50">Customer Request System</h2>
      </div>

      {/* Mobile close button */}
      {onClose && (
        <div className="relative flex items-center justify-end border-b border-white/15 px-3 py-2.5">
          <button
            onClick={onClose}
            className="rounded-md p-1 text-emerald-100/80 hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Nav items */}
      <nav className="relative flex-1 space-y-1 px-3 py-4">
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
                "group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/20 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
                  : "text-emerald-50/90 hover:bg-white/12 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-white" : "text-emerald-100/70 group-hover:text-emerald-50"
                )}
              />
              <span className="flex-1 min-w-0 truncate">{item.label}</span>
              {(badges[item.href] ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                  {badges[item.href]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info + profile + logout */}
      <div className="relative space-y-1 border-t border-white/15 bg-black/10 px-3 py-3 backdrop-blur-sm">
        {userName && (
          <Link
            href="/profile"
            onClick={onClose}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors",
              pathname === "/profile"
                ? "bg-white/20"
                : "hover:bg-white/12"
            )}
          >
            <Avatar className="h-7 w-7 shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              <AvatarFallback className="bg-emerald-100 text-[10px] font-semibold text-emerald-900">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="truncate text-xs text-emerald-100/80">{ROLE_LABELS[role] ?? humanizeDisplayValue(role)}</p>
            </div>
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-emerald-100/90 transition-colors hover:bg-red-500/20 hover:text-red-100"
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
  isTopManager?: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ role, userName, avatarUrl, isTopManager = false, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden w-56 shrink-0 lg:block">
        <aside className="fixed left-0 top-0 h-screen w-56 border-r border-emerald-900/40 shadow-[0_14px_36px_-24px_rgba(0,0,0,0.8)]">
          <SidebarContent role={role} userName={userName} avatarUrl={avatarUrl} isTopManager={isTopManager} />
        </aside>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/55"
            onClick={onMobileClose}
          />
          <div className="absolute left-0 top-0 z-50 h-full w-64 max-w-[80vw] border-r border-emerald-900/40 shadow-2xl">
            <SidebarContent role={role} userName={userName} avatarUrl={avatarUrl} isTopManager={isTopManager} onClose={onMobileClose} />
          </div>
        </div>
      )}
    </>
  );
}
