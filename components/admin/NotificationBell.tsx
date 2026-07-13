"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface AdminNotification {
  id: number;
  type: string;
  refType: string;
  refId: number;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  userEmail?: string | null;
  onGoToPilotage?: () => void;
}

export default function NotificationBell({ userEmail, onGoToPilotage }: Props) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userEmail) return;
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // ignore network errors
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 120_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [userEmail, fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAllRead() {
    setLoading(true);
    try {
      await fetch("/api/admin/notifications", { method: "POST" });
      await fetchNotifications();
    } finally {
      setLoading(false);
    }
  }

  async function markOneRead(id: number) {
    await fetch(`/api/admin/notifications/${id}`, { method: "PATCH" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  function handleNotificationClick(n: AdminNotification) {
    if (!n.readAt) markOneRead(n.id);
    setOpen(false);
    if (onGoToPilotage) onGoToPilotage();
  }

  if (!userEmail) return null;

  const unread = notifications.filter(n => !n.readAt);
  const read = notifications.filter(n => n.readAt);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative text-gray-400 hover:text-neon-green transition-colors p-1"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-neon-green/30 rounded shadow-xl z-50 max-h-[480px] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-neon-green/20">
            <span className="text-neon-green font-mono text-xs font-bold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-[10px] text-gray-400 hover:text-neon-green transition-colors font-mono"
              >
                {loading ? "..." : "Tout marquer lu"}
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 && (
              <div className="text-center text-gray-500 text-xs font-mono py-6">Aucune notification</div>
            )}

            {unread.length > 0 && (
              <>
                {unread.map(n => (
                  <NotifItem key={n.id} n={n} onClick={() => handleNotificationClick(n)} />
                ))}
              </>
            )}

            {read.length > 0 && unread.length > 0 && (
              <div className="px-3 py-1 text-[10px] text-gray-600 font-mono border-t border-gray-800">Lus</div>
            )}

            {read.map(n => (
              <NotifItem key={n.id} n={n} onClick={() => handleNotificationClick(n)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifItem({ n, onClick }: { n: AdminNotification; onClick: () => void }) {
  const icon = n.type === "task_overdue" ? "🔴" : n.type === "task_due_soon" ? "🟡" : n.type === "followup_due" ? "⏰" : "📅";
  const isRead = !!n.readAt;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-gray-800 hover:bg-gray-800/60 transition-colors flex gap-2 ${isRead ? "opacity-50" : ""}`}
    >
      <span className="text-sm mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-mono leading-tight truncate ${isRead ? "text-gray-400" : "text-white font-semibold"}`}>
          {n.title}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.body}</div>
      </div>
      {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-neon-green shrink-0 mt-1.5" />}
    </button>
  );
}
