import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { NotificationCenter } from '@/components/ui/notification-center';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationsStore } from '@/store/notifications-store';

export function AppShell() {
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const addNotification = useNotificationsStore((state) => state.addNotification);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearSession();
      addNotification({
        title: 'Session expired',
        message: 'Please enter your name again before joining a room.',
        variant: 'warning',
      });
    };

    window.addEventListener('mitingo:session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('mitingo:session-expired', handleSessionExpired);
    };
  }, [addNotification, clearSession]);

  return (
    <>
      <Outlet />
      <NotificationCenter />
    </>
  );
}
