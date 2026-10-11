import { cn } from "@/lib/utils";

/**
 * Bloque de carga: conserva la forma del contenido (mejor que un spinner). Estático, sin
 * pulso (DESIGN.md · Motion). `lines` dibuja un párrafo de líneas de texto.
 */
export function Skeleton({ className, lines }: { className?: string; lines?: number }) {
  if (lines && lines > 1) {
    return (
      <div aria-hidden className={cn("flex flex-col gap-2", className)}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={cn("h-3 rounded-sm bg-hover", i === lines - 1 && "w-2/3")} />
        ))}
      </div>
    );
  }
  return <div aria-hidden className={cn("rounded-md bg-hover", className)} />;
}
