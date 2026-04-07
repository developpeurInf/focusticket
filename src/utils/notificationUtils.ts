
import { NotificationItem } from "@/types/notification";

const NOTIFICATIONS_KEY = "focus_ticket_notifications";

export const getStoredNotifications = (): NotificationItem[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveNotifications = (notifications: NotificationItem[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 50))); // Limit to 50
};

export const addNotification = (title: string, message: string, userName: string = "Système") => {
  const notifications = getStoredNotifications();
  const newNotif: NotificationItem = {
    id: `notif-${Date.now()}`,
    title,
    message,
    time: "À l'instant",
    read: false,
    user: {
      id: "system",
      name: userName,
      avatar: ""
    }
  };
  
  const updated = [newNotif, ...notifications];
  saveNotifications(updated);
  
  // Dispatch event for components to listen
  window.dispatchEvent(new CustomEvent('new-notification', { detail: newNotif }));
};

export const formatNotificationTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
  return new Date(timestamp).toLocaleDateString('fr-FR');
};

export const clearNotifications = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(NOTIFICATIONS_KEY);
  window.dispatchEvent(new CustomEvent('new-notification', { detail: null }));
};
