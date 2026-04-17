"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CheckCheck, Menu, Sparkles, UserPlus } from "lucide-react";
import { sileo as toast } from "sileo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  userRole: string;
  onMenuToggle?: () => void;
}

export function Navbar({ userRole, onMenuToggle }: NavbarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const initializedRealtimeRef = useRef(false);

  const isAdmin = userRole === "admin";
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

  useEffect(() => {
    if (!initializedRealtimeRef.current) {
      seenNotificationIdsRef.current = new Set(notifications.map((n) => n.id));
      initializedRealtimeRef.current = true;
      return;
    }

    const freshNotifications = notifications.filter((n) => !n.isRead && !seenNotificationIdsRef.current.has(n.id));
    freshNotifications.slice(0, 3).forEach((n) => {
      toast.info({
        title: "New update",
        description: n.message,
        icon: <BellRing className="h-4 w-4" />,
        button: {
          title: "View",
          onClick: () => router.push(`${homeHref}/${n.cisId}`),
        },
      });
    });
    seenNotificationIdsRef.current = new Set(notifications.map((n) => n.id));
  }, [notifications, router, homeHref]);

  useEffect(() => {
    const shouldShowWelcome = sessionStorage.getItem("crs:showWelcomeToast") === "1";
    if (!shouldShowWelcome) return;

    sessionStorage.removeItem("crs:showWelcomeToast");
    toast.success({
      title: "Welcome back",
      description: `Signed in as ${ROLE_LABELS[userRole] ?? userRole}.`,
      icon: <Sparkles className="h-4 w-4" />,
      duration: 5200,
      autopilot: { expand: 120, collapse: 3600 },
    });
  }, [userRole]);

  async function handleOpenNotifications(open: boolean) {
    setNotifOpen(open);
    if (open && unreadCount > 0) {
      // Optimistically mark all as read in UI
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetch("/api/notifications", { method: "PATCH" });
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-900/40 bg-linear-to-r from-[#0a2f1d] via-[#0f3f26] to-[#145a34]">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            onClick={onMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-md text-emerald-100/85 hover:bg-white/12 hover:text-white focus-visible:outline-none lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        <Link href={homeHref} className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/oracle-logo.png"
            alt="Oracle Petroleum"
            width={120}
            height={36}
            className="h-8 w-auto object-contain sm:h-9"
            priority
          />
          <span className="hidden h-5 w-px bg-emerald-200/30 sm:block" />
          <span className="hidden text-[10px] uppercase tracking-widest text-emerald-100/75 sm:block">
            Customer Request System
          </span>
          <span className="hidden rounded-md border border-emerald-200/20 bg-white/10 px-2 py-0.5 text-xs font-medium text-emerald-50 sm:block">
            {ROLE_LABELS[userRole] ?? userRole}
          </span>
        </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <DropdownMenu open={notifOpen} onOpenChange={handleOpenNotifications}>
            <DropdownMenuTrigger className="relative flex h-11 w-11 items-center justify-center rounded-md text-emerald-100/85 hover:bg-white/12 hover:text-white focus-visible:outline-none cursor-pointer">
              <Bell className="h-4 w-4" />
              {totalBadgeCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff0000] text-[12px] font-bold text-[#ffffff]">
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
                      className="flex cursor-pointer flex-col items-start gap-1 rounded-xl px-3 py-2.5"
                      onClick={() => {
                        setNotifOpen(false);
                        router.push("/admin/users");
                      }}
                    >
                      <div className="flex w-full items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
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

        </div>
      </div>
    </header>
  );
}
