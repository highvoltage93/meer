import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.12em] uppercase',
  {
    variants: {
      variant: {
        default: 'border-slate-200/80 bg-white/75 text-slate-700',
        accent: 'border-cyan-300/60 bg-cyan-100/70 text-cyan-800',
        success: 'border-emerald-300/60 bg-emerald-100/70 text-emerald-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
