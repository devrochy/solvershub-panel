import { cn } from "@/lib/utils";

/**
 * Logo de SolversHub en la tinta del tema activo. Se pintan las dos variantes y
 * globals.css oculta la que no corresponde al `data-theme` de <html>, así el cambio
 * de tema no espera a ningún render.
 *
 * - `wordmark`: SOLVERSHUB en una línea (barra lateral).
 * - `logo`: isotipo simple + SOLVERSHUB (pantallas de acceso).
 * - `isotipo`: solo el símbolo, cuadrado (barra lateral plegada).
 */
export function Marca({ pieza, className }: { pieza: "wordmark" | "logo" | "isotipo"; className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/marca/${pieza}-tema-oscuro.svg`}
        alt="SolversHub"
        className={cn("marca-tema-oscuro", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/marca/${pieza}-tema-claro.svg`}
        alt="SolversHub"
        className={cn("marca-tema-claro", className)}
      />
    </>
  );
}
