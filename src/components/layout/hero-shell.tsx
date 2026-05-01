import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function HeroShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main
      className={cn(
        'min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_24%),linear-gradient(160deg,#020617_0%,#06101f_45%,#0f172a_100%)] px-4 py-6 text-white sm:px-6 lg:px-8',
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
