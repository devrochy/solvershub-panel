"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { AccesibilidadPanel } from "@/app/(app)/configuracion/_components/accesibilidad-panel";
import { AdvancedPanel } from "@/app/(app)/configuracion/_components/advanced-panel";
import { BajasCard } from "@/app/(app)/configuracion/_components/bajas-card";
import { AvisoDatosCard } from "@/app/(app)/configuracion/_components/aviso-datos-card";
import { DatosClienteCard } from "@/app/(app)/configuracion/_components/datos-cliente-card";
import { BrainForm } from "@/app/(app)/configuracion/_components/brain-form";
import { IdentityForm } from "@/app/(app)/configuracion/_components/identity-form";
import { MemoryForm } from "@/app/(app)/configuracion/_components/memory-form";
import { MultimediaForm } from "@/app/(app)/configuracion/_components/multimedia-form";
import { SkillsForm } from "@/app/(app)/configuracion/_components/skills-form";
import { WebChatForm } from "@/app/(app)/configuracion/_components/web-chat-form";
import { WawebCard } from "@/app/(app)/configuracion/_components/waweb-card";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { AvisoDatos } from "@/lib/aviso-datos";
import { CambiosSinGuardarProvider, useRegistroDeCambios } from "@/lib/cambios-sin-guardar";
import {
  consultaConSeccion,
  GRUPOS_MENU,
  resolverSeccion,
  seccionesVisibles,
  seccionPorId,
  SECCIONES_DE_IDENTIDAD,
  type SeccionId,
} from "@/lib/configuracion-secciones";
import { habilidadesEnPalabras, memoriaEnPalabras, resumenDeGrupos, temperaturaEnPalabras } from "@/lib/configuracion-resumen";
import type { PoliticaDatos } from "@/lib/datos-cliente";
import type {
  BajasSettings,
  CatalogoConfig,
  MediaSettings,
  PluginSummary,
  SettingsResponse,
  WawebPolitica,
  WebChatSettings,
} from "@/lib/api/types";

type Advanced = {
  versions: { id: string; version: string; is_active: boolean; created_at: string | null }[];
  llm: { llm_provider: string; llm_model: string; has_api_key: boolean };
  guardrails_text: string;
  flow: { source: string; sections: { label: string; purpose: string | null; tools: string[] }[]; unknown_tools: string[] };
  eval_runs: { id: string; status: string; score: number | null; created_at: string | null }[];
  spec: Record<string, unknown>;
};

/** Sin la consulta de la sección: la URL vuelve al resumen. */
function urlSinSeccion(consulta: string): string {
  const parametros = new URLSearchParams(consulta);
  parametros.delete("seccion");
  parametros.delete("tab");
  const resto = parametros.toString();
  return resto ? `?${resto}` : window.location.pathname;
}

/**
 * Configuración como resumen (rediseño B): cada ajuste en una fila con su valor actual («Lun a vie, 9:00 a. m.
 * a 6:00 p. m.», «Cercano · emojis: pocos»), agrupados por tarea; tocar uno lo abre en un cajón para cambiarlo.
 * Habilidades y Mensajes fallidos son filas más (CFG-11). La sección abierta vive en la URL (`?seccion=`;
 * `?tab=` y sus alias siguen valiendo) y cerrar el cajón con cambios sin guardar pide confirmación.
 */
export function SettingsTabs({
  defaultTab,
  defaultSeccion,
  settings,
  webChat,
  advanced,
  media,
  catalogo,
  bajas,
  waweb,
  datosCliente,
  puedeEditar = true,
  esMaster = false,
  habilidades = null,
  fallidos = null,
}: {
  /** `?tab=` de la URL (id de la antigua pantalla o alias del panel clásico). */
  defaultTab?: string;
  /** `?seccion=` de la URL; gana a `defaultTab`. */
  defaultSeccion?: string;
  settings: SettingsResponse;
  webChat: WebChatSettings;
  advanced: Advanced;
  media: MediaSettings;
  catalogo: CatalogoConfig | null;
  bajas: BajasSettings | null;
  waweb: WawebPolitica | null;
  /** Política de datos del cliente (HU-CRM-13): `politica` null = no se pudo cargar (`error`). */
  datosCliente: {
    politica: PoliticaDatos | null;
    error?: string;
    puedeEditar: boolean;
    aviso: AvisoDatos | null;
    avisoError?: string;
  };
  /** Quien solo puede ver recibe los formularios sin botones de guardado. */
  puedeEditar?: boolean;
  /** AgentSpec y proveedor es del equipo técnico: solo lo ve el master (CFG-04). */
  esMaster?: boolean;
  /** Habilidades del negocio, para su fila; `null` = no se pudieron leer (la fila no se muestra). */
  habilidades?: PluginSummary[] | null;
  /** Mensajes fallidos por reintentar; `null` = sin permiso o no se pudo leer. */
  fallidos?: number | null;
}) {
  const confirm = useConfirm();
  const registro = useRegistroDeCambios();
  const visibles = seccionesVisibles({ waweb: Boolean(waweb && catalogo), agentspec: esMaster });
  const disponibles = new Set(visibles.map((s) => s.id));
  const pedidaPorUrl = defaultSeccion || defaultTab ? resolverSeccion({ seccion: defaultSeccion, tab: defaultTab }, disponibles) : null;
  const [abierta, setAbierta] = useState<SeccionId | null>(pedidaPorUrl);
  // Si la página se vuelve a pedir con otra sección (un enlace a ?seccion=… estando aquí), se sigue la URL.
  const [pedidaAntes, setPedidaAntes] = useState(pedidaPorUrl);
  if (pedidaPorUrl !== pedidaAntes) {
    setPedidaAntes(pedidaPorUrl);
    setAbierta(pedidaPorUrl);
  }

  function abrir(id: SeccionId) {
    setAbierta(id);
    // Sin `router`: solo se reescribe la URL (compartible y sobrevive a recargar) sin volver a pedir los datos.
    window.history.replaceState(null, "", consultaConSeccion(window.location.search, id));
  }

  function cerrarSinPreguntar() {
    setAbierta(null);
    window.history.replaceState(null, "", urlSinSeccion(window.location.search));
  }

  async function cerrar() {
    if (abierta && registro.hayCambios()) {
      const salir = await confirm({
        title: "Tienes cambios sin guardar",
        description: `Si cierras «${seccionPorId(abierta).titulo}», se pierde lo que cambiaste.`,
        confirmLabel: "Descartar cambios",
        cancelLabel: "Seguir editando",
        destructive: true,
      });
      if (!salir) return;
    }
    cerrarSinPreguntar();
  }

  /** El valor actual de cada ajuste, en palabras. */
  function resumen(id: SeccionId): string {
    const seccion = seccionPorId(id);
    const identidad = settings.identity as unknown as Record<string, unknown>;
    if (seccion.gruposIdentidad) return resumenDeGrupos(catalogo, seccion.gruposIdentidad, identidad) || seccion.descripcion;
    switch (id) {
      case "datos-cliente": {
        const acciones = datosCliente.politica?.acciones.length ?? 0;
        const aviso = datosCliente.aviso?.activo ? "aviso de datos activo" : "aviso de datos apagado";
        return datosCliente.politica ? `${acciones === 1 ? "1 acción pide" : `${acciones} acciones piden`} datos · ${aviso}` : seccion.descripcion;
      }
      case "memoria":
        return memoriaEnPalabras(settings.memory);
      case "cerebro":
        return `${settings.brain.model_primary} · respuestas ${temperaturaEnPalabras(settings.brain.model_temperature).toLowerCase()}`;
      case "herramientas": {
        const total = settings.skills.length;
        if (total === 0) return "Ninguna: llegan con las habilidades";
        const encendidas = settings.skills.filter((s) => s.enabled).length;
        return `${encendidas} de ${total} encendidas`;
      }
      case "chat-web": {
        const sitios = webChat.allowed_origins.length;
        return webChat.enabled ? `Activo en ${sitios === 1 ? "1 sitio" : `${sitios} sitios`}` : "Apagado";
      }
      case "multimedia":
        return [media.audio.enabled ? "Transcribe notas de voz" : "No escucha notas de voz", media.vision.enabled ? "mira imágenes" : "no mira imágenes"].join(" · ");
      case "whatsapp-web":
        return "Política del equipo de SolversHub";
      case "agentspec": {
        const activa = advanced.versions.find((v) => v.is_active);
        return activa ? `Versión ${activa.version} activa` : "Sin versión activa";
      }
      case "accesibilidad":
        return "Atajos de teclado, solo en este navegador";
      default:
        return seccion.descripcion;
    }
  }

  const grupos = GRUPOS_MENU.map((g) => ({ ...g, secciones: visibles.filter((s) => s.grupo === g.id) })).filter((g) => g.secciones.length > 0);
  const actual = abierta ? seccionPorId(abierta) : null;
  const esIdentidad = abierta !== null && SECCIONES_DE_IDENTIDAD.includes(abierta);
  const fila = "flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";

  return (
    <CambiosSinGuardarProvider registro={registro}>
      <div className="flex max-w-4xl flex-col gap-6">
        {grupos.map((g) => (
          <section key={g.id} aria-labelledby={`grupo-${g.id}`} className="flex flex-col gap-2">
            <h2 id={`grupo-${g.id}`} className="px-1 text-xs font-medium tracking-[0.06em] text-text-soft uppercase">
              {g.titulo}
            </h2>
            {g.nota && <p className="px-1 text-xs text-text-soft">{g.nota}</p>}
            <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface">
              {g.secciones.map((s) => (
                <li key={s.id} className="border-b border-border-soft last:border-b-0">
                  <button type="button" onClick={() => abrir(s.id)} className={fila} aria-haspopup="dialog">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                      <span className="shrink-0 text-sm font-medium text-headline sm:w-48">{s.titulo}</span>
                      <span className="min-w-0 text-sm text-body max-sm:text-xs max-sm:text-text-soft">{resumen(s.id)}</span>
                    </span>
                    <ChevronRight aria-hidden className="ml-auto h-4 w-4 shrink-0 text-text-soft" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {(habilidades !== null || fallidos !== null) && (
          <section aria-labelledby="grupo-habilidades" className="flex flex-col gap-2">
            <h2 id="grupo-habilidades" className="px-1 text-xs font-medium tracking-[0.06em] text-text-soft uppercase">
              Habilidades
            </h2>
            <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface">
              {habilidades !== null && (
                <li className="border-b border-border-soft last:border-b-0">
                  <Link href="/habilidades" className={fila}>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                      <span className="shrink-0 text-sm font-medium text-headline sm:w-48">Habilidades</span>
                      <span className="min-w-0 text-sm text-body max-sm:text-xs max-sm:text-text-soft">{habilidadesEnPalabras(habilidades)}</span>
                    </span>
                    <ChevronRight aria-hidden className="ml-auto h-4 w-4 shrink-0 text-text-soft" />
                  </Link>
                </li>
              )}
              {fallidos !== null && (
                <li className="border-b border-border-soft last:border-b-0">
                  <Link href="/dlq" className={fila}>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                      <span className="shrink-0 text-sm font-medium text-headline sm:w-48">Mensajes fallidos</span>
                      <span className="min-w-0 text-sm text-body max-sm:text-xs max-sm:text-text-soft">
                        {fallidos === 0 ? "Todo llegó" : fallidos === 1 ? "1 por reintentar" : `${fallidos} por reintentar`}
                      </span>
                    </span>
                    {fallidos > 0 && <Badge variant="warning">{fallidos}</Badge>}
                    <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-text-soft" />
                  </Link>
                </li>
              )}
            </ul>
          </section>
        )}
      </div>

      <Sheet open={abierta !== null} onOpenChange={(o) => !o && void cerrar()}>
        {actual && (
          <SheetContent title={actual.titulo} description={actual.descripcion} className="sm:max-w-2xl">
            <div className="flex flex-col gap-6">
              {actual.grupo === "avanzado" && actual.id !== "accesibilidad" && (
                <p role="note" className="text-xs text-text-soft">
                  Normalmente no necesitas tocar esto: los valores por defecto funcionan para la mayoría de los negocios.
                </p>
              )}
              {/* Las secciones de identidad comparten el formulario: sigue montado al pasar de una a otra. */}
              {esIdentidad && abierta && (
                <IdentityForm
                  identity={settings.identity}
                  catalogo={catalogo}
                  seccion={abierta}
                  puedeEditar={puedeEditar}
                  irASeccion={abrir}
                  onGuardado={cerrarSinPreguntar}
                />
              )}
              {abierta === "identidad" && bajas && <BajasCard bajas={bajas} catalogo={catalogo} puedeEditar={puedeEditar} />}
              {abierta === "whatsapp-web" && waweb && catalogo && <WawebCard politica={waweb} catalogo={catalogo} />}
              {abierta === "cerebro" && <BrainForm brain={settings.brain} catalogo={catalogo} puedeEditar={puedeEditar} onGuardado={cerrarSinPreguntar} />}
              {abierta === "memoria" && <MemoryForm memory={settings.memory} catalogo={catalogo} puedeEditar={puedeEditar} onGuardado={cerrarSinPreguntar} />}
              {abierta === "herramientas" && <SkillsForm skills={settings.skills} puedeEditar={puedeEditar} onGuardado={cerrarSinPreguntar} />}
              {abierta === "datos-cliente" && (
                <>
                  <DatosClienteCard politica={datosCliente.politica} error={datosCliente.error} puedeEditar={datosCliente.puedeEditar} />
                  <AvisoDatosCard aviso={datosCliente.aviso} error={datosCliente.avisoError} puedeEditar={datosCliente.puedeEditar} />
                </>
              )}
              {abierta === "chat-web" && <WebChatForm webChat={webChat} catalogo={catalogo} puedeEditar={puedeEditar} />}
              {abierta === "multimedia" && <MultimediaForm media={media} catalogo={catalogo} puedeEditar={puedeEditar} />}
              {abierta === "agentspec" && <AdvancedPanel advanced={advanced} puedeEditar={puedeEditar} />}
              {abierta === "accesibilidad" && <AccesibilidadPanel />}
            </div>
          </SheetContent>
        )}
      </Sheet>
    </CambiosSinGuardarProvider>
  );
}
