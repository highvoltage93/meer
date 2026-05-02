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
    className: 'border-cyan-200 bg-cyan-50/95 text-cyan-800',
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: 'border-emerald-200 bg-emerald-50/95 text-emerald-800',
  },
  warning: {
    icon: <Wifi className="h-4 w-4" />,
    className: 'border-amber-200 bg-amber-50/95 text-amber-800',
  },
  error: {
    icon: <AlertTriangle className="h-4 w-4" />,
    className: 'border-rose-200 bg-rose-50/95 text-rose-800',
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
                'pointer-events-auto rounded-[22px] border px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl',
                style.className,
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70">
                  {style.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                  {notification.message ? (
                    <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-950"
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
