"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, Plus } from "lucide-react";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenuExternalLinkItem, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import type {
  HealthConnectionMeta,
  OpcionesAccionDelCatalogo,
  OpcionesDefinicion,
  OpcionesHallazgo,
  OpcionesOpcion,
  OpcionesPlantilla,
  OpcionesVariable,
  OpcionesVistaPrevia,
} from "@/lib/api/types";
import { estadoPlantillaOpcionesLabel } from "@/lib/labels";
import {
  MAX_CUERPO,
  MAX_OPCIONES,
  MAX_PIE,
  MAX_TTL_HORAS,
  agruparHallazgos,
  contar,
  definicionVacia,
  esBanderaApagada,
  esSinCambios,
  hayErrores,
  moverOpcion,
  opcionNueva,
  sePuedePublicar,
  sincronizarVariables,
} from "@/lib/plantillas-opciones";
import { opcionesApi } from "@/lib/plantillas-opciones-cliente";
import { nombreEnMeta } from "@/lib/plantillas-opciones-meta";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

import { EnviarPrueba } from "./enviar-prueba";
import { MensajesDeCampo } from "./mensajes-de-campo";
import { SinBandera } from "./sin-bandera";
import { TarjetaOpcion } from "./tarjeta-opcion";
import { VersionesYMeta } from "./meta/versiones-y-meta";
import { TextoConChips } from "./texto-con-chips";
import { VistaPreviaTelefono } from "./vista-previa-telefono";

const firma = (nombre: string, def: OpcionesDefinicion) => JSON.stringify({ nombre, def });

type Ocupado = null | "guardando" | "publicando" | "retirando" | "eliminando";

const esAborto = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

/**
 * Editor de una plantilla con opciones (HU-OPC-06): cuerpo y pie con variables, opciones reordenables con su
 * acción y su formulario de argumentos, y una vista previa viva. Valida en vivo con `POST /validar`: los
 * hallazgos salen junto al campo de su `path` y mientras haya errores no se puede publicar.
 *
 * Rediseño A (PLA-01 a PLA-04): Publicar es la acción principal y lo demás va en «Más acciones»; las opciones
 * se pliegan y se abren de a una; la vista previa queda fija al lado (en el celular, «Ver cómo queda»); la
 * clave y los nombres en Meta quedan en «Avanzado».
 */
export function EditorDePlantilla({
  inicial,
  acciones,
  variables,
  conexiones = [],
  puedeEscribir,
  enlaceActivar,
}: {
  inicial: OpcionesPlantilla;
  acciones: OpcionesAccionDelCatalogo[];
  variables: OpcionesVariable[];
  /** Conexiones de Meta del negocio (`GET /admin/meta/health`): las que ofrece «Publicar en Meta». */
  conexiones?: HealthConnectionMeta[];
  puedeEscribir: boolean;
  /** Enlace al interruptor del negocio, solo para el master: se ofrece si la función no está activada. */
  enlaceActivar?: string | null;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const clave = inicial.clave;

  const [plantilla, setPlantilla] = useState(inicial);
  const [nombre, setNombre] = useState(inicial.nombre);
  const [def, setDef] = useState<OpcionesDefinicion>(() =>
    sincronizarVariables(inicial.borrador ?? inicial.definicion_vigente ?? definicionVacia()),
  );
  const [guardada, setGuardada] = useState(() => firma(inicial.nombre, def));
  const [ocupado, setOcupado] = useState<Ocupado>(null);
  const [banderaApagada, setBanderaApagada] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(() => def.opciones[0]?.id ?? null);
  const [probando, setProbando] = useState(false);
  const [verVista, setVerVista] = useState(false);
  const [avanzado, setAvanzado] = useState(false);

  // Validación y vista previa en vivo.
  const [hallazgos, setHallazgos] = useState<OpcionesHallazgo[]>([]);
  const [validada, setValidada] = useState<{ def: OpcionesDefinicion; fallo: boolean } | null>(null);
  const [vista, setVista] = useState<OpcionesVistaPrevia | null>(null);
  const [vistaVieja, setVistaVieja] = useState(false);
  const [cargandoVista, setCargandoVista] = useState(false);
  const primera = useRef(true);

  // Errores de campos JSON que todavía no son JSON válido: no se publica con ellos.
  const [erroresLocales, setErroresLocales] = useState<Record<string, string>>({});
  const reportarError = useCallback((k: string, mensaje: string | null) => {
    setErroresLocales((prev) => {
      if (mensaje === null) {
        if (!(k in prev)) return prev;
        const siguiente = { ...prev };
        delete siguiente[k];
        return siguiente;
      }
      return prev[k] === mensaje ? prev : { ...prev, [k]: mensaje };
    });
  }, []);

  const dirty = firma(nombre, def) !== guardada;
  const validando = validada?.def !== def;

  useEffect(() => {
    const control = new AbortController();
    const espera = setTimeout(
      async () => {
        try {
          setCargandoVista(true);
          const v = await opcionesApi.validar(def, control.signal);
          if (!v.ok) {
            if (esBanderaApagada(v)) setBanderaApagada(true);
            setValidada({ def, fallo: true });
            return;
          }
          setHallazgos(v.data.hallazgos);
          setValidada({ def, fallo: false });
          if (!v.data.valida) {
            setVistaVieja(true);
            return;
          }
          const p = await opcionesApi.vistaPrevia(def, control.signal);
          if (p.ok) {
            setVista(p.data);
            setVistaVieja(false);
          } else {
            setVistaVieja(true);
          }
        } catch (e) {
          if (!esAborto(e)) throw e;
        } finally {
          if (!control.signal.aborted) setCargandoVista(false);
        }
      },
      primera.current ? 0 : 450,
    );
    primera.current = false;
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [def]);

  useEffect(() => {
    if (!dirty) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [dirty]);

  const cambiarDef = (cambio: (d: OpcionesDefinicion) => OpcionesDefinicion) => setDef((prev) => sincronizarVariables(cambio(prev)));
  const cambiarOpcion = (i: number, opcion: OpcionesOpcion) =>
    cambiarDef((d) => ({ ...d, opciones: d.opciones.map((o, j) => (j === i ? opcion : o)) }));

  const grupos = agruparHallazgos(hallazgos);
  const errores = hayErrores(hallazgos);
  const hayErroresLocales = Object.keys(erroresLocales).length > 0;
  const valida = !validando && validada?.fallo === false;

  const hayAlgoQuePublicar = dirty || sePuedePublicar(plantilla);
  const motivoNoPublicar = !puedeEscribir
    ? null
    : validando
      ? "Revisando el borrador…"
      : validada?.fallo
        ? "No se pudo revisar el borrador. Inténtalo de nuevo."
        : errores
          ? "Corrige los errores marcados para poder publicar."
          : hayErroresLocales
            ? "Hay campos JSON con errores: corrígelos para poder publicar."
            : !hayAlgoQuePublicar
              ? "Ya está publicada y sin cambios."
              : null;

  async function recargar() {
    const res = await opcionesApi.obtener(clave);
    if (res.ok) setPlantilla(res.data);
  }

  async function guardar(silencioso = false): Promise<boolean> {
    const n = nombre;
    const d = def;
    setOcupado("guardando");
    const res = await opcionesApi.guardarBorrador(clave, { nombre: n.trim(), definicion: d });
    setOcupado(null);
    if (!res.ok) {
      if (esBanderaApagada(res)) setBanderaApagada(true);
      if (res.hallazgos.length > 0) setHallazgos(res.hallazgos);
      toast.error(res.mensaje);
      return false;
    }
    setPlantilla(res.data);
    setGuardada(firma(n, d));
    if (!silencioso) toast.success("Borrador guardado.");
    return true;
  }

  async function publicar() {
    if (dirty && !(await guardar(true))) return;
    setOcupado("publicando");
    const res = await opcionesApi.publicar(clave);
    setOcupado(null);
    if (res.ok) {
      toast.success(`Versión ${res.data.version_n} publicada como mensaje interactivo.`);
      await recargar();
      return;
    }
    if (esSinCambios(res)) {
      // No es un fallo: el borrador es igual a lo que ya está publicado.
      toast.success("Ya está publicada: el borrador es igual a la versión vigente.");
      await recargar();
      return;
    }
    if (esBanderaApagada(res)) setBanderaApagada(true);
    if (res.hallazgos.length > 0) setHallazgos(res.hallazgos);
    toast.error(res.mensaje);
  }

  async function retirar() {
    const ok = await confirmar({
      title: "¿Retirar esta plantilla?",
      description:
        "Dejará de enviarse. Los mensajes que ya recibieron tus clientes seguirán mostrando los botones, pero al tocarlos responderán «ya no está disponible». Puedes publicarla de nuevo después.",
      confirmLabel: "Retirar plantilla",
    });
    if (!ok) return;
    setOcupado("retirando");
    const res = await opcionesApi.retirar(clave);
    setOcupado(null);
    if (!res.ok) {
      toast.error(res.mensaje);
      return;
    }
    setPlantilla(res.data);
    toast.success("Plantilla retirada.");
  }

  async function eliminar() {
    const ok = await confirmar({
      title: "¿Eliminar esta plantilla?",
      description: "Se borra con su borrador y libera su clave. No se puede deshacer.",
      confirmLabel: "Eliminar plantilla",
    });
    if (!ok) return;
    setOcupado("eliminando");
    const res = await opcionesApi.eliminar(clave);
    setOcupado(null);
    if (!res.ok) {
      toast.error(res.mensaje);
      return;
    }
    setGuardada(firma(nombre, def));
    toast.success("Plantilla eliminada.");
    router.push("/plantillas-opciones");
  }

  if (banderaApagada) return <SinBandera enlaceActivar={enlaceActivar} />;

  const sinPublicar = plantilla.estado === "published" && plantilla.tiene_borrador_sin_publicar;
  const titulo = nombre.trim() || clave;
  const deshabilitado = !puedeEscribir || ocupado !== null;
  const publicada = plantilla.estado === "published";

  function agregarOpcion() {
    const nueva = opcionNueva(def.opciones);
    cambiarDef((d) => ({ ...d, opciones: [...d.opciones, nueva] }));
    setAbierta(nueva.id);
  }

  const vistaPrevia = (
    <VistaPreviaTelefono
      vista={vista}
      cargando={cargandoVista || validando}
      desactualizada={vistaVieja && errores}
      motivoSinVista={errores ? "Corrige los errores marcados para ver cómo se verá." : undefined}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={titulo}
        breadcrumbs={[
          { label: "Mensajes", href: "/mensajes" },
          { label: "Plantillas con opciones", href: "/plantillas-opciones" },
        ]}
        actions={
          puedeEscribir ? (
            <>
              <MenuDeFila etiqueta="Más acciones">
                {publicada && <DropdownMenuItem onSelect={() => setProbando(true)}>Enviar una prueba</DropdownMenuItem>}
                {publicada && (
                  // Pestaña nueva: no se pierden los cambios sin guardar. Prueba la versión publicada, como «Enviar una prueba».
                  <DropdownMenuExternalLinkItem href={`/asistente?plantilla=${encodeURIComponent(clave)}`} avisoNuevaPestana="se abre en una pestaña nueva">
                    Probar con el asistente
                  </DropdownMenuExternalLinkItem>
                )}
                {publicada && <DropdownMenuSeparator />}
                {publicada ? (
                  <DropdownMenuItem tone="danger" disabled={deshabilitado} onSelect={() => void retirar()}>
                    Retirar la plantilla
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem tone="danger" disabled={deshabilitado} onSelect={() => void eliminar()}>
                    Eliminar la plantilla
                  </DropdownMenuItem>
                )}
              </MenuDeFila>
              <Button type="button" variant="outline" loading={ocupado === "guardando"} disabled={deshabilitado || !dirty} onClick={() => guardar()}>
                Guardar borrador
              </Button>
              <Button
                type="button"
                variant="accent"
                loading={ocupado === "publicando"}
                disabled={deshabilitado || motivoNoPublicar !== null}
                onClick={publicar}
              >
                Publicar
              </Button>
            </>
          ) : undefined
        }
      />
      {probando && (
        <EnviarPrueba clave={clave} version={plantilla.version_vigente} hayCambiosSinPublicar={sinPublicar || dirty} onCerrar={() => setProbando(false)} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={plantilla.estado === "published" ? "success" : plantilla.estado === "retired" ? "warning" : "neutral"}>
          {estadoPlantillaOpcionesLabel(plantilla.estado)}
        </Badge>
        {plantilla.version_vigente !== null && <Badge variant="neutral">Versión {plantilla.version_vigente}</Badge>}
        {dirty ? <Badge variant="info">Cambios sin guardar</Badge> : sinPublicar && <Badge variant="info">Cambios sin publicar</Badge>}
        {!puedeEscribir && <Badge variant="neutral">Solo lectura</Badge>}
        {motivoNoPublicar && puedeEscribir && (
          <p role="status" className="text-xs text-text-soft">
            {motivoNoPublicar}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" className="ml-auto lg:hidden" onClick={() => setVerVista(true)}>
          <Eye className="h-4 w-4" aria-hidden />
          Ver cómo queda
        </Button>
      </div>
      <Dialog open={verVista} onOpenChange={setVerVista}>
        <DialogContent title="Cómo queda" description="Así lo verá el cliente.">
          {vistaPrevia}
        </DialogContent>
      </Dialog>

      {!puedeEscribir && (
        <p className="rounded-md bg-surface-2 p-3 text-sm text-body">
          Puedes ver esta plantilla, pero solo el propietario del negocio puede cambiarla, publicarla o enviar pruebas.
        </p>
      )}
      {plantilla.estado === "retired" && (
        <p className="rounded-md bg-status-warning-bg p-3 text-sm text-status-warning-fg">
          Esta plantilla está retirada y no se envía. Puedes ajustarla y publicarla de nuevo.
        </p>
      )}
      {grupos.general.length > 0 && <MensajesDeCampo hallazgos={grupos.general} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-5 pt-5">
              <Field label="Nombre" htmlFor="nombre-plantilla" help="Es para ti: tus clientes no lo ven.">
                <Input
                  id="nombre-plantilla"
                  value={nombre}
                  maxLength={120}
                  disabled={!puedeEscribir}
                  placeholder="Ej.: Confirmar cita"
                  onChange={(e) => setNombre(e.target.value)}
                />
              </Field>

              <TextoConChips
                label="Mensaje"
                value={def.body}
                onChange={(body) => cambiarDef((d) => ({ ...d, body }))}
                max={MAX_CUERPO}
                rows={5}
                disabled={!puedeEscribir}
                chips={variables.map((v) => ({ etiqueta: v.descripcion, texto: `{${v.ruta}}`, ayuda: `Se reemplaza por: ${v.descripcion}` }))}
                chipsLabel="Agregar un dato"
                hallazgos={[...grupos.cuerpo, ...grupos.variables]}
                placeholder="Ej.: Hola {cliente.nombre}, ¿confirmas tu cita de mañana?"
                help="Toca un dato para ponerlo donde está el cursor; en la vista previa se ve con un ejemplo."
              />

              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="pie-plantilla" className="text-[13px] font-medium text-body">
                    Pie (opcional)
                  </label>
                  <span
                    className={cn("text-xs tabular-nums", contar(def.footer ?? "") > MAX_PIE ? "font-medium text-status-danger-fg" : "text-text-soft")}
                  >
                    {contar(def.footer ?? "")}/{MAX_PIE}
                    <span className="sr-only"> caracteres</span>
                  </span>
                </div>
                <Input
                  id="pie-plantilla"
                  value={def.footer ?? ""}
                  disabled={!puedeEscribir}
                  aria-invalid={grupos.pie.some((h) => h.severity === "error") || undefined}
                  onChange={(e) => cambiarDef((d) => ({ ...d, footer: e.target.value === "" ? null : e.target.value }))}
                />
                <MensajesDeCampo hallazgos={grupos.pie} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Field
                    label="Horas que pueden tocarse las opciones"
                    htmlFor="vigencia-plantilla"
                    help={`De 1 a ${MAX_TTL_HORAS} horas desde que se envía. Después, el cliente recibe «vencido».`}
                  >
                    <Input
                      id="vigencia-plantilla"
                      type="number"
                      min={1}
                      max={MAX_TTL_HORAS}
                      value={def.ttl_horas}
                      disabled={!puedeEscribir}
                      aria-invalid={grupos.vigencia.some((h) => h.severity === "error") || undefined}
                      onChange={(e) => cambiarDef((d) => ({ ...d, ttl_horas: Number(e.target.value) || 0 }))}
                    />
                  </Field>
                  <MensajesDeCampo hallazgos={grupos.vigencia} />
                </div>
                <div className="flex items-start justify-between gap-3 rounded-md bg-surface-2 p-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="exclusivo-plantilla" className="text-[13px] font-medium text-body">
                      Una sola opción por mensaje
                    </label>
                    <p className="text-xs text-text-soft">
                      {def.exclusivo
                        ? "Al tocar una opción, las demás dejan de funcionar."
                        : "El cliente puede tocar varias opciones del mismo mensaje."}
                    </p>
                  </div>
                  <Switch
                    id="exclusivo-plantilla"
                    checked={def.exclusivo}
                    disabled={!puedeEscribir}
                    onCheckedChange={(exclusivo) => cambiarDef((d) => ({ ...d, exclusivo }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <section aria-label="Opciones" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-sh-block text-headline">
                Opciones <span className="font-sans text-sm font-normal text-text-soft tabular-nums">{def.opciones.length} de {MAX_OPCIONES}</span>
              </h2>
              <p className="text-xs text-text-soft">Hasta 3 salen como botones; de 4 a 10, como una lista. Toca una para editarla.</p>
            </div>
            <MensajesDeCampo hallazgos={grupos.lista} />
            {def.opciones.map((opcion, i) => (
              <TarjetaOpcion
                key={opcion.id}
                indice={i}
                total={def.opciones.length}
                opcion={opcion}
                acciones={acciones}
                variables={variables}
                hallazgos={grupos.porOpcion.get(i) ?? []}
                disabled={!puedeEscribir}
                reportarError={reportarError}
                onChange={(o) => cambiarOpcion(i, o)}
                onMover={(dir) => cambiarDef((d) => ({ ...d, opciones: moverOpcion(d.opciones, i, i + dir) }))}
                onQuitar={() => cambiarDef((d) => ({ ...d, opciones: d.opciones.filter((_, j) => j !== i) }))}
                abierta={abierta === opcion.id}
                onAlternar={() => setAbierta((actual) => (actual === opcion.id ? null : opcion.id))}
              />
            ))}
            {puedeEscribir && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={def.opciones.length >= MAX_OPCIONES}
                  onClick={agregarOpcion}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Agregar opción
                </Button>
                {def.opciones.length >= MAX_OPCIONES && <p className="mt-1 text-xs text-text-soft">Llegaste al máximo de {MAX_OPCIONES} opciones.</p>}
              </div>
            )}
          </section>

          <VersionesYMeta
            plantilla={plantilla}
            conexiones={conexiones}
            puedeEscribir={puedeEscribir}
            onActualizar={recargar}
            onBanderaApagada={() => setBanderaApagada(true)}
            etiquetasDeDatos={Object.fromEntries(variables.map((v) => [v.ruta, v.descripcion]))}
          />

          <section className="flex flex-col gap-3">
            <button
              type="button"
              aria-expanded={avanzado}
              aria-controls="avanzado-plantilla"
              onClick={() => setAvanzado((v) => !v)}
              className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2.5 text-left text-sm text-body hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
            >
              Avanzado: clave y nombres en Meta
              <ChevronDown aria-hidden className={cn("h-4 w-4 text-text-soft transition-transform duration-150", avanzado && "rotate-180")} />
            </button>
            {avanzado && (
              <dl id="avanzado-plantilla" className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                <dt className="text-text-soft">Clave</dt>
                <dd className="m-0 font-mono text-body">{clave}</dd>
                <dt className="text-text-soft">Nombres en Meta</dt>
                <dd className="m-0 text-body">
                  {plantilla.versiones.length === 0 ? (
                    <>Cada versión tendrá el suyo, como <span className="font-mono">{nombreEnMeta(clave, 1)}</span>.</>
                  ) : (
                    plantilla.versiones.map((v) => (
                      <span key={v.version_n} className="block">
                        Versión {v.version_n}: <span className="font-mono">{v.meta?.nombre ?? nombreEnMeta(clave, v.version_n)}</span>
                      </span>
                    ))
                  )}
                </dd>
              </dl>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-3 max-lg:hidden lg:sticky lg:top-4" aria-label="Vista previa">
          {vistaPrevia}
          <p className="text-xs text-text-soft">
            Sale con botones a quien escribió en las últimas 24 horas. Para los demás hace falta la plantilla de Meta: está en «Fuera de las 24 horas».
          </p>
          {valida && !errores && hallazgos.length === 0 && (
            <p role="status" className="text-xs text-status-success-fg">
              Sin errores ni avisos.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
