"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { LeadDetail, LeadFact } from "@/lib/api/types";
import { etiquetaDeDato, normalizarClave, origenDelDato, textoDeDato } from "@/lib/clientes";
import { formatDate, formatCellValue } from "@/lib/format";
import { canalLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

import { AgenteSwitch } from "./agente-switch";
import { HistoriaDelCliente, NotasDelCliente } from "./notas-y-historia";

const PERFIL = "perfil";

/**
 * Ficha lateral del cliente (HU-UX-16): información general, lo que el agente sabe de él con
 * su origen y fecha, y la corrección de datos. Se abre con `?cliente=<id>` en Clientes, así que
 * otras pantallas (la bandeja) pueden enlazarla.
 */
export function FichaCliente({ detalle, closeHref }: { detalle: LeadDetail; closeHref: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  // Al agregar o borrar una nota, la historia se vuelve a cargar desde el principio.
  const [versionHistoria, setVersionHistoria] = useState(0);

  const perfil = detalle.datos.filter((d) => d.namespace === PERFIL && d.key !== "name");
  const otros = detalle.datos.filter((d) => d.namespace !== PERFIL);

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && router.push(closeHref, { scroll: false })}>
      <SheetContent
        title={detalle.cliente}
        description={`${canalLabel(detalle.canal)} · ${detalle.identificador}`}
        className="sm:max-w-lg"
      >
        {editando ? (
          <EditarDatos detalle={detalle} perfil={perfil} onListo={() => setEditando(false)} />
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
                  <span className="text-body">{detalle.bot_paused ? "Pausado para este cliente" : "Atiende"}</span>
                </dd>
                <dt className="text-text-soft">Teléfono</dt>
                <dd className="text-body">{detalle.telefono ?? "—"}</dd>
                <dt className="text-text-soft">Conexiones</dt>
                <dd className="text-body">
                  {detalle.conexiones.length ? detalle.conexiones.map((c) => c.label).join(", ") : "—"}
                </dd>
                <dt className="text-text-soft">Cliente desde</dt>
                <dd className="text-body">{formatDate(detalle.alta)}</dd>
                {detalle.columns.map((col) => (
                  <Fila key={col.key} etiqueta={col.label} valor={formatCellValue(detalle.extras[col.key])} />
                ))}
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

            <section aria-labelledby="ficha-datos" className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 id="ficha-datos" className="text-sm font-semibold text-headline">
                  Lo que sabemos
                </h3>
                <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
                  Editar datos
                </Button>
              </div>
              {perfil.length === 0 ? (
                <p className="text-sm text-body">
                  Todavía no hay datos guardados. El agente los va guardando en la conversación para no volver a
                  preguntarlos.
                </p>
              ) : (
                <ListaDeDatos datos={perfil} />
              )}
            </section>

            <NotasDelCliente leadId={detalle.id} onCambio={() => setVersionHistoria((v) => v + 1)} />

            {otros.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-text-soft">Datos de las habilidades ({otros.length})</summary>
                <div className="mt-3">
                  <ListaDeDatos datos={otros} conGrupo />
                </div>
              </details>
            )}

            <HistoriaDelCliente key={versionHistoria} leadId={detalle.id} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <>
      <dt className="text-text-soft">{etiqueta}</dt>
      <dd className="text-body">{valor}</dd>
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

function EditarDatos({
  detalle,
  perfil,
  onListo,
}: {
  detalle: LeadDetail;
  perfil: LeadFact[];
  onListo: () => void;
}) {
  const inicial = Object.fromEntries([
    ["name", detalle.nombre ?? ""],
    ...perfil.map((d) => [d.key, textoDeDato(d.value) === "—" ? "" : textoDeDato(d.value)]),
  ]) as Record<string, string>;
  const [valores, setValores] = useState<Record<string, string>>(inicial);
  const [nuevaClave, setNuevaClave] = useState("");
  const [nuevoValor, setNuevoValor] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const guardar = useAction();

  async function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    const datos: Record<string, string> = {};
    for (const [k, v] of Object.entries(valores)) {
      if (v.trim() !== (inicial[k] ?? "").trim()) datos[k] = v.trim();
    }
    const clave = normalizarClave(nuevaClave);
    if (nuevaClave.trim() && !clave) {
      setErrores({ nuevo: "Escribe un nombre para el dato." });
      return;
    }
    if (clave && nuevoValor.trim()) datos[clave] = nuevoValor.trim();
    if (Object.keys(datos).length === 0) {
      onListo();
      return;
    }
    setErrores({});
    const ok = await guardar.run(async () => {
      const res = await fetch(`/api/leads/${detalle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datos }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (json.fields) setErrores(json.fields);
      return { ok: res.ok, status: res.status, error: json.error, success: "Datos guardados. El agente los usará desde ya." };
    });
    if (ok) onListo();
  }

  return (
    <form onSubmit={(e) => void onGuardar(e)} className="space-y-4">
      <p className="text-sm text-body">
        Lo que corrijas queda como dato de una persona y el agente lo usa en la siguiente conversación.
      </p>
      <Field label="Nombre" htmlFor="dato-name" error={errores.name} required>
        <Input
          id="dato-name"
          value={valores.name ?? ""}
          onChange={(e) => setValores((v) => ({ ...v, name: e.target.value }))}
          maxLength={500}
        />
      </Field>
      {perfil.map((d) => (
        <Field key={d.key} label={etiquetaDeDato(d.key)} htmlFor={`dato-${d.key}`} error={errores[d.key]}>
          <Input
            id={`dato-${d.key}`}
            value={valores[d.key] ?? ""}
            onChange={(e) => setValores((v) => ({ ...v, [d.key]: e.target.value }))}
            maxLength={500}
          />
        </Field>
      ))}
      <fieldset className="space-y-3 rounded-md border border-border-soft p-3">
        <legend className="px-1 text-sm text-text-soft">Agregar un dato</legend>
        <Field label="Dato" htmlFor="dato-nuevo-clave" help="Por ejemplo: Dirección, Ciudad, Empresa" error={errores.nuevo}>
          <Input id="dato-nuevo-clave" value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Valor" htmlFor="dato-nuevo-valor">
          <Input id="dato-nuevo-valor" value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value)} maxLength={500} />
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
