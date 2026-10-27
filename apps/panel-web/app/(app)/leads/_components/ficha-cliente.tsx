"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import type { LeadAgentData, LeadCampoPerfil, LeadDetail, LeadEditable, LeadFact, LeadPerfil } from "@/lib/api/types";
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
import { useAction } from "@/lib/use-action";

import { AgenteSwitch } from "./agente-switch";
import { ConsentimientoDelCliente } from "./consentimiento";
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

const TONO_CLASIFICACION: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
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
      ...detalle.agentes.map((agente) => ({ id: agente.key, label: agente.name })),
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
    if (id !== "general") setEditando(false);
  }

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && router.push(closeHref, { scroll: false })}>
      <SheetContent
        title={detalle.cliente}
        description={`${canalLabel(detalle.canal)} · ${detalle.identificador}`}
        className="sm:max-w-2xl"
      >
        <Tabs items={tabs} value={tab} onValueChange={cambiarTab} className="mb-5" />

        {tab === "general" ? (
          editando ? (
            <PerfilForm
              detalle={detalle}
              onListo={() => {
                setEditando(false);
                router.replace(hrefAgente("general"), { scroll: false });
                router.refresh();
              }}
            />
          ) : (
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
                  <div className="flex flex-wrap gap-2">
                    <GeocodificarBoton
                      leadId={detalle.id}
                      tieneCoords={Boolean(detalle.perfil.latitud && detalle.perfil.longitud)}
                    />
                    <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
                      Editar datos
                    </Button>
                  </div>
                </div>
                <PerfilResumen perfil={detalle.perfil} />
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

              {detalle.canal === "whatsapp" && <ConsentimientoDelCliente leadId={detalle.id} />}

              <NotasDelCliente leadId={detalle.id} onCambio={() => setVersionHistoria((v) => v + 1)} />

              <HistoriaDelCliente key={versionHistoria} leadId={detalle.id} />
            </div>
          )
        ) : agente ? (
          <AgenteTab leadId={detalle.id} agente={agente} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PerfilResumen({ perfil }: { perfil: LeadPerfil }) {
  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
      <Fila etiqueta="Nombre" valor={perfil.name ?? "—"} />
      <Fila etiqueta="Apellido" valor={perfil.apellido ?? "—"} />
      <Fila etiqueta="Alias" valor={perfil.alias ?? "—"} />
      <Fila etiqueta="Teléfono" valor={perfil.phone_e164 || perfil.phone || "—"} />
      <Fila etiqueta="Correo" valor={perfil.email ?? "—"} />
      <Fila etiqueta="Documento" valor={documentoVisible(perfil)} />
      <Fila etiqueta="Dirección" valor={perfil.address ?? "—"} />
      {perfil.direccion_normalizada && (
        <Fila etiqueta="Dirección normalizada" valor={perfil.direccion_normalizada} />
      )}
      <Fila etiqueta="Ubicación" valor={[perfil.municipio, perfil.departamento].filter(Boolean).join(", ") || "—"} />
      <Fila etiqueta="País" valor={perfil.pais ?? "—"} />
      {perfil.geocodificacion_precision && (
        <Fila
          etiqueta="Geocodificación"
          valor={`${perfil.geocodificacion_precision}${perfil.geocodificado_en ? ` · ${formatDate(perfil.geocodificado_en)}` : ""}`}
        />
      )}
      <dt className="text-text-soft">Clasificación</dt>
      <dd>
        <Badge variant={TONO_CLASIFICACION[perfil.clasificacion ?? ""] ?? "neutral"}>
          {etiquetaClasificacion(perfil.clasificacion, perfil.clasificacion_label)}
        </Badge>
      </dd>
      <dt className="text-text-soft">Mapa</dt>
      <dd>
        {perfil.mapa_url ? (
          <a
            href={perfil.mapa_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link hover:underline"
          >
            Ver en el mapa
          </a>
        ) : (
          "—"
        )}
      </dd>
    </dl>
  );
}

function documentoVisible(perfil: LeadPerfil): string {
  const tipo = etiquetaTipoDocumento(perfil.tipo_documento);
  if (!perfil.id_document) return tipo === "—" ? "—" : tipo;
  return tipo === "—" ? perfil.id_document : `${tipo} ${perfil.id_document}`;
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
            <Link href={ENLACE_DEL_AGENTE[agente.key]}>Abrir en {agente.name}</Link>
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
function PerfilForm({ detalle, onListo }: { detalle: LeadDetail; onListo: () => void }) {
  const inicial = useMemo(() => valoresIniciales(detalle.perfil), [detalle.perfil]);
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [otraClave, setOtraClave] = useState("");
  const [otroValor, setOtroValor] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const guardar = useAction();

  const grupos = useMemo(() => {
    const porGrupo = new Map<string, LeadCampoPerfil[]>();
    for (const campo of detalle.campos_perfil) {
      porGrupo.set(campo.group, [...(porGrupo.get(campo.group) ?? []), campo]);
    }
    return [...porGrupo.entries()];
  }, [detalle.campos_perfil]);

  async function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    const cambios = Object.fromEntries(
      Object.entries(valores).filter(([k, v]) => v.trim() !== (inicial[k] ?? "").trim()),
    );
    const clave = normalizarClave(otraClave);
    if (otraClave.trim() && !clave) {
      setErrores({ otro: "Escribe un nombre para el dato." });
      return;
    }
    if (clave && (esClaveCanonica(clave, detalle.campos_perfil) || esClaveDelPerfil(otraClave))) {
      setErrores({ otro: "Ese dato ya se edita en los campos de arriba." });
      return;
    }
    const otros = clave && otroValor.trim() ? { [clave]: otroValor.trim() } : {};
    if (Object.keys(cambios).length === 0 && Object.keys(otros).length === 0) {
      onListo();
      return;
    }
    setErrores({});
    const tocaDireccion = ["address", "municipio", "departamento"].some((k) => k in cambios);
    const ok = await guardar.run(async () => {
      const res = await fetch(`/api/leads/${detalle.id}/perfil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores: cambios, otros }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (json.fields) setErrores(json.fields);
      if (!res.ok) {
        return { ok: false, status: res.status, error: json.error };
      }
      // Best-effort: si la dirección cambió, se intenta ubicar; si el proveedor falla,
      // el perfil ya quedó guardado y el botón «Recalcular ubicación» permite reintentar.
      if (tocaDireccion) {
        await fetch(`/api/leads/${detalle.id}/geocodificar`, { method: "POST" }).catch(() => undefined);
      }
      return { ok: true, status: res.status, success: "Datos guardados. El agente los usará desde ya." };
    });
    if (ok) onListo();
  }

  return (
    <form onSubmit={(e) => void onGuardar(e)} className="space-y-5">
      <p className="text-sm text-body">
        Lo que corrijas queda como dato de una persona y el agente lo usa en la siguiente conversación.
      </p>

      {grupos.map(([grupo, campos]) => (
        <fieldset key={grupo} className="space-y-3 rounded-md border border-border-soft p-3">
          <legend className="px-1 text-sm font-medium text-text-soft">{GRUPOS[grupo] ?? grupo}</legend>
          {campos.map((campo) => (
            <Field
              key={campo.key}
              label={campo.label}
              htmlFor={`perfil-${campo.key}`}
              error={errores[campo.key]}
              help={campo.help ?? undefined}
              required={campo.required}
            >
              {campo.tipo === "opciones" ? (
                <Select
                  id={`perfil-${campo.key}`}
                  value={valores[campo.key] ?? ""}
                  onChange={(e) => setValores((v) => ({ ...v, [campo.key]: e.target.value }))}
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
                  onChange={(e) => setValores((v) => ({ ...v, [campo.key]: e.target.value }))}
                  maxLength={campo.tipo === "numero" ? undefined : campo.max_length}
                  required={campo.required}
                />
              )}
            </Field>
          ))}
        </fieldset>
      ))}

      <fieldset className="space-y-3 rounded-md border border-border-soft p-3">
        <legend className="px-1 text-sm text-text-soft">Agregar otro dato</legend>
        <Field label="Dato" htmlFor="perfil-otro-clave" help="Por ejemplo: Empresa, Preferencia de entrega" error={errores.otro}>
          <Input id="perfil-otro-clave" value={otraClave} onChange={(e) => setOtraClave(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Valor" htmlFor="perfil-otro-valor">
          <Input id="perfil-otro-valor" value={otroValor} onChange={(e) => setOtroValor(e.target.value)} maxLength={500} />
        </Field>
      </fieldset>

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
    avatar_url: perfil.avatar_url ?? "",
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
