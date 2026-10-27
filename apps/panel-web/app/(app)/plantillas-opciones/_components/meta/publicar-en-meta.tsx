"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import type { HealthConnectionMeta, OpcionesDefinicion, OpcionesMetaResultado, OpcionesVistaPrevia } from "@/lib/api/types";
import { esBanderaApagada } from "@/lib/plantillas-opciones";
import { opcionesApi } from "@/lib/plantillas-opciones-cliente";
import {
  AVISO_CATEGORIA,
  CATEGORIAS_META,
  FALLO_NO_ROMPE_LA_VERSION,
  IDIOMAS_META,
  IDIOMA_POR_DEFECTO,
  MAX_EJEMPLO_META,
  conexionesParaPublicar,
  ejemplosIniciales,
  ejemplosParaEnviar,
  esFalloReintentable,
  mensajeDePublicacion,
  motivoNoEnviar,
  nombreDeConexion,
  nombreEnMeta,
  presentacionDeResultado,
  resumirComponentes,
} from "@/lib/plantillas-opciones-meta";

import { VistaPreviaMeta } from "./vista-previa-meta";

type Falla = { texto: string; reintentable: boolean };

/**
 * Diálogo para publicar una versión como plantilla de Meta (HU-OPC-04 y HU-OPC-06). Crea una plantilla REAL en la
 * cuenta de WhatsApp Business del negocio, así que no envía nada sin que el dueño elija la conexión y la categoría,
 * vea cómo quedará y marque que entiende lo que pasa. Repetir la petición es seguro (el backend no duplica la
 * plantilla), pero nunca se reenvía sola: cada intento es un clic.
 *
 * Quien lo usa lo monta al abrirlo y lo desmonta al cerrar (`onCerrar`): así el resultado sigue a la vista aunque
 * la pantalla recargue la plantilla por debajo, y cada apertura empieza limpia.
 */
export function PublicarEnMeta({
  clave,
  version,
  definicion,
  conexiones,
  reintento = false,
  onResultado,
  onCerrar,
  onBanderaApagada,
}: {
  clave: string;
  version: number;
  /** La definición de esta versión, si se conoce (la vigente): da la vista previa y las variables. */
  definicion: OpcionesDefinicion | null;
  conexiones: readonly HealthConnectionMeta[];
  reintento?: boolean;
  onResultado: (r: OpcionesMetaResultado) => void;
  onCerrar: () => void;
  onBanderaApagada?: () => void;
}) {
  const nombre = nombreEnMeta(clave, version);
  const { listas, noListas } = useMemo(() => conexionesParaPublicar(conexiones), [conexiones]);
  const variables = useMemo(() => definicion?.variables ?? [], [definicion]);

  const [conexion, setConexion] = useState<string | null>(listas.length === 1 ? listas[0].id : null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [idioma, setIdioma] = useState(IDIOMA_POR_DEFECTO);
  const [ejemplos, setEjemplos] = useState<Record<string, string>>(() => ejemplosIniciales(variables));
  const [entendido, setEntendido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falla, setFalla] = useState<Falla | null>(null);
  const [resultado, setResultado] = useState<OpcionesMetaResultado | null>(null);
  const [vista, setVista] = useState<OpcionesVistaPrevia | null>(null);
  const [vistaError, setVistaError] = useState<string | null>(null);
  const enCurso = useRef(false);

  // Vista previa de los componentes de Meta con los valores de muestra escritos (solo si se conoce la definición).
  useEffect(() => {
    if (!definicion) return;
    const control = new AbortController();
    const espera = setTimeout(async () => {
      try {
        const res = await opcionesApi.vistaPrevia(definicion, control.signal, ejemplosParaEnviar(ejemplos));
        if (res.ok) {
          setVista(res.data);
          setVistaError(null);
        } else {
          setVista(null);
          setVistaError(res.hallazgos.length > 0 ? "El mensaje tiene errores: corrígelos antes de publicarlo en Meta." : "No se pudo armar la vista previa.");
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) setVistaError("No se pudo armar la vista previa.");
      }
    }, 300);
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [definicion, ejemplos]);

  const resumen = useMemo(() => (vista ? resumirComponentes(vista.componentes_meta) : null), [vista]);
  const motivo = motivoNoEnviar({ conexion, categoria, entendido });
  const excedeTopes = !!resumen && (resumen.excedeBotones || resumen.botones.some((b) => b.excede));

  const enviar = useCallback(async () => {
    if (enCurso.current || motivoNoEnviar({ conexion, categoria, entendido }) !== null) return;
    if (!conexion || (categoria !== "UTILITY" && categoria !== "MARKETING")) return;
    enCurso.current = true;
    setEnviando(true);
    setFalla(null);
    try {
      const res = await opcionesApi.publicarEnMeta(clave, version, {
        connection_id: conexion,
        categoria,
        idioma,
        ejemplos: ejemplosParaEnviar(ejemplos),
      });
      if (res.ok) {
        setResultado(res.data);
        onResultado(res.data);
      } else if (esBanderaApagada(res)) {
        onCerrar();
        onBanderaApagada?.();
      } else {
        setFalla({ texto: mensajeDePublicacion(res), reintentable: esFalloReintentable(res) });
      }
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  }, [categoria, clave, conexion, ejemplos, entendido, idioma, onBanderaApagada, onCerrar, onResultado, version]);

  const presentacion = resultado ? presentacionDeResultado(resultado.outcome) : null;

  return (
    <Dialog open onOpenChange={(v) => !v && !enviando && onCerrar()}>
      <DialogContent
        title={reintento ? `Reintentar la versión ${version} en Meta` : `Publicar la versión ${version} en Meta`}
        description={`Se crea la plantilla «${nombre}» en tu cuenta de WhatsApp Business, para que el mensaje también salga fuera de las 24 horas.`}
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        {resultado && presentacion ? (
          <div className="flex flex-col gap-4">
            <div
              role={resultado.ok ? "status" : "alert"}
              className={
                resultado.ok
                  ? "rounded-md bg-status-success-bg p-3 text-sm text-status-success-fg"
                  : presentacion.tono === "danger"
                    ? "rounded-md bg-status-danger-bg p-3 text-sm text-status-danger-fg"
                    : "rounded-md bg-status-warning-bg p-3 text-sm text-status-warning-fg"
              }
            >
              <p className="font-medium">{presentacion.etiqueta}</p>
              <p className="mt-1">{presentacion.explicacion}</p>
              {resultado.motivo && <p className="mt-1 text-xs">Motivo: {resultado.motivo}</p>}
              {presentacion.siguiente && <p className="mt-1 text-xs">{presentacion.siguiente}</p>}
            </div>
            {!resultado.ok && <p className="text-xs text-text-soft">{FALLO_NO_ROMPE_LA_VERSION}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {!resultado.ok && resultado.reintentable && (
                <Button type="button" variant="outline" loading={enviando} onClick={enviar}>
                  Reintentar
                </Button>
              )}
              <Button type="button" onClick={onCerrar}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : listas.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-body">
              {conexiones.some((c) => c.channel === "whatsapp")
                ? "Ninguna de tus conexiones de WhatsApp está lista para crear plantillas."
                : "Tu negocio todavía no tiene una conexión de WhatsApp con Meta."}
            </p>
            {noListas.length > 0 && (
              <ul className="flex flex-col gap-1 text-xs text-text-soft">
                {noListas.map(({ conexion: c, motivo: m }) => (
                  <li key={c.id}>
                    {nombreDeConexion(c)}: {m}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button asChild variant="accent">
                <Link href={noListas.length > 0 ? "/conexiones/meta" : "/conexiones/whatsapp"}>
                  {noListas.length > 0 ? "Revisar la salud de las conexiones" : "Conectar WhatsApp"}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-medium text-body">Conexión de WhatsApp</legend>
              <RadioGroup
                label="Conexión de WhatsApp"
                name="conexion-meta"
                value={conexion ?? undefined}
                onValueChange={setConexion}
                options={listas.map((c) => ({
                  value: c.id,
                  label: nombreDeConexion(c),
                  description: c.status === "degraded" ? "Con avisos de salud: puede que Meta tarde más en responder." : undefined,
                }))}
              />
              {noListas.length > 0 && (
                <p className="text-xs text-text-soft">
                  No disponibles: {noListas.map(({ conexion: c, motivo: m }) => `${nombreDeConexion(c)} (${m.toLowerCase()})`).join("; ")}
                </p>
              )}
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-[13px] font-medium text-body">Categoría</legend>
              <RadioGroup
                label="Categoría de la plantilla"
                name="categoria-meta"
                value={categoria ?? undefined}
                onValueChange={setCategoria}
                options={CATEGORIAS_META.map((c) => ({ value: c.valor, label: c.etiqueta, description: c.ayuda }))}
              />
              <p className="text-xs text-text-soft">{AVISO_CATEGORIA}</p>
            </fieldset>

            <Field label="Idioma de la plantilla" htmlFor="idioma-meta" help="Debe ser el idioma en el que está escrito el mensaje.">
              <Select id="idioma-meta" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
                {IDIOMAS_META.map((i) => (
                  <option key={i.valor} value={i.valor}>
                    {i.etiqueta}
                  </option>
                ))}
              </Select>
            </Field>

            {variables.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-[13px] font-medium text-body">Ejemplo de cada dato del mensaje</legend>
                <p className="text-xs text-text-soft">Meta pide un ejemplo por cada dato variable y lo revisa. Usa datos inventados, nunca los de un cliente.</p>
                {variables.map((v) => (
                  <Field key={v} label={`{${v}}`} htmlFor={`ejemplo-${v}`}>
                    <Input
                      id={`ejemplo-${v}`}
                      value={ejemplos[v] ?? ""}
                      maxLength={MAX_EJEMPLO_META}
                      onChange={(e) => setEjemplos((prev) => ({ ...prev, [v]: e.target.value }))}
                    />
                  </Field>
                ))}
              </fieldset>
            )}

            <section aria-label="Cómo quedará en Meta" className="flex flex-col gap-2">
              <h3 className="text-[13px] font-medium text-body">Así se enviará a Meta</h3>
              {!definicion ? (
                <p className="text-xs text-text-soft">
                  No mostramos la vista previa de una versión anterior. Se envía exactamente como se publicó en su momento.
                </p>
              ) : resumen ? (
                <VistaPreviaMeta resumen={resumen} cuerpoRenderizado={vista?.cuerpo_meta_renderizado} />
              ) : vistaError ? (
                <p role="status" className="text-xs text-status-warning-fg">
                  {vistaError}
                </p>
              ) : (
                <p className="text-xs text-text-soft">Armando la vista previa…</p>
              )}
            </section>

            <div className="flex flex-col gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-3">
              <p className="flex items-start gap-2 text-sm font-medium text-status-warning-fg">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Esto crea una plantilla real en tu cuenta de WhatsApp Business.
              </p>
              <ul className="ml-6 list-disc text-xs text-status-warning-fg">
                <li>Consume uno de los cupos de creación de plantillas de tu cuenta.</li>
                <li>
                  Una plantilla aprobada no se edita: si cambias el mensaje, se publica otra versión con otro nombre (por ejemplo «{nombreEnMeta(clave, version + 1)}»).
                </li>
                <li>Meta la revisa y puede tardar hasta un día. Mientras tanto, fuera de las 24 horas el mensaje sale como texto.</li>
              </ul>
              <Checkbox
                id="entiendo-publicar-en-meta"
                label="Entiendo que se creará una plantilla real en mi cuenta de WhatsApp Business"
                checked={entendido}
                onCheckedChange={setEntendido}
              />
            </div>

            {falla && (
              <p role="alert" className={falla.reintentable ? "text-sm text-status-warning-fg" : "text-sm text-status-danger-fg"}>
                {falla.texto}
              </p>
            )}
            {!falla && motivo && !entendido && categoria && conexion && <p className="text-xs text-text-soft">{motivo}</p>}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" disabled={enviando} onClick={onCerrar}>
                Cancelar
              </Button>
              <Button type="button" variant="accent" loading={enviando} disabled={motivo !== null || excedeTopes} onClick={enviar}>
                {falla?.reintentable ? "Reintentar" : "Crear plantilla en Meta"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
