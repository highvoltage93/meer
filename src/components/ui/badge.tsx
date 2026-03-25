import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.12em] uppercase',
  {
    variants: {
      variant: {
        default: 'border-white/10 bg-white/8 text-slate-200',
        accent: 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100',
        success: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-100',
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
