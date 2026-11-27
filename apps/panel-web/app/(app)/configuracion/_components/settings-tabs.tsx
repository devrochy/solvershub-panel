"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { AccesibilidadPanel } from "@/app/(app)/configuracion/_components/accesibilidad-panel";
import { AdvancedPanel, type Advanced } from "@/app/(app)/configuracion/_components/advanced-panel";
import { BajasCard } from "@/app/(app)/configuracion/_components/bajas-card";
import { AvisoDatosCard } from "@/app/(app)/configuracion/_components/aviso-datos-card";
import { BrainForm } from "@/app/(app)/configuracion/_components/brain-form";
import { IdentityForm } from "@/app/(app)/configuracion/_components/identity-form";
import { MemoryForm } from "@/app/(app)/configuracion/_components/memory-form";
import { MultimediaForm } from "@/app/(app)/configuracion/_components/multimedia-form";
import { WebChatForm } from "@/app/(app)/configuracion/_components/web-chat-form";
import { WawebCard } from "@/app/(app)/configuracion/_components/waweb-card";
import { SubscriptionProviderCard } from "@/app/(app)/configuracion/_components/subscription-provider-card";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { AvisoDatos } from "@/lib/aviso-datos";
import { CambiosSinGuardarProvider, useRegistroDeCambios } from "@/lib/cambios-sin-guardar";
import {
  consultaConSeccion,
  esSeccionDeIdentidad,
  GRUPOS_MENU,
  resolverSeccion,
  SECCIONES,
  seccionesVisibles,
  seccionPorId,
  SECCIONES_DE_IDENTIDAD,
  type SeccionId,
} from "@/lib/configuracion-secciones";
import { cerebroEnPalabras, habilidadesEnPalabras, memoriaEnPalabras, resumenDeGrupos } from "@/lib/configuracion-resumen";
import type {
  BajasSettings,
  CatalogoConfig,
  MediaSettings,
  PluginSummary,
  SettingsResponse,
  SubscriptionProviderSettings,
  WawebPolitica,
  WebChatSettings,
} from "@/lib/api/types";

/** Sin la consulta de la sección: la URL vuelve al resumen. */
function urlSinSeccion(consulta: string): string {
  const parametros = new URLSearchParams(consulta);
  parametros.delete("seccion");
  parametros.delete("tab");
  const resto = parametros.toString();
  return resto ? `?${resto}` : window.location.pathname;
}

/** Los formularios que no son secciones del menú también pueden tener cambios. */
const TITULOS_EXTRA: Record<string, string> = {
  bajas: "Bajas",
  "aviso-datos": "Aviso de datos",
  waweb: "WhatsApp Web",
};

function tituloDeRegistro(id: string): string {
  const seccion = SECCIONES.find((s) => s.id === id);
  return seccion?.titulo ?? TITULOS_EXTRA[id] ?? id;
}

function nombrarTitulos(titulos: string[]): string {
  const entrecomillados = titulos.map((titulo) => `«${titulo}»`);
  if (entrecomillados.length === 1) return entrecomillados[0];
  if (entrecomillados.length === 2) return `${entrecomillados[0]} y ${entrecomillados[1]}`;
  return `${entrecomillados.slice(0, -1).join(", ")} y ${entrecomillados[entrecomillados.length - 1]}`;
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
  proveedorSuscripciones = null,
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
  /** Aviso de tratamiento de datos del negocio (HU-CRM-16); la matriz vive en cada agente (HU-CRM-28). */
  datosCliente: {
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
  /** Quién cobra los planes recurrentes; `null` = el negocio no vende suscripciones. */
  proveedorSuscripciones?: SubscriptionProviderSettings | null;
}) {
  const confirm = useConfirm();
  const registro = useRegistroDeCambios();
  // Lo último guardado del formulario de identidad: el resumen se actualiza al guardar, sin recargar.
  const [identidad, setIdentidad] = useState(settings.identity);
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

  function abrirDirecto(id: SeccionId) {
    setAbierta(id);
    // Sin `router`: solo se reescribe la URL (compartible y sobrevive a recargar) sin volver a pedir los datos.
    window.history.replaceState(null, "", consultaConSeccion(window.location.search, id));
  }

  /**
   * Cambiar de sección desmonta el formulario. Las cuatro secciones de identidad comparten uno solo,
   * así que entre ellas no se pierde nada; hacia otra sección se pregunta, nombrando lo que se pierde.
   * `forzar` lo usa el salto a un error: la persona ya sabe que hay algo que corregir y conserva lo escrito.
   */
  async function abrir(id: SeccionId, opciones: { forzar?: boolean } = {}) {
    if (id === abierta) return;
    const comparteFormulario = abierta !== null && esSeccionDeIdentidad(abierta) && esSeccionDeIdentidad(id);
    if (!opciones.forzar && abierta !== null && !comparteFormulario && registro.hayCambios()) {
      const titulos = registro.cambios().map(tituloDeRegistro);
      const salir = await confirm({
        title: "Tienes cambios sin guardar",
        description: titulos.length
          ? `Si cambias de sección, se pierde lo que cambiaste en ${nombrarTitulos(titulos)}.`
          : `Si cambias de sección, se pierde lo que cambiaste en «${seccionPorId(abierta).titulo}».`,
        confirmLabel: "Descartar cambios",
        cancelLabel: "Seguir editando",
        destructive: true,
      });
      if (!salir) return;
    }
    abrirDirecto(id);
  }

  function cerrarSinPreguntar() {
    setAbierta(null);
    window.history.replaceState(null, "", urlSinSeccion(window.location.search));
  }

  async function cerrar() {
    if (abierta && registro.hayCambios()) {
      const cambios = registro.cambios();
      const titulos = cambios.map(tituloDeRegistro);
      const soloActual = titulos.length === 1 && cambios[0] === abierta;
      const salir = await confirm({
        title: "Tienes cambios sin guardar",
        // Cuando el único formulario sucio es el que se cierra, el aviso de siempre; si el guardado
        // conjunto alcanzó otras secciones, se nombran para que nadie se lleve una sorpresa.
        description: soloActual
          ? `Si cierras «${seccionPorId(abierta).titulo}», se pierde lo que cambiaste.`
          : titulos.length
            ? `Si cierras «${seccionPorId(abierta).titulo}», se pierde lo que cambiaste en ${nombrarTitulos(titulos)}.`
            : `Si cierras «${seccionPorId(abierta).titulo}», se pierde lo que cambiaste.`,
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
    const valoresIdentidad = identidad as unknown as Record<string, unknown>;
    if (seccion.gruposIdentidad) {
      // La fila de Identidad se lee con lo que importa: nombre + moneda; el estado va en su badge.
      if (id === "identidad") {
        const nombre = identidad.assistant_name.trim() || "Sin nombre";
        return `${nombre} · ${identidad.currency}`;
      }
      return resumenDeGrupos(catalogo, seccion.gruposIdentidad, valoresIdentidad) || seccion.descripcion;
    }
    switch (id) {
      case "datos-cliente":
        return datosCliente.aviso?.activo ? "aviso de datos activo" : "aviso de datos apagado";
      case "memoria":
        return memoriaEnPalabras(settings.memory);
      case "cerebro":
        return cerebroEnPalabras(settings.brain, esMaster);
      case "chat-web": {
        const sitios = webChat.allowed_origins.length;
        return webChat.enabled ? `Activo en ${sitios === 1 ? "1 sitio" : `${sitios} sitios`}` : "Apagado";
      }
      case "multimedia":
        return [media.audio.enabled ? "Transcribe notas de voz" : "No escucha notas de voz", media.vision.enabled ? "mira imágenes" : "no mira imágenes"].join(" · ");
      case "whatsapp-web":
        return "Política del equipo de SolversHub";
      case "agentspec": {
        const { llm_provider, llm_model, has_api_key } = advanced.llm;
        if (!llm_provider) return "IA de SolversHub";
        return [llm_provider, llm_model].filter(Boolean).join(" · ") + (has_api_key ? " · llave propia" : "");
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
                  <button type="button" onClick={() => void abrir(s.id)} className={fila} aria-haspopup="dialog">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                      <span className="shrink-0 text-sm font-medium text-headline sm:w-48">{s.titulo}</span>
                      <span className="min-w-0 text-sm text-body max-sm:text-xs max-sm:text-text-soft">{resumen(s.id)}</span>
                    </span>
                    {s.id === "identidad" && identidad.bot_paused && <Badge variant="warning">Pausado</Badge>}
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
            {proveedorSuscripciones && <SubscriptionProviderCard settings={proveedorSuscripciones} />}
            <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface">
              {habilidades !== null && (
                <li className="border-b border-border-soft last:border-b-0">
                  <Link href="/agentes" className={fila}>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                      <span className="shrink-0 text-sm font-medium text-headline sm:w-48">Habilidades</span>
                      <span className="min-w-0 text-sm text-body max-sm:text-xs max-sm:text-text-soft">{habilidadesEnPalabras(habilidades)}</span>
                    </span>
                    <ChevronRight aria-hidden className="ml-auto h-4 w-4 shrink-0 text-text-soft" />
                  </Link>
                </li>
              )}
              <li className="border-b border-border-soft last:border-b-0">
                <Link href="/habilidades/captar-leads" className={fila}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                    <span className="shrink-0 text-sm font-medium text-headline sm:w-48">Captar leads</span>
                    <span className="min-w-0 text-sm text-body max-sm:text-xs max-sm:text-text-soft">El formulario de tu página y los avisos de seguimiento</span>
                  </span>
                  <ChevronRight aria-hidden className="ml-auto h-4 w-4 shrink-0 text-text-soft" />
                </Link>
              </li>
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
                  identity={identidad}
                  catalogo={catalogo}
                  seccion={abierta}
                  puedeEditar={puedeEditar}
                  irASeccion={(id) => void abrir(id, { forzar: true })}
                  onGuardado={(nueva) => {
                    setIdentidad(nueva);
                    cerrarSinPreguntar();
                  }}
                />
              )}
              {abierta === "identidad" && bajas && <BajasCard bajas={bajas} catalogo={catalogo} puedeEditar={puedeEditar} />}
              {abierta === "whatsapp-web" && waweb && catalogo && <WawebCard politica={waweb} catalogo={catalogo} />}
              {abierta === "cerebro" && <BrainForm brain={settings.brain} catalogo={catalogo} puedeEditar={puedeEditar} verModelos={esMaster} onGuardado={cerrarSinPreguntar} />}
              {abierta === "memoria" && <MemoryForm memory={settings.memory} catalogo={catalogo} puedeEditar={puedeEditar} onGuardado={cerrarSinPreguntar} />}
              {abierta === "datos-cliente" && (
                <>
                  <p className="text-sm text-text-soft">
                    Qué datos pide cada agente en sus operaciones se ajusta en el editor de ese agente, en el paso
                    «Datos del cliente».
                  </p>
                  <AvisoDatosCard aviso={datosCliente.aviso} error={datosCliente.avisoError} puedeEditar={datosCliente.puedeEditar} />
                </>
              )}
              {abierta === "chat-web" && <WebChatForm webChat={webChat} catalogo={catalogo} puedeEditar={puedeEditar} />}
              {abierta === "multimedia" && <MultimediaForm media={media} puedeEditar={puedeEditar} />}
              {abierta === "agentspec" && <AdvancedPanel advanced={advanced} puedeEditar={puedeEditar} />}
              {abierta === "accesibilidad" && <AccesibilidadPanel />}
            </div>
          </SheetContent>
        )}
      </Sheet>
    </CambiosSinGuardarProvider>
  );
}
