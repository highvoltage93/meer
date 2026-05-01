import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Wifi, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useNotificationsStore, type AppNotificationVariant } from '@/store/notifications-store';

const notificationStyles: Record<
  AppNotificationVariant,
  {
    icon: ReactNode;
    className: string;
  }
> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    className: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-50',
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-50',
  },
  warning: {
    icon: <Wifi className="h-4 w-4" />,
    className: 'border-amber-300/25 bg-amber-300/10 text-amber-50',
  },
  error: {
    icon: <AlertTriangle className="h-4 w-4" />,
    className: 'border-rose-300/25 bg-rose-300/10 text-rose-50',
  },
};

export function NotificationCenter() {
  const notifications = useNotificationsStore((state) => state.notifications);
  const dismissNotification = useNotificationsStore((state) => state.dismissNotification);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3 sm:right-6 sm:top-6">
      <AnimatePresence initial={false}>
        {notifications.map((notification) => {
          const style = notificationStyles[notification.variant];

          return (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'pointer-events-auto rounded-[22px] border px-4 py-3 shadow-2xl backdrop-blur-xl',
                style.className,
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10">
                  {style.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{notification.title}</p>
                  {notification.message ? (
                    <p className="mt-1 text-sm leading-5 text-white/72">{notification.message}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                  onClick={() => dismissNotification(notification.id)}
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
