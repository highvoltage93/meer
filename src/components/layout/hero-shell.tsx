import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function HeroShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main
      className={cn(
        'min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_24%),linear-gradient(160deg,#020617_0%,#06101f_45%,#0f172a_100%)] px-4 py-6 text-white sm:px-6 lg:px-8',
        className,
      )}
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col">{children}</div>
    </main>
  );
}
