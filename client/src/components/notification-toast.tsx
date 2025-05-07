import { useState, useEffect } from "react";
import { useNotification } from "@/hooks/use-notification";

export default function NotificationToast() {
  const { notifications } = useNotification();
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0 && !activeNotification) {
      setActiveNotification(notifications[notifications.length - 1]);
      setVisible(true);
      
      // Hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setActiveNotification(null), 500); // Wait for fade out animation
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notifications, activeNotification]);

  if (!activeNotification) return null;

  return (
    <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 mb-4 z-20 bg-dark text-white px-4 py-3 rounded-lg shadow-lg flex items-center max-w-sm mx-auto transition-opacity duration-500 ${
      visible ? 'opacity-90' : 'opacity-0'
    }`}>
      <span className="material-icons mr-2 text-secondary">check_circle</span>
      <p className="text-sm">{activeNotification}</p>
      <button 
        className="ml-3 text-gray-300 hover:text-white"
        onClick={() => setVisible(false)}
      >
        <span className="material-icons text-sm">close</span>
      </button>
    </div>
  );
}
