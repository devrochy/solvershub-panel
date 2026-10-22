import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform,filter] duration-200 active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-100",
  {
    variants: {
      variant: {
        // Hover pastel: se aclara y se desatura un poco, sin perder el contraste del texto.
        default: "bg-action text-white hover:brightness-110 hover:saturate-[0.82] hover:shadow-elev-1",
        accent: "bg-cta text-white hover:brightness-110 hover:saturate-[0.85] hover:shadow-elev-1",
        outline: "border border-control-border text-headline hover:border-focus/50 hover:bg-focus/10 hover:shadow-elev-1",
        ghost: "text-body hover:bg-focus/10 hover:text-headline",
        danger: "bg-danger-strong text-white hover:brightness-110 hover:saturate-[0.82] hover:shadow-elev-1",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Acción en curso: el botón queda deshabilitado con `aria-busy`, muestra un indicador y
   * conserva su texto (y su ancho), así el layout no salta.
   */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
