import { cn } from "@/lib/utils";

/** Bloque de carga (mejor que un spinner: conserva la forma del contenido). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-hover", className)} />;
}
