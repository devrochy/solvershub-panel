import * as React from "react";

import { cn } from "@/lib/utils";

/** Select nativo estilizado (accesible por defecto, sin dependencias). */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-control-border bg-bg-deep px-3 text-sm text-headline",
        "transition-colors hover:border-border-strong focus-visible:border-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export { Select };
