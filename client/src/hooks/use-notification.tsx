import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { setupMessageListener, requestNotificationPermissionAndToken } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";

interface NotificationContextType {
  notificationPermission: NotificationPermission;
  notifications: string[];
  showNotification: (message: string) => void;
  clearNotifications: () => void;
  requestNotificationPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [notifications, setNotifications] = useState<string[]>([]);

  // Check notification permission on load
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Set up FCM listener when user is logged in
  useEffect(() => {
    if (!user) return;
    
    const setupFCM = async () => {
      if (notificationPermission === "granted") {
        try {
          const token = await requestNotificationPermissionAndToken();
          console.log("FCM Token:", token);
          
          // Listen for messages
          setupMessageListener((payload) => {
            console.log("Message received:", payload);
            const message = payload.notification?.body || "New notification";
            showNotification(message);
          });
        } catch (error) {
          console.error("Error setting up FCM:", error);
        }
      }
    };
    
    setupFCM();
  }, [user, notificationPermission]);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") return false;
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === "granted") {
        const token = await requestNotificationPermissionAndToken();
        console.log("FCM Token:", token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  };

  // Show notification
  const showNotification = useCallback((message: string) => {
    // Add to notification list
    setNotifications(prev => [...prev, message]);
    
    // Show toast
    toast({
      description: message,
    });
    
    // If permission is granted, show system notification when page is not visible
    if (notificationPermission === "granted" && document.visibilityState !== "visible") {
      try {
        new Notification("PTC Coin", {
          body: message,
          icon: "/logo192.png",
        });
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    }
  }, [notificationPermission]);

  // Clear notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  const value: NotificationContextType = {
    notificationPermission,
    notifications,
    showNotification,
    clearNotifications,
    requestNotificationPermission,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
