import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import { AppShell } from '@/shell/app-shell';
import { AuthPage } from '@/pages/auth-page';
import { HomePage } from '@/pages/home-page';
import { PreJoinPage } from '@/pages/prejoin-page';
import { MeetingRoomPage } from '@/pages/meeting-room-page';
import { HeroShell } from '@/components/layout/hero-shell';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';

function RequireAuth() {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return (
      <HeroShell className="items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="space-y-3 p-6">
            <h1 className="text-2xl font-semibold">Loading session</h1>
            <p className="text-sm text-slate-400">Checking your JWT before opening the workspace.</p>
          </CardContent>
        </Card>
      </HeroShell>
    );
  }

  if (!session) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { path: 'login', element: <AuthPage mode="login" /> },
      { path: 'register', element: <AuthPage mode="register" /> },
      {
        element: <RequireAuth />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'meeting/:meetingId/prejoin', element: <PreJoinPage /> },
          { path: 'meeting/:meetingId', element: <MeetingRoomPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
