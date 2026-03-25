import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/shell/app-shell';
import { HomePage } from '@/pages/home-page';
import { PreJoinPage } from '@/pages/prejoin-page';
import { MeetingRoomPage } from '@/pages/meeting-room-page';
import { NotFoundPage } from '@/pages/not-found-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'meeting/:meetingId/prejoin', element: <PreJoinPage /> },
      { path: 'meeting/:meetingId', element: <MeetingRoomPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
