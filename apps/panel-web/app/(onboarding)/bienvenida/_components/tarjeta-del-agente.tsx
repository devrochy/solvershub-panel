"use client";

import type { ReactNode } from "react";
import { Clock, MessageCircle, ShieldAlert, UserRound } from "lucide-react";

import {
  MOTIVOS_DE_ESCALAR,
  TIPOS_DE_NEGOCIO,
  TONOS,
  muestraDeVoz,
  resumenDeHorario,
  type EstadoDelAsistente,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/**
 * «Tu agente, armándose» (HU-UX-21): una tarjeta que se rellena a medida que el dueño decide. Lo vacío se
 * dibuja con línea punteada y lo decidido, sólido; así siempre ve qué lleva y qué falta. La burbuja
 * muestra cómo sonaría la primera respuesta con la voz elegida (texto fijo, sin modelo).
 */
export function TarjetaDelAgente({ estado, className }: { estado: EstadoDelAsistente; className?: string }) {
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  const nombre = estado.nombreDelAgente.trim();
  const horario = estado.horario ? resumenDeHorario(estado.horario) : "";
  const escalar = MOTIVOS_DE_ESCALAR.filter((m) => estado.motivos.includes(m.id)).map((m) => m.titulo);
  const tono = TONOS.find((t) => t.id === estado.tono)?.titulo;
  const voz = muestraDeVoz(estado, nombre, estado.negocio);

  return (
    <aside
      aria-label="Tu agente, armándose"
      className={cn("flex flex-col gap-4 rounded-lg border border-border-soft bg-surface p-5", className)}
    >
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold transition-colors motion-reduce:transition-none",
            nombre ? "bg-cta text-white" : "border border-dashed border-control-border text-text-soft",
          )}
        >
          {nombre ? nombre.charAt(0).toUpperCase() : <UserRound className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className={cn("truncate font-display text-lg font-semibold", nombre ? "text-headline" : "text-text-soft")}>
            {nombre || "Tu agente"}
          </p>
          <p className="truncate text-sm text-text-soft">
            {tipo ? tipo.titulo : "Aún sin tipo"}
            {tono && tipo ? ` · ${tono}` : ""}
          </p>
        </div>
      </header>

      <div className="flex items-start gap-2" aria-live="polite">
        <MessageCircle className="mt-2 h-4 w-4 shrink-0 text-text-soft" aria-hidden />
        <p className="rounded-lg rounded-tl-none border border-border-soft bg-hover px-3 py-2 text-sm text-body">{voz}</p>
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <Linea icono={<Clock className="h-4 w-4" />} titulo="Atiende tu equipo" valor={horario} vacio="Sin horario definido" />
        <Linea
          icono={<UserRound className="h-4 w-4" />}
          titulo="Pasa a una persona si"
          valor={escalar.join(", ")}
          vacio="Aún sin reglas"
        />
        <Linea
          icono={<ShieldAlert className="h-4 w-4" />}
          titulo="Nunca dirá"
          valor={estado.prohibidas.map((f) => `«${f}»`).join(", ")}
          vacio="Sin frases prohibidas"
        />
      </dl>
      <p className="border-t border-border-soft pt-3 text-xs text-text-soft">
        Responde las 24 horas. El horario es el de tu equipo: el agente lo conoce para avisar cuándo te pueden atender.
      </p>
    </aside>
  );
}

function Linea({ icono, titulo, valor, vacio }: { icono: ReactNode; titulo: string; valor: string; vacio: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-md px-2 py-1.5", valor ? "" : "border border-dashed border-control-border")}>
      <dt className="flex items-center gap-2 text-xs text-text-soft">
        <span className={valor ? "text-focus" : "text-text-soft"} aria-hidden>
          {icono}
        </span>
        {titulo}
      </dt>
      <dd className={cn("pl-6", valor ? "text-headline" : "text-text-soft")}>{valor || vacio}</dd>
    </div>
  );
}
