import { useCallback, useEffect, useRef, useState } from 'react';
import { AppContext } from './appContextStore';

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const notificationIdRef = useRef(0);
  const notificationTimersRef = useRef(new Map());

  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);

  const clearNotificationTimer = useCallback((id) => {
    const timerId = notificationTimersRef.current.get(id);
    if (typeof timerId !== 'undefined') {
      window.clearTimeout(timerId);
      notificationTimersRef.current.delete(id);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    clearNotificationTimer(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, [clearNotificationTimer]);

  const addNotification = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${notificationIdRef.current++}`;
    setNotifications((prev) => [...prev, { id, message, type }]);

    const timerId = window.setTimeout(() => {
      notificationTimersRef.current.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
    notificationTimersRef.current.set(id, timerId);

    return id;
  }, []);

  useEffect(() => {
    const notificationTimers = notificationTimersRef.current;

    return () => {
      for (const timerId of notificationTimers.values()) {
        window.clearTimeout(timerId);
      }
      notificationTimers.clear();
    };
  }, []);

  const startProcessing = useCallback((message = 'Processing...') => {
    setLoadingMessage(message);
    setIsProcessing(true);
  }, []);

  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        notifications,
        addNotification,
        removeNotification,
        isProcessing,
        loadingMessage,
        startProcessing,
        stopProcessing,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
