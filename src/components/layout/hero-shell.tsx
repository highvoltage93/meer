import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function HeroShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main
      className={cn(
        'min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.20),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_30%),linear-gradient(145deg,#ffffff_0%,#f8fbff_42%,#eaf6ff_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8',
        className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col"
      >
        {children}
      </motion.div>
    </main>
  );
}
