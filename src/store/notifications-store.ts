import { create } from 'zustand';

export type AppNotificationVariant = 'info' | 'success' | 'warning' | 'error';

export type AppNotification = {
  id: string;
  title: string;
  message?: string;
  variant: AppNotificationVariant;
  createdAt: string;
};

type AddNotificationInput = {
  title: string;
  message?: string;
  variant?: AppNotificationVariant;
  durationMs?: number;
};

type NotificationsState = {
  notifications: AppNotification[];
  addNotification: (input: AddNotificationInput) => string;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
};

const dismissalTimers = new Map<string, number>();

function createNotificationId() {
  return crypto.randomUUID();
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  addNotification(input) {
    const id = createNotificationId();
    const notification: AppNotification = {
      id,
      title: input.title,
      message: input.message,
      variant: input.variant ?? 'info',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 6),
    }));

    const timer = window.setTimeout(() => {
      get().dismissNotification(id);
    }, input.durationMs ?? 4200);

    dismissalTimers.set(id, timer);
    return id;
  },
  dismissNotification(id) {
    const timer = dismissalTimers.get(id);
    if (timer) {
      window.clearTimeout(timer);
      dismissalTimers.delete(id);
    }

    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    }));
  },
  clearNotifications() {
    dismissalTimers.forEach((timer) => window.clearTimeout(timer));
    dismissalTimers.clear();
    set({ notifications: [] });
  },
}));
