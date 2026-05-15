"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightCircle,
  BadgeCheck,
  Bell,
  CheckCheck,
  CircleDot,
  ClipboardList,
  Database,
  PartyPopper,
  RotateCcw,
  Sparkles,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow, humanizeDisplayValue } from "@/lib/utils";

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

const ROLE_LABELS: Record<string, string> = {
  sales_agent: "Sales Agent",
  rsr: "RSR",
  sales_manager: "Sales Manager",
  rsr_manager: "RSR Manager",
  finance_reviewer: "Finance Reviewer",
  legal_approver: "Legal Approver",
  senior_approver: "Senior Approver",
  sales_support: "Sales Support",
  project_development_specialist: "Project Development Specialist",
  admin: "Admin",
};

type Notification = {
  id: string;
  cisId: string;
  cusId?: string | null;
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

type NotificationMeta = {
  icon: React.ReactNode;
  bg: string;
};

function getNotificationMeta(message: string): NotificationMeta {
  const lower = message.toLowerCase();

  if (lower.includes("denied")) {
    return {
      icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
      bg: "bg-red-50 ring-1 ring-red-100",
    };
  }
  if (lower.includes("returned") || lower.includes("revision")) {
    return {
      icon: <RotateCcw className="h-3.5 w-3.5 text-orange-500" />,
      bg: "bg-orange-50 ring-1 ring-orange-100",
    };
  }
  if (lower.includes("onboard") || lower.includes("complete") || lower.includes("erp encoded")) {
    return {
      icon: <PartyPopper className="h-3.5 w-3.5 text-violet-500" />,
      bg: "bg-violet-50 ring-1 ring-violet-100",
    };
  }
  if (lower.includes("erp") || lower.includes("encoding")) {
    return {
      icon: <Database className="h-3.5 w-3.5 text-indigo-500" />,
      bg: "bg-indigo-50 ring-1 ring-indigo-100",
    };
  }
  if (lower.includes("approved")) {
    return {
      icon: <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />,
      bg: "bg-emerald-50 ring-1 ring-emerald-100",
    };
  }
  if (lower.includes("forward") || lower.includes("sent to")) {
    return {
      icon: <ArrowRightCircle className="h-3.5 w-3.5 text-sky-500" />,
      bg: "bg-sky-50 ring-1 ring-sky-100",
    };
  }
  if (lower.includes("submitted") || lower.includes("action needed") || lower.includes("review")) {
    return {
      icon: <ClipboardList className="h-3.5 w-3.5 text-amber-500" />,
      bg: "bg-amber-50 ring-1 ring-amber-100",
    };
  }
  return {
    icon: <CircleDot className="h-3.5 w-3.5 text-zinc-400" />,
    bg: "bg-zinc-100 ring-1 ring-zinc-200",
  };
}

export function DashboardNotificationBell({ role }: DashboardNotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
  const [isPendingLoading, setIsPendingLoading] = useState(false);

  const isAdmin = role === "admin";
  const homeHref = ROLE_HREFS[role] ?? "/";
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const totalBadgeCount = unreadCount + pendingRegistrations.length;
  const isInitialLoading = isNotificationsLoading || (isAdmin && isPendingLoading);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch {
      // silent
    } finally {
      setIsNotificationsLoading(false);
    }
  }, []);

  const fetchPendingRegistrations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pending-registrations");
      if (res.ok) setPendingRegistrations(await res.json());
    } catch {
      // silent
    } finally {
      setIsPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isAdmin) return;
    setIsPendingLoading(true);
    fetchPendingRegistrations();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchPendingRegistrations();
    }, 60_000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchPendingRegistrations]);

  useEffect(() => {
    const shouldShowWelcome = sessionStorage.getItem("crs:showWelcomeToast") === "1";
    if (!shouldShowWelcome) return;

    sessionStorage.removeItem("crs:showWelcomeToast");
    toast.success({
      title: "Welcome back",
      description: `Signed in as ${ROLE_LABELS[role] ?? humanizeDisplayValue(role)}.`,
      icon: <Sparkles className="h-4 w-4" />,
      duration: 5200,
      autopilot: { expand: 120, collapse: 3600 },
    });
  }, [role]);

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
        className="w-80 max-h-[min(72vh,34rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-[0_20px_45px_-30px_rgba(10,10,10,0.65)] backdrop-blur-md"
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

        <div className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain">
          {isInitialLoading ? (
            <div className="space-y-2.5 px-3 py-3" aria-label="Loading notifications">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-zinc-200" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="h-2.5 w-11/12 animate-pulse rounded bg-zinc-200" />
                      <div className="h-2.5 w-7/12 animate-pulse rounded bg-zinc-200" />
                      <div className="h-2 w-16 animate-pulse rounded bg-zinc-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isAdmin && pendingRegistrations.length > 0 ? (
            <>
              <div className="px-3 py-1.5">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-amber-600">
                  <UserPlus className="h-3 w-3" />
                  Pending Activation
                </span>
              </div>
              <div className="divide-y divide-zinc-100">
                {pendingRegistrations.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    className="flex cursor-pointer items-start gap-3 bg-amber-50/50 px-4 py-3 hover:bg-amber-50 transition-colors"
                    onClick={() => {
                      setNotifOpen(false);
                      router.push("/admin/users");
                    }}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-amber-100">
                      <UserPlus className="h-3.5 w-3.5 text-amber-600" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-snug text-zinc-900">
                        {u.fullName} registered and needs activation
                      </p>
                      <span className="mt-1 block text-[10px] font-medium text-zinc-400">
                        {formatDistanceToNow(new Date(u.createdAt))}
                      </span>
                    </div>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  </DropdownMenuItem>
                ))}
              </div>
              {notifications.length > 0 && <DropdownMenuSeparator />}
            </>
          ) : null}

          {!isInitialLoading && notifications.length === 0 && pendingRegistrations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <Bell className="h-6 w-6 text-zinc-300" />
              <p className="text-sm text-zinc-400">No notifications yet</p>
            </div>
          ) : !isInitialLoading && notifications.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {notifications.map((n) => {
                const meta = getNotificationMeta(n.message);
                return (
                  <DropdownMenuItem
                    key={n.id}
                    className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors first:pt-3 last:pb-3 ${!n.isRead ? "bg-emerald-50/50 hover:bg-emerald-50" : "hover:bg-zinc-50"}`}
                    onClick={() => {
                      setNotifOpen(false);
                      router.push(n.cusId ? `${homeHref}/cus/${n.cusId}` : `${homeHref}/${n.cisId}`);
                    }}
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs leading-snug ${!n.isRead ? "font-semibold text-zinc-900" : "font-normal text-zinc-600"}`}>
                        {n.message}
                      </p>
                      <span className="mt-1 block text-[10px] font-medium text-zinc-400">
                        {formatDistanceToNow(new Date(n.sentAt))}
                      </span>
                    </div>
                    {!n.isRead && (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          ) : null}
        </div>

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
