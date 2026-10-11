import { cn } from "@/lib/utils";

/** Atajo de teclado (paleta de comandos y ayuda de atajos). */
export function Kbd({ keys, className }: { keys: string[]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((tecla) => (
        <kbd
          key={tecla}
          className="min-w-5 rounded-sm border border-border bg-surface-2 px-1.5 py-0.5 text-center font-sans text-[11px] font-medium text-body"
        >
          {tecla}
        </kbd>
      ))}
    </span>
  );
}
