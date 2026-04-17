"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CheckCheck, CircleSlash, ShieldCheck, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "@/lib/utils";

const ROLE_HREFS: Record<string, string> = {
  sales_agent: "/agent",
  rsr: "/agent",
  sales_manager: "/manager",
  rsr_manager: "/manager",
  finance_reviewer: "/finance",
  legal_approver: "/legal",
  senior_approver: "/approver",
  sales_support: "/support",
  project_development_specialist: "/specialist",
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

interface DashboardNotificationBellProps {
  role: string;
}

function getNotificationIcon(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("denied") || lower.includes("returned")) {
    return <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />;
  }
  if (lower.includes("approved") || lower.includes("onboard") || lower.includes("erp")) {
    return <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />;
  }
  return <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />;
}

export function DashboardNotificationBell({ role }: DashboardNotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const isAdmin = role === "admin";
  const homeHref = ROLE_HREFS[role] ?? "/";
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
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetch("/api/notifications", { method: "PATCH" });
    }
  }

  return (
    <DropdownMenu open={notifOpen} onOpenChange={handleOpenNotifications}>
      <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-emerald-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-emerald-800 focus-visible:outline-none cursor-pointer">
        <Bell className="h-4 w-4" />
        {totalBadgeCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalBadgeCount > 9 ? "9+" : totalBadgeCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[calc(100vw-1rem)] rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-[0_20px_45px_-30px_rgba(10,10,10,0.65)] backdrop-blur-md"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold text-zinc-900">Notifications</span>
          {(notifications.length + pendingRegistrations.length) > 0 && (
            <span className="text-xs text-zinc-400">
              {notifications.length + pendingRegistrations.length} total
            </span>
          )}
        </div>
        <DropdownMenuSeparator />

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
                className="flex cursor-pointer flex-col items-start gap-1 rounded-xl px-3 py-2.5"
                onClick={() => {
                  setNotifOpen(false);
                  router.push("/admin/users");
                }}
              >
                <div className="flex w-full items-start gap-2">
                  <UserPlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <p className="flex-1 text-xs font-medium leading-relaxed text-zinc-900">
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
                className="flex cursor-pointer flex-col items-start gap-1 rounded-xl px-3 py-2.5"
                onClick={() => {
                  setNotifOpen(false);
                  router.push(`${homeHref}/${n.cisId}`);
                }}
              >
                <div className="flex w-full items-start gap-2">
                  {getNotificationIcon(n.message)}
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
  );
}
