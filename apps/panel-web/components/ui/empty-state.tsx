import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Estado vacío: explica y orienta (nunca solo un "no hay datos"). */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-12 text-center", className)}>
      <p className="text-sm font-medium text-headline">{title}</p>
      {description && <p className="max-w-md text-sm text-text-soft">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
