import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
  {
    variants: {
      variant: {
        default: 'bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] hover:bg-slate-800 focus-visible:ring-slate-900',
        secondary: 'border border-slate-200/80 bg-white/85 text-slate-800 shadow-sm hover:bg-white focus-visible:ring-slate-300',
        ghost: 'bg-transparent text-slate-700 hover:bg-white/70 focus-visible:ring-slate-300',
        outline: 'border border-slate-200 bg-white/40 text-slate-800 hover:border-cyan-300 hover:bg-white/85 focus-visible:ring-cyan-200',
        destructive: 'bg-rose-500 text-white shadow-[0_12px_26px_rgba(244,63,94,0.24)] hover:bg-rose-400 focus-visible:ring-rose-400',
        accent: 'bg-[linear-gradient(135deg,#67e8f9,#22d3ee_48%,#34d399)] text-slate-950 shadow-[0_16px_34px_rgba(34,211,238,0.28)] hover:brightness-105 focus-visible:ring-cyan-200',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
