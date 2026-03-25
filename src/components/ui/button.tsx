import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
  {
    variants: {
      variant: {
        default: 'bg-slate-950 text-white hover:bg-slate-800 focus-visible:ring-slate-900',
        secondary: 'bg-white/12 text-white hover:bg-white/18 focus-visible:ring-white',
        ghost: 'bg-transparent text-slate-200 hover:bg-white/10 focus-visible:ring-white',
        outline: 'border border-white/15 bg-transparent text-slate-100 hover:bg-white/8 focus-visible:ring-white',
        destructive: 'bg-rose-500 text-white hover:bg-rose-400 focus-visible:ring-rose-400',
        accent: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200 focus-visible:ring-cyan-200',
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
