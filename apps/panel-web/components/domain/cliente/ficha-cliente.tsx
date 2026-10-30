"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CampoTelefono } from "@/components/ui/campo-telefono";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import type {
  LeadAgentData,
  LeadCampoPerfil,
  LeadDetail,
  LeadEditable,
  LeadFact,
  LeadGeocodificacionInversa,
  LeadPerfil,
} from "@/lib/api/types";
import {
  columnasDeSoloLectura,
  datosFueraDelPerfil,
  esClaveDelPerfil,
  etiquetaClasificacion,
  etiquetaDeDato,
  etiquetaTipoDocumento,
  normalizarClave,
  origenDelDato,
  textoDeDato,
} from "@/lib/clientes";
import { formatCellValue, formatDate } from "@/lib/format";
import { canalLabel } from "@/lib/labels";
import { indicativoNumerico, PAISES, parsearTelefono } from "@/lib/paises";
import { campoVisible, placeholderDe, validarPerfilCliente } from "@/lib/perfil-cliente";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

import { AgenteSwitch } from "./agente-switch";
import { AvatarCliente } from "./avatar-cliente";
import { MapaDireccion } from "./mapa-direccion";
import { ConsentimientoDelCliente } from "./consentimiento";
import { ConsentimientoDatosDelCliente } from "./consentimiento-datos";
import { HistoriaDelCliente, NotasDelCliente } from "./notas-y-historia";

const TITULO_DEL_PACK: Record<string, string> = {
  pack_commerce: "Lead de venta",
  pack_cobranza: "Datos de cobranza",
};

const ENLACE_DEL_AGENTE: Record<string, string> = {
  ventas: "/comercio/pedidos",
  cobranza: "/cobranza/clientes",
  agenda: "/calendario",
};

const GRUPOS: Record<string, string> = {
  identidad: "Identidad",
  contacto: "Contacto",
  ubicacion: "Ubicación",
  clasificacion: "Clasificación",
};

type SeccionPerfil = "general" | "ubicacion" | "preferencias";

const GRUPOS_POR_SECCION: Record<SeccionPerfil, string[]> = {
  general: ["identidad", "contacto"],
  ubicacion: ["ubicacion"],
  preferencias: ["clasificacion"],
};

const TONO_CLASIFICACION: Record<string, "neutral" | "info" | "accent" | "success" | "warning" | "danger"> = {
  nuevo: "info",
  prospecto: "neutral",
  cliente: "success",
  vip: "accent",
  inactivo: "warning",
  bloqueado: "danger",
};

/**
 * Ficha lateral del cliente (HU-UX-16 + tanda 1A): datos base, lo que cada agente sabe de él
 * y la corrección de datos. Las pestañas son dinámicas: General + los agentes del negocio.
 */
export function FichaCliente({
  detalle,
  closeHref,
  agenteInicial,
  editarInicial = false,
  hrefBase,
}: {
  detalle: LeadDetail;
  closeHref: string;
  agenteInicial?: string;
  editarInicial?: boolean;
  /** URL de `/leads` con los filtros actuales, sin `cliente`/`agente`/`editar`. */
  hrefBase: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(editarInicial);
  const [versionHistoria, setVersionHistoria] = useState(0);
  const tabs = useMemo(
    () => [
      { id: "general", label: "General" },
      { id: "ubicacion", label: "Ubicación" },
      { id: "preferencias", label: "Preferencias" },
      // HU-CRM-12: sin pestaña para un agente que no tiene columnas ni campos editables de este cliente.
      ...detalle.agentes
        .filter((agente) => agente.columns.length > 0 || agente.editables.length > 0)
        .map((agente) => ({ id: agente.key, label: agente.name })),
    ],
    [detalle.agentes],
  );
  const inicial = agenteInicial && tabs.some((t) => t.id === agenteInicial) ? agenteInicial : "general";
  const [tab, setTab] = useState(inicial);

  const agente = detalle.agentes.find((a) => a.key === tab);
  const otros = datosFueraDelPerfil(detalle.datos);

  function hrefAgente(agenteKey: string): string {
    const url = new URL(hrefBase, "http://local");
    url.searchParams.set("cliente", detalle.id);
    if (agenteKey && agenteKey !== "general") url.searchParams.set("agente", agenteKey);
    else url.searchParams.delete("agente");
    url.searchParams.delete("editar");
    return `${url.pathname}${url.search}`;
  }

  function cambiarTab(id: string) {
    setTab(id);
    setEditando(false);
  }

  const alGuardar = () => {
    setEditando(false);
    router.replace(hrefAgente(tab), { scroll: false });
    router.refresh();
  };

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && router.push(closeHref, { scroll: false })}>
      <SheetContent
        title="Ficha del cliente"
        description={`${canalLabel(detalle.canal)} · ${detalle.identificador}`}
        className="sm:max-w-3xl"
        hero={
          <div className="space-y-3">
            <CabeceraCliente detalle={detalle} />
            <Tabs items={tabs} value={tab} onValueChange={cambiarTab} />
          </div>
        }
      >
        {tab === "general" ? (
          <div className="space-y-6">
            <section aria-labelledby="ficha-general" className="space-y-3">
              <h3 id="ficha-general" className="text-sm font-semibold text-headline">
                Información general
              </h3>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-text-soft">Agente</dt>
                <dd className="flex items-center gap-2">
                  <AgenteSwitch leadId={detalle.id} botPaused={detalle.bot_paused} nombre={detalle.cliente} />
                  <span className="text-body">
                    {detalle.bot_paused ? "Pausado para este cliente" : "Atiende"}
                  </span>
                </dd>
                <dt className="text-text-soft">Canal</dt>
                <dd className="text-body">{canalLabel(detalle.canal)}</dd>
                <dt className="text-text-soft">Conexiones</dt>
                <dd className="text-body">
                  {detalle.conexiones.length ? detalle.conexiones.map((c) => c.label).join(", ") : "—"}
                </dd>
                <dt className="text-text-soft">Cliente desde</dt>
                <dd className="text-body">{formatDate(detalle.alta)}</dd>
                <dt className="text-text-soft">Identificador</dt>
                <dd className="break-all text-body">{detalle.identificador}</dd>
              </dl>
              {detalle.ultima_conversacion_id && (
                <Link
                  href={`/conversaciones?c=${detalle.ultima_conversacion_id}`}
                  className="inline-block text-sm text-link hover:underline"
                >
                  Abrir su última conversación
                </Link>
              )}
            </section>

            <section aria-labelledby="ficha-perfil" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="ficha-perfil" className="text-sm font-semibold text-headline">
                  Datos del cliente
                </h3>
                {!editando ? (
                  <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
                    Editar datos
                  </Button>
                ) : null}
              </div>
              {editando ? (
                <PerfilForm detalle={detalle} seccion="general" onListo={alGuardar} />
              ) : (
                <PerfilResumen perfil={detalle.perfil} seccion="general" onUbicar={() => setEditando(true)} />
              )}
            </section>

            {otros.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-text-soft">
                  Otros datos que guardó el agente ({otros.length})
                </summary>
                <div className="mt-3">
                  <ListaDeDatos datos={otros} conGrupo />
                </div>
              </details>
            )}

            {detalle.agentes.length === 0
              ? agruparPorPack(detalle.editables).map(([pluginId, campos]) => (
                  <EditablesDelPack key={pluginId} leadId={detalle.id} pluginId={pluginId} campos={campos} />
                ))
              : null}
          </div>
        ) : tab === "ubicacion" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-headline">Ubicación</h3>
              <div className="flex flex-wrap gap-2">
                <GeocodificarBoton
                  leadId={detalle.id}
                  tieneCoords={Boolean(detalle.perfil.latitud && detalle.perfil.longitud)}
                />
                {!editando ? (
                  <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
                    Editar ubicación
                  </Button>
                ) : null}
              </div>
            </div>
            {editando ? (
              <PerfilForm detalle={detalle} seccion="ubicacion" onListo={alGuardar} />
            ) : (
              <PerfilResumen perfil={detalle.perfil} seccion="ubicacion" onUbicar={() => setEditando(true)} />
            )}
          </div>
        ) : tab === "preferencias" ? (
          <div className="space-y-6">
            <section aria-labelledby="ficha-preferencias" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="ficha-preferencias" className="text-sm font-semibold text-headline">
                  Preferencias
                </h3>
                {!editando ? (
                  <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
                    Editar clasificación
                  </Button>
                ) : null}
              </div>
              {editando ? (
                <PerfilForm detalle={detalle} seccion="preferencias" onListo={alGuardar} />
              ) : (
                <PerfilResumen perfil={detalle.perfil} seccion="preferencias" onUbicar={() => setEditando(true)} />
              )}
            </section>

            {detalle.canal === "whatsapp" && <ConsentimientoDelCliente leadId={detalle.id} />}
            <ConsentimientoDatosDelCliente leadId={detalle.id} />
            <NotasDelCliente leadId={detalle.id} onCambio={() => setVersionHistoria((v) => v + 1)} />
            <HistoriaDelCliente key={versionHistoria} leadId={detalle.id} />
          </div>
        ) : agente ? (
          <AgenteTab leadId={detalle.id} agente={agente} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CabeceraCliente({ detalle }: { detalle: LeadDetail }) {
  const perfil = detalle.perfil;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <AvatarCliente leadId={detalle.id} nombre={perfil.nombre_visible} avatarUrl={perfil.avatar_url} />
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold tracking-tight text-headline">
          {perfil.nombre_visible}
        </h2>
        {perfil.alias && perfil.alias !== perfil.nombre_visible ? (
          <p className="text-sm text-text-soft">Alias: {perfil.alias}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant={TONO_CLASIFICACION[perfil.clasificacion ?? ""] ?? "neutral"}>
            {etiquetaClasificacion(perfil.clasificacion, perfil.clasificacion_label)}
          </Badge>
          <span className="text-xs text-text-soft">
            {canalLabel(detalle.canal)} · {detalle.identificador}
          </span>
        </div>
      </div>
    </div>
  );
}

function PerfilResumen({
  perfil,
  seccion,
  onUbicar,
}: {
  perfil: LeadPerfil;
  seccion: SeccionPerfil;
  onUbicar: () => void;
}) {
  const telefono = perfil.phone_e164 || perfil.phone;
  const pais = PAISES.find((p) => p.codigo === parsearTelefono(telefono).indicativo);
  const tieneCoords = typeof perfil.latitud === "number" && typeof perfil.longitud === "number";
  return (
    <div className="space-y-5">
      {seccion === "general" ? (
        <>
          <section aria-labelledby="perfil-identidad" className="space-y-2">
            <h3 id="perfil-identidad" className="text-sm font-semibold text-headline">Identidad</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              <CampoPar etiqueta="Nombre" valor={perfil.name} />
              <CampoPar etiqueta="Apellido" valor={perfil.apellido} />
              <CampoPar etiqueta="Alias" valor={perfil.alias} />
              <CampoPar
                etiqueta="Tipo de documento"
                valor={perfil.tipo_documento ? etiquetaTipoDocumento(perfil.tipo_documento) : null}
              />
              <CampoPar etiqueta="Número de documento" valor={perfil.id_document} />
            </dl>
          </section>

          <section aria-labelledby="perfil-contacto" className="space-y-2">
            <h3 id="perfil-contacto" className="text-sm font-semibold text-headline">Contacto</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              <CampoPar
                etiqueta="Teléfono"
                valor={telefono ? `${pais?.bandera ?? ""} ${telefono}`.trim() : null}
              />
              <CampoPar etiqueta="Correo" valor={perfil.email} />
            </dl>
          </section>
        </>
      ) : null}

      {seccion === "ubicacion" ? (
        <section aria-labelledby="perfil-ubicacion" className="space-y-3">
          <h3 id="perfil-ubicacion" className="text-sm font-semibold text-headline">Ubicación</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <CampoPar etiqueta="Dirección" valor={perfil.address} className="sm:col-span-2" />
            <CampoPar etiqueta="Municipio" valor={perfil.municipio} />
            <CampoPar etiqueta="Departamento" valor={perfil.departamento} />
            <CampoPar etiqueta="País" valor={perfil.pais} />
            <CampoPar etiqueta="Dirección normalizada" valor={perfil.direccion_normalizada} />
          </dl>
          {tieneCoords ? (
            <MapaDireccion
              latitud={perfil.latitud}
              longitud={perfil.longitud}
              nombre={perfil.nombre_visible}
              soloLectura
            />
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-md border border-border-soft bg-surface-2 p-4 text-sm text-text-soft">
              <p>Todavía no hay una ubicación en el mapa.</p>
              <Button size="sm" variant="outline" onClick={onUbicar}>
                Ubicar en el mapa
              </Button>
            </div>
          )}
          {perfil.mapa_url ? (
            <a
              href={perfil.mapa_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-link hover:underline"
            >
              Abrir en el mapa
            </a>
          ) : null}
        </section>
      ) : null}

      {seccion === "preferencias" ? (
        <section aria-labelledby="perfil-clasificacion" className="space-y-2">
          <h3 id="perfil-clasificacion" className="text-sm font-semibold text-headline">Clasificación</h3>
          <Badge variant={TONO_CLASIFICACION[perfil.clasificacion ?? ""] ?? "neutral"}>
            {etiquetaClasificacion(perfil.clasificacion, perfil.clasificacion_label)}
          </Badge>
        </section>
      ) : null}
    </div>
  );
}

function CampoPar({
  etiqueta,
  valor,
  className,
}: {
  etiqueta: string;
  valor?: string | null;
  className?: string;
}) {
  const texto = valor?.trim() ? valor : "Sin dato";
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-text-soft">{etiqueta}</dt>
      <dd className={cn("break-words text-sm", valor?.trim() ? "text-body" : "text-text-soft")}>{texto}</dd>
    </div>
  );
}

function AgenteTab({ leadId, agente }: { leadId: string; agente: LeadAgentData }) {
  const soloLectura = columnasDeSoloLectura(agente.columns, agente.editables);
  const porPack = agruparPorPack(agente.editables);

  if (agente.columns.length === 0 && agente.editables.length === 0) {
    return (
      <EmptyState
        title={`${agente.name} todavía no tiene datos de este cliente`}
        description="Cuando el agente atienda a este cliente en su área, sus datos aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-6">
      {ENLACE_DEL_AGENTE[agente.key] && (
        <div className="flex justify-end">
          <Button asChild size="sm" variant="outline">
            {agente.key === "ventas" ? (
              // HU-CRM-20: los pedidos de ESTE cliente, no la lista general.
              <Link href={`${ENLACE_DEL_AGENTE.ventas}?cliente=${encodeURIComponent(leadId)}`}>Ver sus pedidos</Link>
            ) : (
              <Link href={ENLACE_DEL_AGENTE[agente.key]}>Abrir en {agente.name}</Link>
            )}
          </Button>
        </div>
      )}
      {soloLectura.length > 0 && (
        <section aria-labelledby={`agente-${agente.key}`} className="space-y-3">
          <h3 id={`agente-${agente.key}`} className="text-sm font-semibold text-headline">
            Datos de {agente.name}
          </h3>
          <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 text-sm">
            {soloLectura.map((columna) => (
              <Fila key={columna.key} etiqueta={columna.label} valor={formatCellValue(columna.value)} />
            ))}
          </dl>
        </section>
      )}

      {porPack.map(([pluginId, campos]) => (
        <EditablesDelPack key={pluginId} leadId={leadId} pluginId={pluginId} campos={campos} />
      ))}
    </div>
  );
}

function agruparPorPack(editables: LeadEditable[]): [string, LeadEditable[]][] {
  const grupos = new Map<string, LeadEditable[]>();
  for (const e of editables) grupos.set(e.plugin_id, [...(grupos.get(e.plugin_id) ?? []), e]);
  return [...grupos.entries()];
}

/** Título de la sección de cada pack; uno sin título propio usa el genérico. */
function EditablesDelPack({
  leadId,
  pluginId,
  campos,
}: {
  leadId: string;
  pluginId: string;
  campos: LeadEditable[];
}) {
  const router = useRouter();
  const inicial = Object.fromEntries(campos.map((c) => [c.key, c.value ?? ""])) as Record<string, string>;
  const [valores, setValores] = useState(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const guardar = useAction();
  const cambios = Object.fromEntries(
    Object.entries(valores).filter(([k, v]) => v.trim() !== (inicial[k] ?? "").trim()),
  );
  const tituloId = `ficha-pack-${pluginId}`;

  async function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(cambios).length === 0) return;
    setErrores({});
    const ok = await guardar.run(async () => {
      const res = await fetch(`/api/leads/${leadId}/pack/${encodeURIComponent(pluginId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores: cambios }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (json.fields) setErrores(json.fields);
      return { ok: res.ok, status: res.status, error: json.error, success: "Cambios guardados." };
    });
    if (ok) router.refresh();
  }

  return (
    <section aria-labelledby={tituloId} className="space-y-3">
      <h3 id={tituloId} className="text-sm font-semibold text-headline">
        {TITULO_DEL_PACK[pluginId] ?? "Seguimiento"}
      </h3>
      <form onSubmit={(e) => void onGuardar(e)} className="space-y-3">
        {campos.map((c) => (
          <Field key={c.key} label={c.label} htmlFor={`pack-${pluginId}-${c.key}`} error={errores[c.key]}>
            {c.tipo === "opciones" ? (
              <Select
                id={`pack-${pluginId}-${c.key}`}
                value={valores[c.key] ?? ""}
                onChange={(e) => setValores((v) => ({ ...v, [c.key]: e.target.value }))}
              >
                {!inicial[c.key] && <option value="">Sin definir</option>}
                {(c.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id={`pack-${pluginId}-${c.key}`}
                value={valores[c.key] ?? ""}
                onChange={(e) => setValores((v) => ({ ...v, [c.key]: e.target.value }))}
                maxLength={c.max_length}
              />
            )}
          </Field>
        ))}
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={guardar.pending} disabled={Object.keys(cambios).length === 0}>
            Guardar
          </Button>
        </div>
      </form>
    </section>
  );
}

/** Pide al backend ubicar la dirección en el mapa (LocationIQ, HU-CRM-08). */
function GeocodificarBoton({ leadId, tieneCoords }: { leadId: string; tieneCoords: boolean }) {
  const router = useRouter();
  const accion = useAction();

  async function onClick() {
    const ok = await accion.run(async () => {
      const res = await fetch(`/api/leads/${leadId}/geocodificar`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      return {
        ok: res.ok,
        status: res.status,
        error: json.error,
        success: "Dirección ubicada en el mapa.",
      };
    });
    if (ok) router.refresh();
  }

  return (
    <Button size="sm" variant="outline" onClick={() => void onClick()} loading={accion.pending}>
      <MapPin className="h-3.5 w-3.5" aria-hidden />
      {tieneCoords ? "Recalcular ubicación" : "Geocodificar dirección"}
    </Button>
  );
}

/**
 * Formulario de la pestaña General. Solo envía lo que cambió; los datos canónicos van por
 * `/perfil` y los datos libres por `otros`, ambos con `source="human"` en el backend.
 */
function PerfilForm({
  detalle,
  seccion,
  onListo,
}: {
  detalle: LeadDetail;
  seccion: SeccionPerfil;
  onListo: () => void;
}) {
  const inicial = useMemo(() => valoresIniciales(detalle.perfil), [detalle.perfil]);
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [enviado, setEnviado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [otraClave, setOtraClave] = useState("");
  const [otroValor, setOtroValor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<LeadGeocodificacionInversa | null>(null);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [errorMapa, setErrorMapa] = useState<string | null>(null);
  const guardar = useAction();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const camposSeccion = useMemo(
    () =>
      detalle.campos_perfil.filter(
        (campo) =>
          GRUPOS_POR_SECCION[seccion].includes(campo.group) &&
          campo.key !== "avatar_url" &&
          campo.key !== "pais_telefono",
      ),
    [detalle.campos_perfil, seccion],
  );
  const visibles = useMemo(() => camposSeccion.filter(campoVisible), [camposSeccion]);
  const grupos = useMemo(() => {
    const porGrupo = new Map<string, LeadCampoPerfil[]>();
    for (const campo of visibles) {
      porGrupo.set(campo.group, [...(porGrupo.get(campo.group) ?? []), campo]);
    }
    return [...porGrupo.entries()];
  }, [visibles]);
  const errores = useMemo(
    () => validarPerfilCliente(camposSeccion, valores),
    [camposSeccion, valores],
  );
  const errorDe = (clave: string) =>
    erroresServidor[clave] ?? ((enviado || tocados[clave]) ? errores[clave] : undefined);

  function cambiar(clave: string, valor: string) {
    setValores((previos) => ({ ...previos, [clave]: valor }));
    setErroresServidor((previos) => {
      if (!(clave in previos)) return previos;
      const resto = { ...previos };
      delete resto[clave];
      return resto;
    });
  }

  const marcarTocado = (clave: string) => setTocados((previos) => ({ ...previos, [clave]: true }));
  const telefonoActual = parsearTelefono(valores.phone);
  const cambiarIndicativo = (codigo: string) => {
    cambiar("phone", `+${indicativoNumerico(codigo)} ${telefonoActual.numero}`.trim());
    marcarTocado("phone");
  };
  const cambiarNumero = (numero: string) => {
    cambiar("phone", `+${indicativoNumerico(telefonoActual.indicativo)} ${numero}`.trim());
    marcarTocado("phone");
  };

  const coordenadas = (() => {
    const latitud = valores.latitud?.trim() ?? "";
    const longitud = valores.longitud?.trim() ?? "";
    const lat = Number(latitud);
    const lng = Number(longitud);
    return latitud && longitud && Number.isFinite(lat) && Number.isFinite(lng)
      ? { latitud: lat, longitud: lng }
      : null;
  })();
  const centro = coordenadas ?? { latitud: 4.65, longitud: -74.1 };

  async function buscarDireccion(latitud: number, longitud: number) {
    setBuscandoDireccion(true);
    setErrorMapa(null);
    try {
      const res = await fetch(`/api/leads/${detalle.id}/geocodificar/reverso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitud, longitud }),
      });
      const json = (await res.json().catch(() => ({}))) as LeadGeocodificacionInversa & { error?: string };
      if (!res.ok) {
        setPropuesta(null);
        setErrorMapa(json.error ?? "No pudimos leer la dirección en ese punto.");
        return;
      }
      setPropuesta(json);
    } catch {
      setPropuesta(null);
      setErrorMapa("No pudimos leer la dirección en ese punto.");
    } finally {
      setBuscandoDireccion(false);
    }
  }

  function moverPin(latitud: number, longitud: number) {
    setValores((previos) => ({ ...previos, latitud: String(latitud), longitud: String(longitud) }));
    marcarTocado("latitud");
    marcarTocado("longitud");
    setErrorMapa(null);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void buscarDireccion(latitud, longitud), 600);
  }

  function usarPropuesta() {
    if (!propuesta) return;
    setValores((previos) => ({
      ...previos,
      ...(propuesta.direccion ? { address: propuesta.direccion } : {}),
      ...(propuesta.municipio ? { municipio: propuesta.municipio } : {}),
      ...(propuesta.departamento ? { departamento: propuesta.departamento } : {}),
      ...(propuesta.pais ? { pais: propuesta.pais } : {}),
    }));
    setPropuesta(null);
    setErrorMapa(null);
  }

  function quitarUbicacion() {
    setValores((previos) => ({ ...previos, latitud: "", longitud: "" }));
    setPropuesta(null);
    setErrorMapa(null);
  }

  async function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    const erroresActuales = validarPerfilCliente(camposSeccion, valores);
    if (Object.keys(erroresActuales).length > 0) {
      setEnviado(true);
      setError("Revisa los campos marcados antes de guardar.");
      return;
    }
    const cambios = Object.fromEntries(
      Object.entries(valores).filter(([k, v]) => v.trim() !== (inicial[k] ?? "").trim()),
    );
    const clave = normalizarClave(otraClave);
    if (otraClave.trim() && !clave) {
      setErroresServidor({ otro: "Escribe un nombre para el dato." });
      return;
    }
    if (clave && (esClaveCanonica(clave, detalle.campos_perfil) || esClaveDelPerfil(otraClave))) {
      setErroresServidor({ otro: "Ese dato ya se edita en los campos de arriba." });
      return;
    }
    const otros = clave && otroValor.trim() ? { [clave]: otroValor.trim() } : {};
    if (Object.keys(cambios).length === 0 && Object.keys(otros).length === 0) {
      onListo();
      return;
    }
    setErroresServidor({});
    setError(null);
    const tocaDireccion = ["address", "municipio", "departamento"].some((k) => k in cambios);
    const tocaCoordenadas = "latitud" in cambios || "longitud" in cambios;
    const ok = await guardar.run(async () => {
      const res = await fetch(`/api/leads/${detalle.id}/perfil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores: cambios, otros }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (json.fields) setErroresServidor(json.fields);
      if (!res.ok) {
        return { ok: false, status: res.status, error: json.error };
      }
      if (tocaDireccion && !tocaCoordenadas) {
        await fetch(`/api/leads/${detalle.id}/geocodificar`, { method: "POST" }).catch(() => undefined);
      }
      return { ok: true, status: res.status, success: "Datos guardados. El agente los usará desde ya." };
    });
    if (ok) onListo();
  }

  return (
    <form onSubmit={(e) => void onGuardar(e)} noValidate className="space-y-5">
      {grupos.map(([grupo, campos]) => (
        <fieldset key={grupo} className="space-y-3 rounded-md border border-border-soft p-3">
          <legend className="px-1 text-sm font-medium text-text-soft">{GRUPOS[grupo] ?? grupo}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {campos.map((campo) => {
              if (campo.key === "phone") {
                return (
                  <div key={campo.key} className="sm:col-span-2">
                    <CampoTelefono
                      id="perfil-phone"
                      label={campo.label}
                      help={campo.help ?? undefined}
                      required={campo.required}
                      indicativo={telefonoActual.indicativo}
                      numero={telefonoActual.numero}
                      onIndicativo={cambiarIndicativo}
                      onNumero={cambiarNumero}
                      error={errorDe("phone")}
                      onBlur={() => marcarTocado("phone")}
                      placeholder={placeholderDe(campo)}
                    />
                  </div>
                );
              }
              return (
                <Field
                  key={campo.key}
                  label={campo.label}
                  htmlFor={`perfil-${campo.key}`}
                  error={errorDe(campo.key)}
                  help={campo.help ?? undefined}
                  required={campo.required}
                  className={["address", "alias"].includes(campo.key) ? "sm:col-span-2" : undefined}
                >
                  {campo.tipo === "opciones" ? (
                    <Select
                      id={`perfil-${campo.key}`}
                      value={valores[campo.key] ?? ""}
                      onBlur={() => marcarTocado(campo.key)}
                      onChange={(e) => {
                        cambiar(campo.key, e.target.value);
                        marcarTocado(campo.key);
                      }}
                    >
                      {!campo.required && <option value="">Sin definir</option>}
                      {campo.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={`perfil-${campo.key}`}
                      type={tipoDeInput(campo)}
                      step={campo.tipo === "numero" ? "any" : undefined}
                      value={valores[campo.key] ?? ""}
                      placeholder={placeholderDe(campo)}
                      onBlur={() => marcarTocado(campo.key)}
                      onChange={(e) => cambiar(campo.key, e.target.value)}
                      maxLength={campo.tipo === "numero" ? undefined : campo.max_length}
                      required={campo.required}
                    />
                  )}
                </Field>
              );
            })}
            {grupo === "ubicacion" ? (
              <div className="space-y-3 sm:col-span-2">
                <p className="text-xs text-text-soft">Arrastra el pin o toca el mapa para ubicar al cliente.</p>
                <MapaDireccion
                  latitud={centro.latitud}
                  longitud={centro.longitud}
                  nombre={detalle.perfil.nombre_visible}
                  onCambio={moverPin}
                />
                {errorDe("latitud") ?? errorDe("longitud") ? (
                  <p role="alert" className="text-xs text-status-danger-fg">
                    {errorDe("latitud") ?? errorDe("longitud")}
                  </p>
                ) : null}
                {buscandoDireccion ? <p className="text-xs text-text-soft">Buscando la dirección del punto…</p> : null}
                {errorMapa ? (
                  <p role="alert" className="text-xs text-status-danger-fg">
                    {errorMapa}
                  </p>
                ) : null}
                {propuesta ? (
                  <div className="space-y-2 rounded-md border border-border-soft bg-surface-2 p-3 text-sm">
                    <p className="font-medium text-headline">Dirección propuesta</p>
                    <p className="text-body">{propuesta.direccion ?? "Sin dirección exacta"}</p>
                    <p className="text-text-soft">
                      {[propuesta.municipio, propuesta.departamento, propuesta.pais].filter(Boolean).join(", ") ||
                        "Sin más datos"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={usarPropuesta}>
                        Usar estos datos
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPropuesta(null)}>
                        Descartar
                      </Button>
                    </div>
                  </div>
                ) : null}
                {coordenadas ? (
                  <Button type="button" size="sm" variant="ghost" onClick={quitarUbicacion}>
                    Quitar ubicación
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </fieldset>
      ))}

      {seccion === "general" ? (
      <fieldset className="space-y-3 rounded-md border border-border-soft p-3">
        <legend className="px-1 text-sm text-text-soft">Agregar otro dato</legend>
        <Field label="Dato" htmlFor="perfil-otro-clave" help="Por ejemplo: Empresa, Preferencia de entrega" error={erroresServidor.otro}>
          <Input id="perfil-otro-clave" value={otraClave} onChange={(e) => setOtraClave(e.target.value)} maxLength={80} placeholder="Ej. Empresa" />
        </Field>
        <Field label="Valor" htmlFor="perfil-otro-valor">
          <Input id="perfil-otro-valor" value={otroValor} onChange={(e) => setOtroValor(e.target.value)} maxLength={500} placeholder="Ej. Distribuidora El Sol" />
        </Field>
      </fieldset>

      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-status-danger-fg">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onListo} disabled={guardar.pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={guardar.pending}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

function valoresIniciales(perfil: LeadPerfil): Record<string, string> {
  return {
    name: perfil.name ?? "",
    apellido: perfil.apellido ?? "",
    alias: perfil.alias ?? "",
    phone: perfil.phone_e164 ?? perfil.phone ?? "",
    pais_telefono: perfil.pais_telefono ?? "",
    email: perfil.email ?? "",
    tipo_documento: perfil.tipo_documento ?? "",
    id_document: perfil.id_document ?? "",
    address: perfil.address ?? "",
    municipio: perfil.municipio ?? "",
    departamento: perfil.departamento ?? "",
    pais: perfil.pais ?? "",
    latitud: perfil.latitud === null || perfil.latitud === undefined ? "" : String(perfil.latitud),
    longitud: perfil.longitud === null || perfil.longitud === undefined ? "" : String(perfil.longitud),
    clasificacion: perfil.clasificacion ?? "",
  };
}

function tipoDeInput(campo: LeadCampoPerfil): string {
  if (campo.tipo === "email") return "email";
  if (campo.tipo === "telefono") return "tel";
  if (campo.tipo === "url") return "url";
  if (campo.tipo === "numero") return "number";
  return "text";
}

function esClaveCanonica(clave: string, campos: LeadCampoPerfil[]): boolean {
  return campos.some((campo) => campo.key === clave);
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <>
      <dt className="text-text-soft">{etiqueta}</dt>
      <dd className="break-words text-body">{valor}</dd>
    </>
  );
}

function ListaDeDatos({ datos, conGrupo = false }: { datos: LeadFact[]; conGrupo?: boolean }) {
  return (
    <ul className="divide-y divide-border-soft rounded-md border border-border-soft">
      {datos.map((d) => (
        <li key={`${d.namespace}:${d.key}`} className="flex items-start justify-between gap-3 p-3 text-sm">
          <div className="min-w-0">
            <p className="text-text-soft">
              {etiquetaDeDato(d.key)}
              {conGrupo && <span className="ml-1 text-xs">({d.namespace})</span>}
            </p>
            <p className="break-words text-headline">{textoDeDato(d.value)}</p>
          </div>
          <div className="shrink-0 text-right">
            <Badge variant={d.source === "human" ? "accent" : "neutral"}>{origenDelDato(d.source)}</Badge>
            <p className="mt-1 text-xs text-text-soft">{formatDate(d.valid_from)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
