import { cn } from "@/lib/utils";

/** Separador horizontal sutil (ritmo visual sin ruido). */
export function Separator({ className }: { className?: string }) {
  return <hr aria-hidden className={cn("border-0 border-t border-border-soft", className)} />;
}
