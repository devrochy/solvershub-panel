"use client";

import { useId } from "react";
import { AlertCircle } from "lucide-react";

import { FichaUnica, GrupoDeOpciones } from "@/components/ui/elegibles";
import { Input } from "@/components/ui/input";
import { NOMBRE_AGENTE_MAX } from "@/lib/onboarding";
import { errorDelNombre, inicialDe } from "@/lib/ruta-de-lanzamiento";

/**
 * Nombre del agente sugerido y editable, con ideas en fichas con la inicial (HU-UX-24, D-SPEC-49-6).
 * Llega con el sugerido («Laura» en la bienvenida, el primero del tipo en Nuevo agente); tocar una idea
 * la pone en el campo. Sin nombre muestra «Ponle un nombre para seguir»: quien la usa no deja avanzar
 * mientras `errorDelNombre` no sea `null`.
 */
export function NombreSugerido({
  valor,
  onCambiar,
  ideas,
  etiqueta = "Nombre de tu agente",
  ayuda = "Así lo verán tus clientes. Puedes cambiarlo.",
}: {
  valor: string;
  onCambiar: (nombre: string) => void;
  /** El sugerido primero (`ideasDeNombre`). */
  ideas: readonly string[];
  etiqueta?: string;
  ayuda?: string;
}) {
  const id = useId();
  const idCampo = `${id}-nombre`;
  const idMensaje = `${id}-mensaje`;
  const error = errorDelNombre(valor);
  const sugerido = ideas[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idCampo} className="flex items-center gap-2 text-sh-label text-headline">
          {etiqueta}
          {sugerido && valor.trim() === sugerido && (
            <span className="rounded-full border border-focus px-2 text-xs font-semibold leading-5 text-link">Sugerido</span>
          )}
        </label>
        <Input
          id={idCampo}
          value={valor}
          maxLength={NOMBRE_AGENTE_MAX}
          onChange={(e) => onCambiar(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={idMensaje}
          className="max-w-sm"
        />
        {error ? (
          <p id={idMensaje} role="alert" className="flex items-start gap-1 text-xs text-status-danger-fg">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : (
          <p id={idMensaje} className="text-xs text-text-soft">
            {ayuda}
          </p>
        )}
      </div>
      {ideas.length > 0 && (
        <GrupoDeOpciones titulo="Ideas de nombre" unica>
          {ideas.map((n) => (
            <FichaUnica key={n} nombre={`${id}-ideas`} valor={n} elegida={valor.trim() === n} onElegir={onCambiar} inicial={inicialDe(n)}>
              {n}
            </FichaUnica>
          ))}
        </GrupoDeOpciones>
      )}
    </div>
  );
}
