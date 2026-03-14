"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAlerts,
  markAlertRead,
  getUnreadCount,
} from "@/services/notifications";
import { collection, query, orderBy, limit as fbLimit } from "@/lib/firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import type { NotificationAlert } from "@/types/notification";

import { Button } from "@/components/ui/button";

// ─── NotificationBell Component ─────────────────────────────────────

export function NotificationBell() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch initial alerts
  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const [alertList, count] = await Promise.all([
        getAlerts(user.uid, 5),
        getUnreadCount(user.uid),
      ]);
      setAlerts(alertList);
      setUnreadCount(count);
    } catch {
      // Silently handle — notifications are non-critical
    }
  }, [user]);

  // Real-time listener for new alerts, with fetchAlerts as error fallback
  useEffect(() => {
    if (!user) return;

    fetchAlerts();

    const alertsRef = collection(db, "notifications", user.uid, "alerts");
    const q = query(alertsRef, orderBy("createdAt", "desc"), fbLimit(5));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newAlerts = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as unknown as NotificationAlert
      );
      setAlerts(newAlerts);
      setUnreadCount(newAlerts.filter((a) => !a.read).length);
    });

    return () => unsubscribe();
  }, [user, fetchAlerts]);

  async function handleMarkRead(alertId: string) {
    if (!user) return;
    try {
      await markAlertRead(user.uid, alertId);
      // Real-time listener will update the UI automatically
    } catch {
      // Silent fail for non-critical
    }
  }

  function formatTime(date: Date | string | { seconds: number }): string {
    const d = typeof date === "object" && "seconds" in date
      ? new Date(date.seconds * 1000)
      : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 rounded-full p-0"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">
                <span className="font-kannada">ಅಧಿಸೂಚನೆಗಳು</span>
                <span className="ml-1 text-slate-400">Notifications</span>
              </h3>
            </div>

            {alerts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="text-2xl">🔕</span>
                <p className="mt-2 text-sm text-slate-400">
                  <span className="font-kannada">ಹೊಸ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ</span>
                  <br />
                  No new notifications
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => handleMarkRead(alert.id)}
                    className={`w-full border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      !alert.read ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-700">
                        {alert.messageKn}
                      </p>
                      {!alert.read && (
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {alert.messageEn}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-300">
                      {formatTime(alert.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
