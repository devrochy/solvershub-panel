"use client";

import { useState } from "react";
import { RefreshCw, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ConexionDeEnvio, EnvioSegmento, VistaPreviaEnvio } from "@/lib/api/types";
import {
  BLOQUEO,
  conteoDelEnvio,
  ESTADO_GENERAL,
  faltaVariable,
  textoDeEjemplo,
  variablesIniciales,
  type Fuente,
  type Variable,
} from "@/lib/envios";
import { formatDateTime } from "@/lib/format";

type Paso = "armar" | "vista" | "enviado";

/**
 * «Enviar plantilla» a los clientes del filtro actual (HU-CRM-06, ADR-0150). Dos pasos: la vista
 * previa cuenta a quién le llega y por qué quedan fuera los demás (todavía no sale nada); confirmar
 * envía exactamente esa lista. La clave de idempotencia se genera una vez por vista previa, así
 * que un doble clic o un reintento no envían dos veces.
 */
export function EnviarPlantilla({ consulta }: { consulta: string }) {
  const [open, setOpen] = useState(false);
  const [paso, setPaso] = useState<Paso>("armar");
  const [conexiones, setConexiones] = useState<ConexionDeEnvio[] | null>(null);
  const [conexionId, setConexionId] = useState("");
  const [plantillaId, setPlantillaId] = useState("");
  const [variables, setVariables] = useState<Record<string, Variable>>({});
  const [vista, setVista] = useState<VistaPreviaEnvio | null>(null);
  const [clave, setClave] = useState("");
  const [envio, setEnvio] = useState<EnvioSegmento | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conexion = conexiones?.find((c) => c.id === conexionId) ?? null;
  const plantilla = conexion?.plantillas.find((p) => p.id === plantillaId) ?? null;

  async function abrir(abierto: boolean) {
    setOpen(abierto);
    if (!abierto) return;
    setPaso("armar");
    setVista(null);
    setEnvio(null);
    setError(null);
    const res = await fetch("/api/leads/acciones/plantilla");
    const json = (await res.json().catch(() => null)) as ConexionDeEnvio[] | { error?: string } | null;
    if (!res.ok || !Array.isArray(json)) {
      setError((json as { error?: string } | null)?.error ?? "No se pudieron cargar las conexiones.");
      return;
    }
    setConexiones(json);
    if (json.length === 1) elegirConexion(json[0].id, json);
  }

  function elegirConexion(id: string, lista = conexiones) {
    setConexionId(id);
    const primera = lista?.find((c) => c.id === id)?.plantillas[0];
    elegirPlantilla(primera?.id ?? "", lista, id);
  }

  function elegirPlantilla(id: string, lista = conexiones, cid = conexionId) {
    setPlantillaId(id);
    const p = lista?.find((c) => c.id === cid)?.plantillas.find((t) => t.id === id);
    setVariables(p ? variablesIniciales(p.variables) : {});
  }

  function cambiarVariable(nombre: string, cambio: Partial<Variable>) {
    setVariables((previas) => ({ ...previas, [nombre]: { ...previas[nombre], ...cambio } }));
  }

  async function verVistaPrevia() {
    if (!conexion || !plantilla) {
      setError("Elige la conexión y la plantilla.");
      return;
    }
    const falta = faltaVariable(variables);
    if (falta) {
      setError(falta);
      return;
    }
    setCargando(true);
    setError(null);
    const res = await fetch(`/api/leads/acciones/plantilla${consulta ? `?${consulta}` : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connection_id: conexion.id, template_id: plantilla.id, variables }),
    });
    const json = (await res.json().catch(() => ({}))) as VistaPreviaEnvio & { error?: string };
    setCargando(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo armar la vista previa.");
      return;
    }
    setVista(json);
    setClave(crypto.randomUUID());
    setPaso("vista");
  }

  async function confirmar() {
    if (!vista?.envio_id) return;
    setCargando(true);
    setError(null);
    const res = await fetch(`/api/leads/acciones/plantilla/${vista.envio_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave }),
    });
    const json = (await res.json().catch(() => ({}))) as EnvioSegmento & { error?: string };
    setCargando(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo confirmar el envío.");
      return;
    }
    setEnvio(json);
    setPaso("enviado");
  }

  async function actualizar() {
    if (!envio) return;
    setCargando(true);
    const res = await fetch(`/api/leads/acciones/plantilla/${envio.id}`);
    const json = (await res.json().catch(() => null)) as EnvioSegmento | null;
    setCargando(false);
    if (res.ok && json) setEnvio(json);
  }

  return (
    <Dialog open={open} onOpenChange={(abierto) => void abrir(abierto)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Send className="h-4 w-4" aria-hidden /> Enviar plantilla
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Enviar una plantilla a este filtro"
        description="Solo les llega a los clientes de WhatsApp del filtro que aceptaron recibir promociones. Primero ves a quién; después confirmas."
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
      >
        {paso === "armar" && (
          <div className="flex flex-col gap-4">
            {conexiones && conexiones.length === 0 && (
              <p className="text-sm text-body">
                No hay conexiones de WhatsApp con plantillas. Conecta un número de WhatsApp en Conexiones.
              </p>
            )}
            {conexiones && conexiones.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Conexión" htmlFor="env-conexion">
                  <Select id="env-conexion" value={conexionId} onChange={(e) => elegirConexion(e.target.value)}>
                    <option value="">Elige una conexión</option>
                    {conexiones.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                        {c.motivo_pausa ? ` (${c.motivo_pausa})` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Plantilla de marketing" htmlFor="env-plantilla">
                  <Select
                    id="env-plantilla"
                    value={plantillaId}
                    onChange={(e) => elegirPlantilla(e.target.value)}
                    disabled={!conexion || conexion.plantillas.length === 0}
                  >
                    <option value="">
                      {conexion && conexion.plantillas.length === 0 ? "Sin plantillas aprobadas" : "Elige una plantilla"}
                    </option>
                    {conexion?.plantillas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.language})
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
            {conexion && conexion.plantillas.length === 0 && (
              <p className="text-sm text-text-soft">
                Esta conexión no tiene plantillas de marketing aprobadas con variables solo en el cuerpo. Créalas en
                Plantillas y espera la aprobación de Meta.
              </p>
            )}
            {plantilla && (
              <>
                {plantilla.variables.map((nombre) => {
                  const v = variables[nombre] ?? { fuente: "fijo", valor: "" };
                  return (
                    <div key={nombre} className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                      <Field label={`Variable {{${nombre}}}`} htmlFor={`env-fuente-${nombre}`}>
                        <Select
                          id={`env-fuente-${nombre}`}
                          value={v.fuente}
                          onChange={(e) => cambiarVariable(nombre, { fuente: e.target.value as Fuente })}
                        >
                          <option value="cliente.nombre">Nombre del cliente</option>
                          <option value="fijo">Texto fijo</option>
                        </Select>
                      </Field>
                      <Field
                        label={v.fuente === "cliente.nombre" ? "Si no sabemos el nombre" : "Texto"}
                        htmlFor={`env-valor-${nombre}`}
                      >
                        <Input
                          id={`env-valor-${nombre}`}
                          value={v.valor}
                          maxLength={1000}
                          placeholder={v.fuente === "cliente.nombre" ? "Ej.: amigo (vacío = no se le envía)" : ""}
                          onChange={(e) => cambiarVariable(nombre, { valor: e.target.value })}
                        />
                      </Field>
                    </div>
                  );
                })}
                <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-body whitespace-pre-wrap">
                  {textoDeEjemplo(plantilla.body, variables)}
                </p>
              </>
            )}
            <FormFeedback error={error ?? undefined} />
            <div className="flex justify-end">
              <Button variant="accent" onClick={() => void verVistaPrevia()} disabled={cargando || !plantilla}>
                {cargando ? "Contando…" : "Ver a quién le llega"}
              </Button>
            </div>
          </div>
        )}

        {paso === "vista" && vista && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-body">
              De {vista.candidatos} clientes del filtro, <strong className="text-headline">{vista.elegibles}</strong>{" "}
              recibirían la plantilla. Todavía no se envió nada.
            </p>
            {vista.muestra.length > 0 && (
              <p className="text-sm text-text-soft">
                Por ejemplo: {vista.muestra.join(", ")}
                {vista.elegibles > vista.muestra.length ? "…" : ""}
              </p>
            )}
            {vista.excluidos.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-headline">Quedan fuera</p>
                <ul className="space-y-1 text-sm text-body">
                  {vista.excluidos.map((e) => (
                    <li key={e.motivo} className="flex justify-between gap-3">
                      <span>{e.label}</span>
                      <span className="tabular-nums">{e.total}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-body whitespace-pre-wrap">{vista.texto}</p>
            <dl className="grid grid-cols-[12rem_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-text-soft">Costo estimado</dt>
              <dd className="text-body">
                {vista.costo_creditos} créditos de la plataforma, más lo que Meta cobra por cada mensaje de marketing
              </dd>
              <dt className="text-text-soft">Tope por envío</dt>
              <dd className="text-body">{vista.tope} clientes</dd>
              {vista.limite_diario !== null && vista.limite_diario !== undefined && (
                <>
                  <dt className="text-text-soft">Límite diario del número</dt>
                  <dd className="text-body">
                    {vista.limite_diario} personas en 24 h (cuenta también los avisos del agente)
                  </dd>
                </>
              )}
              {vista.expira && (
                <>
                  <dt className="text-text-soft">Confirma antes de</dt>
                  <dd className="text-body">{formatDateTime(vista.expira)}</dd>
                </>
              )}
            </dl>
            {vista.bloqueo && (
              <p role="alert" className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
                {BLOQUEO[vista.bloqueo] ?? vista.bloqueo}
              </p>
            )}
            <FormFeedback error={error ?? undefined} />
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setPaso("armar")} disabled={cargando}>
                Volver
              </Button>
              <Button
                variant="accent"
                onClick={() => void confirmar()}
                disabled={cargando || Boolean(vista.bloqueo) || !vista.envio_id}
              >
                {cargando ? "Enviando…" : `Enviar a ${vista.elegibles} ${vista.elegibles === 1 ? "cliente" : "clientes"}`}
              </Button>
            </div>
          </div>
        )}

        {paso === "enviado" && envio && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={envio.estado === "terminado" ? "success" : "neutral"}>
                {ESTADO_GENERAL[envio.estado] ?? envio.estado}
              </Badge>
              <span className="text-sm text-body">
                {envio.plantilla} · {envio.total} {envio.total === 1 ? "cliente" : "clientes"}
              </span>
            </div>
            <p className="text-sm text-text-soft">
              Sale por tandas de 25, una cada 30 segundos. Cada cliente lo verá en su historia.
            </p>
            {Object.keys(envio.conteo).length > 0 && (
              <ul className="space-y-1 text-sm text-body">
                {conteoDelEnvio(envio.conteo).map((c) => (
                  <li key={c.label} className="flex justify-between gap-3">
                    <span>{c.label}</span>
                    <span className="tabular-nums">{c.total}</span>
                  </li>
                ))}
              </ul>
            )}
            {envio.fallas.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-text-soft">No les llegó ({envio.fallas.length})</summary>
                <ul className="mt-2 space-y-1 text-body">
                  {envio.fallas.map((f, i) => (
                    <li key={`${f.cliente}-${i}`}>
                      {f.cliente}: {f.motivo}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => void actualizar()} disabled={cargando}>
                <RefreshCw className="h-4 w-4" aria-hidden /> Actualizar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
