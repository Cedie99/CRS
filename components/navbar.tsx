"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, LogOut, CheckCheck, User, Menu, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "@/lib/utils";

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

const ROLE_HREFS: Record<string, string> = {
  sales_agent: "/agent",
  rsr: "/agent",
  sales_manager: "/manager",
  rsr_manager: "/manager",
  finance_reviewer: "/finance",
  legal_approver: "/legal",
  senior_approver: "/approver",
  sales_support: "/support",
  admin: "/admin",
};

type Notification = {
  id: string;
  cisId: string;
  message: string;
  isRead: boolean;
  sentAt: string;
};

type PendingRegistration = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
};

interface NavbarProps {
  userName: string;
  userRole: string;
  agentCode?: string | null;
  avatarUrl?: string | null;
  onMenuToggle?: () => void;
}

export function Navbar({ userName, userRole, agentCode, avatarUrl, onMenuToggle }: NavbarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const isAdmin = userRole === "admin";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const homeHref = ROLE_HREFS[userRole] ?? "/";
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const totalBadgeCount = unreadCount + pendingRegistrations.length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch {
      // silent
    }
  }, []);

  const fetchPendingRegistrations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pending-registrations");
      if (res.ok) setPendingRegistrations(await res.json());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchPendingRegistrations();
    const interval = setInterval(fetchPendingRegistrations, 30_000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchPendingRegistrations]);

  async function handleOpenNotifications(open: boolean) {
    setNotifOpen(open);
    if (open && unreadCount > 0) {
      // Optimistically mark all as read in UI
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetch("/api/notifications", { method: "PATCH" });
    }
  }

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-[#1a1a1a]">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:outline-none lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        <Link href={homeHref} className="flex items-center gap-3">
          <Image
            src="/oracle-logo.png"
            alt="Oracle Petroleum"
            width={120}
            height={36}
            className="h-9 w-auto object-contain"
            priority
          />
          <span className="hidden h-5 w-px bg-zinc-600 sm:block" />
          <span className="hidden text-[10px] uppercase tracking-widest text-zinc-400 sm:block">
            Customer Request System
          </span>
          <span className="hidden rounded-md bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-300 sm:block">
            {ROLE_LABELS[userRole] ?? userRole}
          </span>
        </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <DropdownMenu open={notifOpen} onOpenChange={handleOpenNotifications}>
            <DropdownMenuTrigger className="relative flex h-11 w-11 items-center justify-center rounded-md text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:outline-none">
              <Bell className="h-4 w-4" />
              {totalBadgeCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff0000] text-[12px] font-bold text-[#ffffff]">
                  {totalBadgeCount > 9 ? "9+" : totalBadgeCount}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1rem)]">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-semibold text-zinc-900">Notifications</span>
                {(notifications.length + pendingRegistrations.length) > 0 && (
                  <span className="text-xs text-zinc-400">
                    {notifications.length + pendingRegistrations.length} total
                  </span>
                )}
              </div>
              <DropdownMenuSeparator />

              {/* Pending registrations — admin only */}
              {isAdmin && pendingRegistrations.length > 0 && (
                <>
                  <div className="px-3 py-1.5">
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-amber-600">
                      <UserPlus className="h-3 w-3" />
                      Pending Activation
                    </span>
                  </div>
                  {pendingRegistrations.map((u) => (
                    <DropdownMenuItem
                      key={u.id}
                      className="flex cursor-pointer flex-col items-start gap-1 px-3 py-2.5"
                      onClick={() => {
                        setNotifOpen(false);
                        router.push("/admin/users");
                      }}
                    >
                      <div className="flex w-full items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <p className="flex-1 text-s font-medium leading-relaxed text-zinc-900">
                          {u.fullName} registered and needs activation
                        </p>
                      </div>
                      <span className="pl-3.5 text-[10px] text-zinc-400">
                        {formatDistanceToNow(new Date(u.createdAt))}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  {notifications.length > 0 && <DropdownMenuSeparator />}
                </>
              )}

              {notifications.length === 0 && pendingRegistrations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                  <Bell className="h-6 w-6 text-zinc-300" />
                  <p className="text-sm text-zinc-400">No notifications yet</p>
                </div>
              ) : notifications.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex cursor-pointer flex-col items-start gap-1 px-3 py-2.5"
                      onClick={() => {
                        setNotifOpen(false);
                        router.push(`${homeHref}/${n.cisId}`);
                      }}
                    >
                      <div className="flex w-full items-start gap-2">
                        {!n.isRead && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2d6e1e]" />
                        )}
                        <p className={`flex-1 text-xs leading-relaxed ${!n.isRead ? "font-medium text-zinc-900" : "text-zinc-500"}`}>
                          {n.message}
                        </p>
                      </div>
                      <span className="pl-3.5 text-[10px] text-zinc-400">
                        {formatDistanceToNow(new Date(n.sentAt))}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : null}

              {notifications.some((n) => !n.isRead) === false && notifications.length > 0 && pendingRegistrations.length === 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-zinc-400">
                    <CheckCheck className="h-3 w-3" />
                    All caught up
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#2d6e1e]">
              <Avatar className="h-8 w-8 cursor-pointer">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-[#2d6e1e] text-xs text-white">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 max-w-[calc(100vw-1rem)]">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {ROLE_LABELS[userRole]}
                  {agentCode && (
                    <span className="ml-1 font-mono">· {agentCode}</span>
                  )}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
