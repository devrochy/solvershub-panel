"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Clock, Hourglass, MessageSquare, MessageSquareMore, MessagesSquare, Sun, Waves, Zap } from "lucide-react";

import { CampoOpcion } from "@/app/(app)/configuracion/_components/campo-opcion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TarjetaElegible } from "@/components/ui/elegibles";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { CatalogoConfig, IdentitySettings, OpcionConfig, ValorPosibleConfig } from "@/lib/api/types";
import { indexarCatalogo } from "@/lib/catalogo-config";
import type { usePendientes } from "@/lib/frases-pendientes";
import { CALIDEZ_ETIQUETAS, EMOJIS, muestraDeVoz, TONOS, type Emojis, type Tono } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import {
  ENVIOS,
  esVelocidadSecundaria,
  largoDeMaxLength,
  negocioParaLaMuestra,
  NOTA_ENVIO,
  NOTA_VELOCIDAD,
  resumenDeRitmo,
  TITULO_ENVIO,
  VELOCIDADES,
  VELOCIDADES_SECUNDARIAS,
} from "@/lib/voz-estilo";
import type { SeccionId } from "@/lib/configuracion-secciones";

/**
 * «Voz y estilo» (HU-CFG-12): la personalidad se elige y se escucha; el ritmo se elige entre
 * tarjetas con icono y texto. La muestra usa la misma función pura que la bienvenida (sin LLM) y
 * cada bloque declara si se aplica ahora, al publicar o al crear el agente.
 *
 * Los valores, etiquetas y notas salen del catálogo; aquí solo viven los iconos, el orden de las
 * opciones principales y las frases que resumen la decisión.
 */

const ICONO_VELOCIDAD: Record<string, ReactNode> = {
  inmediato: <Sun className="h-4 w-4" aria-hidden />,
  corto: <Clock className="h-4 w-4" aria-hidden />,
  rapido: <Zap className="h-4 w-4" aria-hidden />,
  natural: <Waves className="h-4 w-4" aria-hidden />,
  pausado: <Hourglass className="h-4 w-4" aria-hidden />,
};

const ICONO_ENVIO: Record<string, ReactNode> = {
  un_mensaje: <MessageSquare className="h-4 w-4" aria-hidden />,
  pocos_cortos: <MessageSquareMore className="h-4 w-4" aria-hidden />,
  varios_cortos: <MessagesSquare className="h-4 w-4" aria-hidden />,
};

function valorDe(opcion: OpcionConfig | undefined, valor: string): ValorPosibleConfig | undefined {
  return opcion?.valores?.find((v) => v.valor === valor);
}

export function VozYEstilo({
  identity,
  catalogo,
  valores,
  errores,
  cambiar,
  pendientes,
  irASeccion,
}: {
  identity: IdentitySettings;
  catalogo: CatalogoConfig;
  valores: Record<string, unknown>;
  errores: Record<string, string>;
  cambiar: (clave: string, valor: unknown) => void;
  pendientes: ReturnType<typeof usePendientes>;
  irASeccion?: (id: SeccionId) => void;
}) {
  const indice = useMemo(() => indexarCatalogo(catalogo), [catalogo]);

  const tonoOpcion = indice.get("persona_tone");
  const emojisOpcion = indice.get("persona_emojis");
  const velocidadOpcion = indice.get("debounce_mode");
  const envioOpcion = indice.get("split_style");
  const largoOpcion = indice.get("persona_max_length");
  const prohibidasOpcion = indice.get("persona_forbidden");

  const tonoGuardado = String(valores.persona_tone ?? tonoOpcion?.por_defecto ?? "cercano");
  const tono = (TONOS.some((t) => t.id === tonoGuardado) ? tonoGuardado : "cercano") as Tono;
  const calidez = Math.min(5, Math.max(0, Number(valores.persona_warmth ?? 3)));
  const emojisGuardados = String(valores.persona_emojis ?? emojisOpcion?.por_defecto ?? "sparse");
  const emojis = (EMOJIS.some((e) => e.id === emojisGuardados) ? emojisGuardados : "sparse") as Emojis;
  const velocidad = String(valores.debounce_mode ?? velocidadOpcion?.por_defecto ?? "natural");
  const envio = String(valores.split_style ?? envioOpcion?.por_defecto ?? "un_mensaje");
  const maxLength = Number(valores.persona_max_length ?? largoOpcion?.por_defecto ?? 500);

  const [mostrarExtras, setMostrarExtras] = useState(() => esVelocidadSecundaria(velocidad));
  const velocidadesVisibles = [
    ...VELOCIDADES,
    ...(mostrarExtras || esVelocidadSecundaria(velocidad) ? VELOCIDADES_SECUNDARIAS : []),
  ];
  const puedeOcultarExtras = !esVelocidadSecundaria(velocidad);

  const nombre = String(valores.assistant_name ?? identity.assistant_name);
  const descripcion = String(valores.business_description ?? identity.business_description);
  const muestra = muestraDeVoz(
    { tono, calidez, emojis, largo: largoDeMaxLength(maxLength) },
    nombre,
    negocioParaLaMuestra(descripcion),
  );
  const envioValor = valorDe(envioOpcion, envio);
  const resumen = resumenDeRitmo(
    valorDe(velocidadOpcion, velocidad) ?? null,
    envioValor ? { ...envioValor, etiqueta: TITULO_ENVIO[envio] ?? envioValor.etiqueta } : null,
  );
  const tonoElegido = TONOS.find((t) => t.id === tono);
  const emojisElegido = EMOJIS.find((e) => e.id === emojis);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="voz-muestra" className="flex flex-col gap-2 rounded-lg border border-border-soft bg-surface-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 id="voz-muestra" className="text-xs font-semibold text-text-soft">
            Así suena
          </h3>
          <span className="text-xs text-text-soft">En vivo</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="max-w-[88%] rounded-xl rounded-bl-sm border border-border-soft bg-surface p-3 text-sm text-body">
            <span className="mb-1 block text-xs text-text-soft">Cliente</span>
            Hola, ¿tienen domicilio al centro?
          </div>
          <div className="ml-auto max-w-[88%] rounded-xl rounded-br-sm border border-border-soft bg-surface-raised p-3 text-sm text-headline">
            <span className="mb-1 block text-xs text-text-soft">{nombre || "Tu asistente"}</span>
            <span aria-live="polite">{muestra}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{tonoElegido?.titulo ?? tono}</Badge>
          <Badge>
            Calidez {calidez} · {CALIDEZ_ETIQUETAS[calidez]}
          </Badge>
          <Badge>{emojisElegido?.titulo ?? emojis}</Badge>
        </div>
      </section>

      <section aria-labelledby="voz-personalidad" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="voz-personalidad" className="text-sm font-semibold text-headline">
            Personalidad
          </h3>
          <Badge variant="warning">Aplica al publicar</Badge>
        </div>
        <p className="text-xs text-text-soft">Cómo suena en el primer mensaje y en el trato del día a día.</p>

        <div>
          <p id="voz-tono" className="mb-1.5 text-sh-label text-body">
            Tono
          </p>
          <div role="group" aria-labelledby="voz-tono" className="grid gap-2 sm:grid-cols-2">
            {TONOS.map((t) => (
              <TarjetaElegible
                key={t.id}
                nombre="persona_tono"
                valor={t.id}
                elegida={tono === t.id}
                onElegir={(v) => cambiar("persona_tone", v)}
                titulo={t.titulo}
                ayuda={`«${t.muestra}»`}
                className="min-h-16 p-3"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sh-label text-body">Calidez</p>
            <p className="text-xs text-text-soft">
              {calidez} · {CALIDEZ_ETIQUETAS[calidez]}
            </p>
          </div>
          <div className="hidden sm:block">
            <SegmentedControl
              label="Calidez"
              options={CALIDEZ_ETIQUETAS.map((etiqueta, indice) => ({ value: String(indice), label: String(indice) }))}
              value={String(calidez)}
              onChange={(v) => cambiar("persona_warmth", Number(v))}
            />
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => cambiar("persona_warmth", Math.max(0, calidez - 1))}
              aria-label="Menos calidez"
            >
              −
            </Button>
            <p className="min-w-28 text-center text-sm font-medium text-headline">
              {calidez} · {CALIDEZ_ETIQUETAS[calidez]}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => cambiar("persona_warmth", Math.min(5, calidez + 1))}
              aria-label="Más calidez"
            >
              +
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex gap-1" aria-hidden>
              {CALIDEZ_ETIQUETAS.map((_, i) => (
                <span key={i} className={cn("h-1.5 w-4 rounded-full", i < calidez ? "bg-focus" : "bg-border")} />
              ))}
            </span>
            <span className="text-xs text-text-soft">0 seco · 5 muy cálido</span>
          </div>
        </div>

        <div>
          <p id="voz-emojis" className="mb-1.5 text-sh-label text-body">
            Emojis
          </p>
          <SegmentedControl
            label="Emojis"
            options={EMOJIS.map((e) => ({ value: e.id, label: e.titulo }))}
            value={emojis}
            onChange={(v) => cambiar("persona_emojis", v)}
          />
        </div>
      </section>

      <section aria-labelledby="voz-ritmo" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="voz-ritmo" className="text-sm font-semibold text-headline">
            Ritmo
          </h3>
          <Badge variant="success">Aplica ahora</Badge>
        </div>
        <p className="text-xs text-text-soft">Se guarda y aplica en la siguiente conversación, sin publicar.</p>

        {velocidadOpcion && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p id="voz-velocidad" className="text-sh-label text-body">
                {velocidadOpcion.etiqueta}
              </p>
              {(puedeOcultarExtras || !mostrarExtras) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMostrarExtras((v) => !v)}
                  aria-expanded={mostrarExtras}
                  aria-controls="voz-velocidades"
                >
                  {mostrarExtras ? "Menos opciones" : "Más opciones"}
                </Button>
              )}
            </div>
            <div id="voz-velocidades" role="group" aria-labelledby="voz-velocidad" className="grid gap-2 sm:grid-cols-3">
              {velocidadesVisibles.map((clave) => {
                const valor = valorDe(velocidadOpcion, clave);
                if (!valor) return null;
                return (
                  <TarjetaElegible
                    key={clave}
                    nombre="velocidad"
                    valor={clave}
                    elegida={velocidad === clave}
                    onElegir={(v) => cambiar("debounce_mode", v)}
                    titulo={valor.etiqueta}
                    ayuda={NOTA_VELOCIDAD[clave] ?? valor.nota}
                    icono={ICONO_VELOCIDAD[clave]}
                    className="min-h-16 p-3"
                  />
                );
              })}
            </div>
          </div>
        )}

        {envioOpcion && (
          <div>
            <p id="voz-envio" className="mb-1.5 text-sh-label text-body">
              {envioOpcion.etiqueta}
            </p>
            <div role="group" aria-labelledby="voz-envio" className="grid gap-2 sm:grid-cols-3">
              {ENVIOS.map((clave) => {
                const valor = valorDe(envioOpcion, clave);
                if (!valor) return null;
                return (
                  <TarjetaElegible
                    key={clave}
                    nombre="envio"
                    valor={clave}
                    elegida={envio === clave}
                    onElegir={(v) => cambiar("split_style", v)}
                    titulo={TITULO_ENVIO[clave] ?? valor.etiqueta}
                    ayuda={NOTA_ENVIO[clave] ?? valor.nota}
                    icono={ICONO_ENVIO[clave]}
                    className="min-h-16 p-3"
                  />
                );
              })}
            </div>
          </div>
        )}

        {resumen && (
          <p role="status" aria-live="polite" className="text-xs text-text-soft">
            <span className="font-medium text-body">Así responde:</span> {resumen}
          </p>
        )}
      </section>

      <details className="rounded-md border border-border-soft bg-surface-2">
        <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-xs font-medium text-body">
          Avanzado · límites de este negocio
          <Badge variant="info">Aplica al crear el agente</Badge>
        </summary>
        <div className="grid gap-4 border-t border-border-soft p-3 sm:grid-cols-2">
          {largoOpcion && (
            <CampoOpcion
              opcion={largoOpcion}
              valores={valores}
              onChange={cambiar}
              error={errores.persona_max_length}
              etiquetaDe={(clave) => indice.get(clave)?.etiqueta}
            />
          )}
          {prohibidasOpcion && (
            <CampoOpcion
              opcion={prohibidasOpcion}
              valores={valores}
              onChange={cambiar}
              error={errores.persona_forbidden}
              onPendiente={pendientes.registrar("persona_forbidden")}
              etiquetaDe={(clave) => indice.get(clave)?.etiqueta}
            />
          )}
        </div>
        <p className="px-3 pb-3 text-xs text-text-soft">
          Cambiar esto aquí <strong>no</strong> afecta a los agentes ya publicados.{" "}
          <Link href="/agentes" className="text-link underline">
            Editar en la ficha del agente
          </Link>
          .
        </p>
      </details>

      <p className="text-xs text-text-soft">
        «Si no logra corregir su respuesta» se movió a{" "}
        {irASeccion ? (
          <button type="button" className="text-link underline" onClick={() => irASeccion("calidad")}>
            Calidad de respuestas
          </button>
        ) : (
          "Calidad de respuestas"
        )}
        , junto a los reintentos.
      </p>
    </div>
  );
}
