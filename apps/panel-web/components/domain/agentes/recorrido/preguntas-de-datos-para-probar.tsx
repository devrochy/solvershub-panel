"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Camera, Clock, Download, FileSpreadsheet, Sparkles, Trash2 } from "lucide-react";

import type { PreguntaDeLaLista } from "@/components/domain/agentes/recorrido/pregunta-del-recorrido";
import { PrecargaDeCatalogo } from "@/components/domain/precarga-de-catalogo";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dropzone } from "@/components/ui/dropzone";
import { GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  CotizacionFotos,
  EstadoDatosDePrueba,
  EstadoImportacion,
  ImportacionHecha,
  LoteGenerado,
  MapeoPropuesto,
  PlantillaImportacion,
  RegistroDePrueba,
  RegistrosDePrueba,
} from "@/lib/api/types";
import {
  MAX_BYTES_FOTO,
  MAX_FOTOS,
  TIPOS_DE_FOTO,
  avisoDeIa,
  borrarImportacion,
  columnasVisibles,
  cotizarFotos,
  filasDesdeMapeo,
  leerJson,
  mapearArchivo,
  reconocerFotos,
  registrosDesdeFilas,
  resumenDeImportacionDelCatalogo,
  textoDeCotizacion,
  type FilaEditable,
} from "@/lib/carga-de-datos";
import {
  LO_DEL_TIPO,
  asignacionDelMapeo,
  cabecerasSinAsignar,
  cargadosDelTipo,
  cuantos,
  filasConAsignacion,
  leerCsv,
  metodoRecomendado,
  metodosDisponibles,
  obligatoriasSinColumna,
  origenesCargados,
  preguntasDelMetodo,
  textoDelArchivo,
  textoDelCostoPorFoto,
  type AsignacionManual,
  type MetodoDeCarga,
  type PreguntaDeCarga,
} from "@/lib/carga-de-prueba";
import { IR_A_IDENTIDAD, conteoLegible, llamarDatosDePrueba, resumenDelLote } from "@/lib/datos-de-prueba";
import type { TipoDeNegocio } from "@/lib/onboarding";

/** Lo que se cargó en esta visita: el resumen largo (pregunta abierta) y el corto (respondida). */
type Hecho = { resumen: string; corto: string };

/** El CSV subido: lo que propuso la API y la tabla leída en el navegador, para asignar columnas a mano. */
type ArchivoSubido = { nombre: string; leidas: number; mapeo: MapeoPropuesto; tabla: string[][] | null };

type Disponible = { prueba: EstadoDatosDePrueba | null; plantilla: PlantillaImportacion | null; metodos: MetodoDeCarga[] };

const ICONO: Record<MetodoDeCarga, ReactNode> = {
  ia: <Sparkles className="h-5 w-5" />,
  csv: <FileSpreadsheet className="h-5 w-5" />,
  fotos: <Camera className="h-5 w-5" />,
  despues: <Clock className="h-5 w-5" />,
};

function tituloDelMetodo(m: MetodoDeCarga): string {
  return { ia: "Generar con IA", csv: "Subir un archivo (CSV)", fotos: "Desde fotos", despues: "Lo hago después" }[m];
}

function ayudaDelMetodo(m: MetodoDeCarga, varios: string): string {
  if (m === "ia") return `Crea ${varios} de ejemplo según la frase de tu negocio. Solo en pruebas.`;
  if (m === "csv") return "Tu lista con tus columnas. Reconocemos las conocidas y revisas antes de cargar.";
  if (m === "fotos") return "Una foto por producto: la IA propone nombre, categoría y precio. Cuesta créditos y te decimos cuántos antes.";
  return `Tu agente responde sin ${varios} por ahora. Los cargas después desde su ficha.`;
}

/**
 * Estación 4 · Datos para probar de la ruta (HU-UX-30, tableros `E4` variante `guiada` y `E4-M-nuevo`): la carga
 * guiada, una pregunta a la vez, para `ListaDePreguntas`. Es un hook porque la estación lleva estado propio
 * (lo que la API ofrece, el archivo, las fotos y lo cargado) y lo conserva si el dueño va y vuelve:
 * 1. «¿Cómo le damos {productos} para probar?»: solo las formas que la API ofrece para este agente y este
 *    entorno, y siempre «Lo hago después», que termina la estación;
 * 2. «Sube tu archivo» o «Sube las fotos de tus productos» (CSV y fotos), o «Genera {productos} de ejemplo»
 *    (IA, que escribe al generar: no hay precarga que revisar);
 * 3. «Revisa lo que vamos a cargar»: la precarga editable, quitar filas y confirmar (CSV y fotos);
 * 4. «Pruébalo con tus {productos}»: lo cargado, que el celular usa en sus frases y respuestas.
 *
 * Cada pregunta deja seguir solo cuando su acción terminó. «Opciones avanzadas» (dueño, 2026-11-26): la plantilla
 * CSV, asignar columnas a mano, el costo de las fotos y ver y borrar lo cargado. `sinEnlaces` (bienvenida): lo que
 * sacaría del recorrido va como texto.
 */
export function useDatosParaProbar({
  agenteId,
  tipo,
  activo,
  sinEnlaces = false,
  onCargados,
}: {
  agenteId: string;
  tipo: TipoDeNegocio | null;
  /** Se pide a la API solo al llegar a la estación (y una vez). */
  activo: boolean;
  sinEnlaces?: boolean;
  /** Lo cargado, para el celular y el resumen de la estación 5. */
  onCargados: (registros: RegistroDePrueba[]) => void;
}) {
  const confirm = useConfirm();
  const deTipo = tipo ?? "ventas";
  const { varios } = LO_DEL_TIPO[deTipo];
  const [disponible, setDisponible] = useState<Disponible | null>(null);
  const [metodo, setMetodo] = useState<MetodoDeCarga>("despues");
  const [abierta, setAbierta] = useState(0);
  const [archivo, setArchivo] = useState<ArchivoSubido | null>(null);
  const [asignacion, setAsignacion] = useState<AsignacionManual>({});
  const [filas, setFilas] = useState<FilaEditable[]>([]);
  // Cambia cuando las filas se rehacen desde afuera de la precarga (columnas a mano): la revisión vuelve a empezar.
  const [versionDeFilas, setVersionDeFilas] = useState(0);
  const [fotos, setFotos] = useState<File[]>([]);
  const [cotizacion, setCotizacion] = useState<CotizacionFotos | null>(null);
  const [avance, setAvance] = useState<{ hechas: number; total: number } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<Hecho | null>(null);
  // `null`: la API de registros no existe aquí (fuera de test); entonces lo cargado es lo que se acaba de importar.
  const [registros, setRegistros] = useState<RegistroDePrueba[] | null>(null);
  const [locales, setLocales] = useState<RegistroDePrueba[]>([]);
  const [costoPorFoto, setCostoPorFoto] = useState<CotizacionFotos | null>(null);
  const [borrando, setBorrando] = useState<"generado" | "importado" | null>(null);

  const cargados = registros && registros.length > 0 ? registros : locales;
  useEffect(() => {
    onCargados(cargados);
    // `onCargados` es un aviso: no se repite si cambia la función, solo si cambia lo cargado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargados]);

  async function refrescarRegistros() {
    const r = await leerJson<RegistrosDePrueba>(`/api/agentes/${agenteId}/datos-de-prueba/registros`);
    setRegistros(r.ok && Array.isArray(r.data?.registros) ? r.data.registros : null);
  }

  // Se pide una vez, al llegar a la estación; después lo conserva aunque el dueño vaya y vuelva.
  const yaDisponible = disponible !== null;
  useEffect(() => {
    if (!activo || yaDisponible) return;
    let vivo = true;
    void Promise.all([
      leerJson<EstadoDatosDePrueba>(`/api/agentes/${agenteId}/datos-de-prueba`),
      leerJson<EstadoImportacion>(`/api/agentes/${agenteId}/importar-datos`),
      leerJson<RegistrosDePrueba>(`/api/agentes/${agenteId}/datos-de-prueba/registros`),
    ]).then(([p, i, r]) => {
      if (!vivo) return;
      // Un 404 quiere decir que la forma no existe aquí (p. ej. generar fuera de test): no se ofrece.
      const prueba = p.ok && p.data?.disponible ? p.data : null;
      const plantilla = i.ok && i.data?.disponible && i.data.plantilla ? i.data.plantilla : null;
      const metodos = metodosDisponibles(prueba, plantilla);
      setDisponible({ prueba, plantilla, metodos });
      setMetodo(metodoRecomendado(metodos));
      setRegistros(r.ok && Array.isArray(r.data?.registros) ? r.data.registros : null);
      // El costo por foto, fijo en «Opciones avanzadas»: la cotización de una foto no cobra.
      if (plantilla?.importa_fotos) void cotizarFotos(agenteId, 1).then((c) => c.ok && setCostoPorFoto(c.data));
    });
    return () => {
      vivo = false;
    };
  }, [activo, agenteId, yaDisponible]);

  const preguntasDeCarga = preguntasDelMetodo(metodo);
  const indiceDe = (p: PreguntaDeCarga) => preguntasDeCarga.indexOf(p);

  function elegir(m: MetodoDeCarga) {
    if (m === metodo) return;
    setMetodo(m);
    setError(null);
    setHecho(null);
    // Cada forma empieza su propia carga (como al cambiar de CSV a fotos en Personalizar).
    setArchivo(null);
    setFilas([]);
    setFotos([]);
    setCotizacion(null);
  }

  async function generar() {
    setError(null);
    setTrabajando(true);
    const r = await llamarDatosDePrueba<LoteGenerado>(agenteId, "POST");
    setTrabajando(false);
    if (!r.ok) {
      setError(
        r.code === "descripcion_requerida"
          ? "Falta la frase de tu negocio: escríbela en Configuración › Identidad y vuelve a intentarlo."
          : r.error,
      );
      return;
    }
    setHecho({ resumen: resumenDelLote(r.data), corto: conteoLegible(r.data.conteos) });
    await refrescarRegistros();
  }

  async function alElegirCsv(elegido: File | null) {
    setError(null);
    setArchivo(null);
    setFilas([]);
    setHecho(null);
    if (!elegido) return;
    setTrabajando(true);
    const [r, tabla] = await Promise.all([
      mapearArchivo(agenteId, elegido),
      // La tabla se lee aquí solo para asignar columnas a mano; si no se puede, esa opción no aparece.
      textoDelArchivo(elegido)
        .then(leerCsv)
        .catch(() => null),
    ]);
    setTrabajando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    if (r.data.columnas_faltantes.length > 0) {
      setError(
        `No encontramos en tu archivo: ${r.data.columnas_faltantes.join(", ")}. Asígnalas en «Opciones avanzadas» o completa las celdas antes de confirmar.`,
      );
    }
    setArchivo({ nombre: elegido.name, leidas: r.data.filas.length, mapeo: r.data, tabla });
    setAsignacion(asignacionDelMapeo(r.data.mapeo));
    setFilas(filasDesdeMapeo(r.data));
    setVersionDeFilas((v) => v + 1);
  }

  async function alElegirFotos(elegidas: File[]) {
    setError(null);
    const todas = [...fotos, ...elegidas].slice(0, MAX_FOTOS);
    if (fotos.length + elegidas.length > MAX_FOTOS) setError(`Se toman las primeras ${MAX_FOTOS} fotos de esta tanda.`);
    setFotos(todas);
    setCotizacion(null);
    const r = await cotizarFotos(agenteId, todas.length);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setCotizacion(r.data);
  }

  async function reconocer() {
    setError(null);
    setHecho(null);
    setTrabajando(true);
    setAvance({ hechas: 0, total: fotos.length });
    const r = await reconocerFotos(agenteId, fotos, filas, (actuales, hechas) => {
      setFilas(actuales);
      setAvance({ hechas, total: fotos.length });
    });
    setError(r.error);
    setFotos([]);
    setCotizacion(null);
    setTrabajando(false);
  }

  async function importado(h: ImportacionHecha, confirmadas: FilaEditable[]) {
    const resumen = resumenDeImportacionDelCatalogo(h);
    setHecho({ resumen, corto: resumen.replace(/^Listo: /, "").replace(/\.$/, "") });
    setLocales(registrosDesdeFilas(confirmadas, h.plantilla));
    await refrescarRegistros();
  }

  function usarColumnas() {
    if (!archivo?.tabla) return;
    setFilas(filasConAsignacion(archivo.tabla, asignacion, archivo.mapeo.mapeo));
    setVersionDeFilas((v) => v + 1);
    setHecho(null);
    setError(null);
    // Con columnas nuevas hay que revisar otra vez: se vuelve a la revisión si ya se había pasado.
    setAbierta((a) => Math.min(a, indiceDe("revision")));
  }

  async function borrar(que: "generado" | "importado") {
    const ok = await confirm({
      title: que === "generado" ? "¿Borrar lo generado?" : "¿Borrar lo importado?",
      description:
        que === "generado"
          ? `Se retiran todos los datos de prueba que se generaron para este agente. Lo que importaste o creaste a mano no cambia.`
          : `Se retira todo lo que se importó para este agente. Lo generado y lo creado a mano no cambian.`,
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    setBorrando(que);
    const r = que === "generado" ? await llamarDatosDePrueba<unknown>(agenteId, "DELETE") : await borrarImportacion(agenteId);
    setBorrando(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setLocales([]);
    setHecho(null);
    // Lo cargado ya no está: la estación vuelve a la carga (la primera pregunta queda respondida).
    setAbierta((a) => Math.min(a, 1));
    await refrescarRegistros();
  }

  const enlace = (href: string, texto: string) =>
    sinEnlaces ? (
      <strong className="font-medium text-headline">{texto}</strong>
    ) : (
      <Link className="text-link underline" href={href} target="_blank">
        {texto}
      </Link>
    );

  if (!disponible) {
    return {
      listo: false,
      preguntas: [] as PreguntaDeLaLista[],
      abierta: 0,
      onAbrir: setAbierta,
      faltan: 1,
      avanzadas: null,
    };
  }

  const { prueba, plantilla, metodos } = disponible;
  const soloDespues = metodos.length === 1;
  const recomendado = metodoRecomendado(metodos);
  const delTipo = cargadosDelTipo(deTipo, cargados);
  const metodoElegido = metodo;

  const pMetodo: PreguntaDeLaLista = {
    id: "metodo",
    titulo: `¿Cómo le damos ${varios} para probar?`,
    ayuda: soloDespues
      ? "Para este agente no hay datos que cargar desde aquí. Puedes probarlo igual y cargarlos después."
      : prueba
        ? "Con datos de ejemplo ves cómo responde antes de publicar. Lo que cargues aquí se queda en tu entorno de pruebas."
        : "Con tus datos ves cómo responde antes de publicar.",
    respuesta: tituloDelMetodo(metodoElegido),
    contenido: (
      <div className="flex flex-col gap-3">
        <GrupoDeOpciones unica titulo={`Cómo cargar los ${varios}`} tituloOculto className="grid gap-3 sm:grid-cols-2">
          {metodos.map((m) => (
            <TarjetaElegible
              key={m}
              nombre="metodo-de-carga"
              valor={m}
              elegida={metodoElegido === m}
              onElegir={() => elegir(m)}
              titulo={tituloDelMetodo(m)}
              ayuda={ayudaDelMetodo(m, varios)}
              icono={ICONO[m]}
              baldosa
              etiqueta={!soloDespues && m === recomendado ? "Recomendado" : undefined}
              className="w-full"
            />
          ))}
        </GrupoDeOpciones>
        {delTipo.length > 0 && (
          <p className="text-sm text-text-soft">
            Ya tiene {cuantos(deTipo, delTipo.length)} para probar. Los ves y los borras en «Opciones avanzadas».
          </p>
        )}
      </div>
    ),
  };

  const visibles = plantilla ? columnasVisibles(plantilla) : [];
  const sinAsignar = archivo ? cabecerasSinAsignar(archivo.mapeo.mapeo) : [];
  const pArchivo: PreguntaDeLaLista =
    metodoElegido === "fotos"
      ? {
          id: "archivo",
          titulo: "Sube las fotos de tus productos",
          ayuda: "Te mostramos lo que la IA propone para cada foto antes de cargar nada.",
          respuesta: `${filas.length} ${filas.length === 1 ? "foto reconocida" : "fotos reconocidas"}`,
          puedeContinuar: filas.length > 0 && !trabajando,
          contenido: (
            <div className="flex flex-col gap-3">
              <Dropzone
                accept={TIPOS_DE_FOTO}
                maxBytes={MAX_BYTES_FOTO}
                disabled={trabajando}
                label="Arrastra, pega o elige fotos de tus productos"
                hint={`PNG, JPEG o WebP de hasta 5 MB. Hasta ${MAX_FOTOS} por tanda; una foto es un producto.`}
                onFiles={(f) => void alElegirFotos(f)}
                onReject={(m) => setError(m)}
              />
              {fotos.length > 0 && (
                <div className="flex flex-col gap-2 rounded-md border border-border-soft p-3" aria-live="polite">
                  <p className="text-sm text-headline">
                    {fotos.length} {fotos.length === 1 ? "foto elegida" : "fotos elegidas"}
                  </p>
                  {cotizacion ? (
                    <>
                      <p className="text-sm text-body">{textoDeCotizacion(cotizacion)}</p>
                      {!cotizacion.alcanza && (
                        <p className="text-sm text-status-warning-fg">
                          No te alcanza el crédito del mes para todas. Quita fotos o revisa tu {enlace("/plan", "plan y consumo")}.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-text-soft">Calculando cuántos créditos cuesta…</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="accent"
                      onClick={() => void reconocer()}
                      loading={trabajando}
                      disabled={trabajando || !cotizacion || !cotizacion.alcanza}
                    >
                      {cotizacion
                        ? `Reconocer ${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"} por ${cotizacion.creditos} ${cotizacion.creditos === 1 ? "crédito" : "créditos"}`
                        : "Reconocer fotos"}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={trabajando}
                      onClick={() => {
                        setFotos([]);
                        setCotizacion(null);
                      }}
                    >
                      Quitar las fotos
                    </Button>
                  </div>
                </div>
              )}
              {avance && trabajando && (
                <p className="text-sm text-text-soft" aria-live="polite">
                  Reconociendo {Math.min(avance.hechas + 1, avance.total)} de {avance.total}…
                </p>
              )}
              {filas.length > 0 && !trabajando && (
                <p role="status" className="text-sm text-body">
                  {filas.length} {filas.length === 1 ? "foto reconocida" : "fotos reconocidas"}: las revisas en la siguiente pregunta.
                </p>
              )}
              <FormFeedback error={error} />
            </div>
          ),
        }
      : {
          id: "archivo",
          titulo: "Sube tu archivo",
          ayuda: "La primera fila lleva los nombres de las columnas.",
          respuesta: archivo ? `${archivo.nombre} · ${archivo.leidas} ${archivo.leidas === 1 ? "fila" : "filas"}` : undefined,
          puedeContinuar: filas.length > 0 && !trabajando,
          contenido: (
            <div className="flex flex-col gap-3">
              <Field
                label="Tu archivo CSV"
                htmlFor={`archivo-de-prueba-${agenteId}`}
                help={
                  plantilla
                    ? `Hasta ${plantilla.tope_filas} filas y ${Math.round(plantilla.tope_bytes / 1_000_000)} MB, separado por comas o punto y coma. Desde Excel: «Guardar como» CSV.`
                    : undefined
                }
              >
                <Input
                  id={`archivo-de-prueba-${agenteId}`}
                  type="file"
                  accept=".csv,text/csv"
                  disabled={trabajando}
                  onChange={(e) => void alElegirCsv(e.target.files?.[0] ?? null)}
                />
              </Field>
              {visibles.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-text-soft">
                  <span>Reconocemos columnas como:</span>
                  {visibles.slice(0, 5).map((c) => (
                    <code key={c} className="rounded-sm bg-surface-2 px-2 py-0.5 font-mono text-xs text-headline">
                      {c}
                    </code>
                  ))}
                </div>
              )}
              {trabajando && <p className="text-sm text-text-soft">Leyendo tu archivo…</p>}
              {archivo && avisoDeIa(archivo.mapeo) && <p className="text-sm text-body">{avisoDeIa(archivo.mapeo)}</p>}
              {sinAsignar.length > 0 && (
                <p className="text-sm text-body">
                  No reconocimos {sinAsignar.map((c) => `«${c}»`).join(", ")}: no se carga. Si es una columna que sirve,
                  asígnala en «Opciones avanzadas».
                </p>
              )}
              {archivo && filas.length > 0 && (
                <p role="status" className="text-sm text-body">
                  Leímos {archivo.leidas} {archivo.leidas === 1 ? "fila" : "filas"}: las revisas en la siguiente pregunta.
                </p>
              )}
              <FormFeedback error={error} />
            </div>
          ),
        };

  const pGenerar: PreguntaDeLaLista = {
    id: "generar",
    titulo: `Genera ${varios} de ejemplo`,
    ayuda: "La IA los crea según la frase de tu negocio. Si ya tenía datos de prueba, se reemplazan por los nuevos.",
    respuesta: hecho?.corto,
    puedeContinuar: hecho !== null && !trabajando,
    contenido: (
      <div className="flex flex-col gap-3">
        {prueba?.falta_descripcion && (
          <p className="text-sm text-body">
            Para generar hace falta la frase de tu negocio. Escríbela en{" "}
            {enlace(IR_A_IDENTIDAD, "Configuración › Identidad")} y vuelve a intentarlo.
          </p>
        )}
        {hecho && (
          <p role="status" className="text-sm text-body">
            {hecho.resumen}
          </p>
        )}
        {hecho && delTipo.length > 0 && <ListaDeCargados registros={delTipo} />}
        <div>
          <Button
            variant={hecho ? "outline" : "accent"}
            onClick={() => void generar()}
            loading={trabajando}
            disabled={trabajando}
          >
            <Sparkles aria-hidden /> {trabajando ? "Generando…" : hecho ? `Generar otros ${varios}` : `Generar ${varios}`}
          </Button>
        </div>
        <FormFeedback error={error} />
      </div>
    ),
  };

  const pRevision: PreguntaDeLaLista = {
    id: "revision",
    titulo: "Revisa lo que vamos a cargar",
    ayuda: "Corrige lo que haga falta, quita las filas que no quieras y confirma la carga.",
    respuesta: hecho?.corto,
    puedeContinuar: hecho !== null,
    contenido: hecho ? (
      <p role="status" className="text-sm text-body">
        {hecho.resumen}
      </p>
    ) : plantilla && filas.length > 0 ? (
      <PrecargaDeCatalogo
        key={versionDeFilas}
        agenteId={agenteId}
        plantilla={plantilla}
        filas={filas}
        onFilas={setFilas}
        onImportado={(h, f) => void importado(h, f)}
        ocupado={trabajando}
      />
    ) : (
      <p className="text-sm text-body">Ya no quedan filas: vuelve a subir el archivo o las fotos.</p>
    ),
  };

  const pPrueba: PreguntaDeLaLista = {
    id: "prueba",
    titulo: `Pruébalo con tus ${varios}`,
    ayuda: "Toca una pregunta en el celular: te responde con lo que cargaste.",
    respuesta: delTipo.length > 0 ? `${cuantos(deTipo, delTipo.length)} · listo para probar` : "Listo para probar",
    contenido:
      delTipo.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-headline">Lo que tiene para responder:</p>
          <ListaDeCargados registros={delTipo} />
        </div>
      ) : (
        <p className="text-sm text-body">Ya quedó cargado. El celular lo usa en sus respuestas.</p>
      ),
  };

  const porPregunta: Record<PreguntaDeCarga, PreguntaDeLaLista> = {
    metodo: pMetodo,
    archivo: pArchivo,
    generar: pGenerar,
    revision: pRevision,
    prueba: pPrueba,
  };
  const preguntas = preguntasDeCarga.map((p) => porPregunta[p]);
  const enLista = Math.min(abierta, preguntas.length);

  // «Opciones avanzadas» (dueño, 2026-11-26): lo que haya para este agente.
  const partes = [
    plantilla && "plantilla CSV",
    plantilla && "columnas a mano",
    plantilla?.importa_fotos && "costo de las fotos",
    registros !== null && "lo ya cargado",
  ].filter((x): x is string => Boolean(x));
  const descripcion = partes.length
    ? `${partes.slice(0, -1).join(", ")}${partes.length > 1 ? " y " : ""}${partes[partes.length - 1]}.`.replace(/^./, (c) => c.toUpperCase())
    : "";
  const origenes = origenesCargados(registros ?? []);

  const avanzadas: { descripcion: string; contenido: ReactNode } | null = partes.length
    ? {
        descripcion,
        contenido: (
          <>
            {plantilla && (
              <section aria-labelledby="carga-plantilla" className="flex flex-col gap-2">
                <h3 id="carga-plantilla" className="font-display text-base font-semibold text-headline">
                  Plantilla CSV
                </h3>
                <p className="text-sm text-body">
                  Descárgala, llénala con tus {varios} y súbela en «Subir un archivo (CSV)». Estas son sus columnas (con *
                  las obligatorias):
                </p>
                <ul className="flex flex-wrap gap-1.5" aria-label="Columnas de la plantilla">
                  {plantilla.columnas
                    .filter((c) => visibles.includes(c.nombre))
                    .map((c) => (
                      <li key={c.nombre}>
                        <code className="rounded-sm bg-surface-2 px-2 py-0.5 font-mono text-xs text-headline">
                          {c.nombre}
                          {c.obligatoria ? " *" : ""}
                        </code>
                      </li>
                    ))}
                </ul>
                <div>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/api/agentes/${agenteId}/importar-datos/plantilla.csv`} download={`plantilla-${plantilla.id}.csv`}>
                      <Download aria-hidden /> Descargar la plantilla
                    </a>
                  </Button>
                </div>
              </section>
            )}
            {plantilla && (
              <section aria-labelledby="carga-columnas" className="flex flex-col gap-2">
                <h3 id="carga-columnas" className="font-display text-base font-semibold text-headline">
                  Asignar columnas a mano
                </h3>
                {archivo?.tabla ? (
                  <ColumnasAMano
                    mapeo={archivo.mapeo.mapeo}
                    columnas={visibles}
                    asignacion={asignacion}
                    onAsignar={(cabecera, columna) => setAsignacion((a) => ({ ...a, [cabecera]: columna }))}
                    faltantes={obligatoriasSinColumna(plantilla, asignacion)}
                    onUsar={usarColumnas}
                  />
                ) : (
                  <p className="text-sm text-body">
                    Sube tu archivo en «Subir un archivo (CSV)» y aquí eliges a qué columna va cada una de las suyas, si no
                    la reconocimos.
                  </p>
                )}
              </section>
            )}
            {plantilla?.importa_fotos && (
              <section aria-labelledby="carga-costo" className="flex flex-col gap-2">
                <h3 id="carga-costo" className="font-display text-base font-semibold text-headline">
                  Costo de la carga con fotos
                </h3>
                <p className="text-sm text-body">
                  {costoPorFoto ? textoDelCostoPorFoto(costoPorFoto) : "Reconocer fotos cuesta créditos: te decimos cuántos antes."}
                </p>
              </section>
            )}
            {registros !== null && (
              <section aria-labelledby="carga-lo-cargado" className="flex flex-col gap-2">
                <h3 id="carga-lo-cargado" className="font-display text-base font-semibold text-headline">
                  Lo ya cargado
                </h3>
                {registros.length === 0 ? (
                  <p className="text-sm text-body">Todavía no tiene datos para probar.</p>
                ) : (
                  <ul
                    aria-label="Lo ya cargado"
                    className="flex max-h-60 flex-col divide-y divide-border-soft overflow-y-auto rounded-md border border-border-soft"
                  >
                    {registros.map((r, i) => (
                      <li key={`${r.tipo}-${r.nombre}-${i}`} className="flex flex-wrap items-baseline gap-x-2 px-3 py-2 text-sm">
                        <span className="text-headline">{r.nombre}</span>
                        {r.detalle && <span className="text-text-soft">· {r.detalle}</span>}
                        <span className="ml-auto text-xs text-text-soft">{r.origen === "importacion" ? "Importado" : "Generado"}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(origenes.generado || origenes.importado) && (
                  <div className="flex flex-wrap gap-2">
                    {origenes.generado && (
                      <Button variant="outline" size="sm" onClick={() => void borrar("generado")} loading={borrando === "generado"} disabled={borrando !== null}>
                        <Trash2 aria-hidden /> Borrar lo generado
                      </Button>
                    )}
                    {origenes.importado && (
                      <Button variant="outline" size="sm" onClick={() => void borrar("importado")} loading={borrando === "importado"} disabled={borrando !== null}>
                        <Trash2 aria-hidden /> Borrar lo importado
                      </Button>
                    )}
                  </div>
                )}
                {abierta === 0 && <FormFeedback error={error} />}
              </section>
            )}
          </>
        ),
      }
    : null;

  return {
    listo: true,
    preguntas,
    abierta: enLista,
    onAbrir: setAbierta,
    faltan: preguntas.length - enLista,
    avanzadas,
  };
}

/** Lo cargado, como chips con su detalle (precio, duración…). */
function ListaDeCargados({ registros }: { registros: readonly RegistroDePrueba[] }) {
  const vistos = registros.slice(0, 8);
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Lo cargado">
      {vistos.map((r, i) => (
        <li
          key={`${r.nombre}-${i}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-focus/45 bg-focus/10 px-3.5 text-sm text-headline"
        >
          <span>{r.nombre}</span>
          {r.detalle && <span className="text-text-soft tabular-nums">{r.detalle}</span>}
        </li>
      ))}
      {registros.length > vistos.length && (
        <li className="inline-flex min-h-10 items-center px-1 text-sm text-text-soft">y {registros.length - vistos.length} más</li>
      )}
    </ul>
  );
}

/** «Asignar columnas a mano»: cada cabecera del archivo con su columna de la plantilla. */
function ColumnasAMano({
  mapeo,
  columnas,
  asignacion,
  onAsignar,
  faltantes,
  onUsar,
}: {
  mapeo: MapeoPropuesto["mapeo"];
  columnas: string[];
  asignacion: AsignacionManual;
  onAsignar: (cabecera: string, columna: string | null) => void;
  faltantes: string[];
  onUsar: () => void;
}) {
  const propuesta = asignacionDelMapeo(mapeo);
  const cambio = mapeo.some((a) => (asignacion[a.cabecera] ?? null) !== (propuesta[a.cabecera] ?? null));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-body">Elige a qué columna va cada una de tu archivo. «No se usa» la deja fuera.</p>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {mapeo.map((a, i) => {
          const id = `columna-a-mano-${i}`;
          return (
            <div key={a.cabecera} className="flex flex-col gap-1">
              <label htmlFor={id} className="text-sm text-headline">
                «{a.cabecera}»
                {a.origen === "ninguno" && <span className="text-text-soft"> · no la reconocimos</span>}
                {a.origen === "ia" && <span className="text-text-soft"> · la propuso la IA</span>}
              </label>
              <Select id={id} value={asignacion[a.cabecera] ?? ""} onChange={(e) => onAsignar(a.cabecera, e.target.value || null)}>
                <option value="">No se usa</option>
                {columnas.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          );
        })}
      </div>
      {faltantes.length > 0 && (
        <p className="text-sm text-status-warning-fg">Ninguna columna llena {faltantes.map((c) => `«${c}»`).join(", ")}: complétalas en la revisión.</p>
      )}
      <div>
        <Button variant="outline" size="sm" onClick={onUsar} disabled={!cambio}>
          Usar estas columnas
        </Button>
      </div>
    </div>
  );
}
