import { cn } from "@/lib/utils";

const TAMANO = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-xl",
  "2xl": "h-28 w-28 text-3xl",
} as const;

const ESTADO = {
  online: { clase: "bg-status-success-fg", texto: "En línea" },
  offline: { clase: "bg-text-soft", texto: "Desconectado" },
} as const;

/** Iniciales del nombre (máximo 2), para cuando no hay imagen. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const letras = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0];
  return letras.toUpperCase();
}

/** Avatar con imagen o iniciales. El estado, si va, también se dice en texto. */
export function Avatar({
  name,
  src,
  size = "md",
  status,
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof TAMANO;
  status?: keyof typeof ESTADO;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatares externos sin optimizar
        <img src={src} alt={name} className={cn("rounded-full object-cover", TAMANO[size])} />
      ) : (
        <span
          role="img"
          aria-label={name}
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-surface-raised font-medium text-headline",
            TAMANO[size],
          )}
        >
          {iniciales(name)}
        </span>
      )}
      {status && (
        <span
          title={ESTADO[status].texto}
          className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-surface", ESTADO[status].clase)}
        >
          <span className="sr-only">{ESTADO[status].texto}</span>
        </span>
      )}
    </span>
  );
}
