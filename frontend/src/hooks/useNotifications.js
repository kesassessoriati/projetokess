import { useState, useEffect, useCallback, useContext } from "react";
import api from "../services/api";
import { useSocket } from "../context/SocketContext";
import { AuthContext } from "../context/Auth/AuthContext";
import alertSound from "../assets/sound.mp3";

const useNotifications = () => {
  const { user, loading: authLoading, isAuth } = useContext(AuthContext);
  const { on } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 30;

  const playNotificationSound = useCallback(() => {
    try {
      const volume = Number(localStorage.getItem("volume") || 1);
      if (!volume) return;
      const audio = new Audio(alertSound);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch(() => {});
    } catch (_) {}
  }, []);

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const { data } = await api.get("/notification-center", {
        params: { limit: LIMIT, offset: currentOffset },
      });
      const incoming = data.notifications || [];
      setNotifications((prev) => (reset ? incoming : [...prev, ...incoming]));
      setUnreadCount(data.unreadCount || 0);
      setHasMore(incoming.length >= LIMIT);
      if (!reset) setOffset(currentOffset + incoming.length);
    } catch (err) {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, offset]);

  // Initial load
  useEffect(() => {
    if (authLoading || !isAuth) return;
    fetchNotifications(true);
    // eslint-disable-next-line
  }, [user, authLoading, isAuth]);

  // Real-time Socket.io events
  useEffect(() => {
    if (!user) return;

    const companyId = user.companyId;

    const cleanup = on(`company-${companyId}-notification`, (data) => {
      if (data.action === "create") {
        // Only show notifications for current user
        if (data.notification?.userId === user.id) {
          setNotifications((prev) => [data.notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          playNotificationSound();
        }
      } else if (data.action === "markRead") {
        if (data.notificationId) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === data.notificationId ? { ...n, status: "read" } : n
            )
          );
        }
        if (data.userId === user.id) {
          setUnreadCount(0);
        }
      } else if (data.action === "markAllRead") {
        if (data.userId === user.id) {
          setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
          setUnreadCount(0);
        }
      } else if (data.action === "delete") {
        if (data.userId === user.id) {
          setNotifications((prev) => prev.filter((n) => n.id !== data.notificationId));
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } else if (data.action === "deleteAll") {
        if (data.userId === user.id) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } else if (data.action === "cleanupByTask") {
        setNotifications((prev) => prev.filter((n) => n.metadata?.taskId !== data.taskId));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [user, on, playNotificationSound]);

  const markRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/notification-center/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: "read" } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_) {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put("/notification-center/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/notification-center/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_) {}
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    try {
      await api.delete("/notification-center/all");
      setNotifications([]);
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(false);
    }
  }, [loading, hasMore, fetchNotifications]);

  const refresh = useCallback(() => {
    setOffset(0);
    fetchNotifications(true);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
    loadMore,
    refresh,
  };
};

export default useNotifications;
