"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, FileSpreadsheet, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PrecargaDeCatalogo } from "@/app/(app)/agentes/nuevo/_components/precarga-de-catalogo";
import type {
  CotizacionFotos,
  EstadoDatosDePrueba,
  EstadoImportacion,
  ImportacionHecha,
  LoteGenerado,
  RegistroDePrueba,
} from "@/lib/api/types";
import {
  MAX_BYTES_FOTO,
  MAX_FOTOS,
  TIPOS_DE_FOTO,
  avisoDeIa,
  cotizarFotos,
  filaDesdeFoto,
  filasDesdeMapeo,
  leerJson,
  mapearArchivo,
  registrosDesdeFilas,
  siguienteNumero,
  subirFoto,
  textoDeCotizacion,
  type FilaEditable,
} from "@/lib/carga-de-datos";
import { IR_A_IDENTIDAD, llamarDatosDePrueba, resumenDelLote } from "@/lib/datos-de-prueba";
import { esLimiteDePlan } from "@/lib/plan-limite";
import { toast } from "@/lib/toast-store";

type Modo = "generar" | "csv" | "fotos" | null;

/** Lo que el paso le entrega a «Lo cargado»: la lista local, por si la API de registros no existe (producción). */
export type Cargado = { registros: RegistroDePrueba[]; resumen: string };

/**
 * Paso «Datos» del asistente (SPEC-45): con el borrador ya creado, el dueño genera datos de prueba (solo en test,
 * HU-QA-16), importa su catálogo desde un CSV cualquiera (HU-COM-19) o desde fotos (HU-COM-20), u omite. Cada
 * opción aparece solo si la API la ofrece para este agente y este entorno.
 */
export function PasoDatos({ agenteId, onCargado }: { agenteId: string; onCargado: (c: Cargado) => void }) {
  const [prueba, setPrueba] = useState<EstadoDatosDePrueba | null>(null);
  const [importacion, setImportacion] = useState<EstadoImportacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState<Modo>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [filas, setFilas] = useState<FilaEditable[]>([]);
  const [avisoIa, setAvisoIa] = useState<string | null>(null);
  const [fotos, setFotos] = useState<File[]>([]);
  const [cotizacion, setCotizacion] = useState<CotizacionFotos | null>(null);
  const [avance, setAvance] = useState<{ hechas: number; total: number } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    void Promise.all([
      leerJson<EstadoDatosDePrueba>(`/api/agentes/${agenteId}/datos-de-prueba`),
      leerJson<EstadoImportacion>(`/api/agentes/${agenteId}/importar-datos`),
    ]).then(([p, i]) => {
      if (!vivo) return;
      // Un 404 quiere decir que la opción no existe aquí (p. ej. generar fuera de test): se oculta.
      setPrueba(p.ok && p.data.disponible ? p.data : null);
      setImportacion(i.ok && i.data.disponible && i.data.plantilla ? i.data : null);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, [agenteId]);

  const plantilla = importacion?.plantilla ?? null;

  function elegir(m: Modo) {
    setModo(m);
    setError(null);
    setFilas([]);
    setAvisoIa(null);
    setFotos([]);
    setCotizacion(null);
    setAvance(null);
  }

  async function generar() {
    setError(null);
    setTrabajando(true);
    const r = await llamarDatosDePrueba<LoteGenerado>(agenteId, "POST");
    setTrabajando(false);
    if (!r.ok) {
      setError(
        r.code === "descripcion_requerida"
          ? "Falta la descripción de tu negocio: escríbela en Configuración › Identidad y vuelve a intentarlo."
          : r.error,
      );
      return;
    }
    onCargado({ registros: [], resumen: resumenDelLote(r.data) });
  }

  async function alElegirCsv(archivo: File | null) {
    setError(null);
    setFilas([]);
    setAvisoIa(null);
    if (!archivo) return;
    setTrabajando(true);
    const r = await mapearArchivo(agenteId, archivo);
    setTrabajando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    if (r.data.columnas_faltantes.length > 0) {
      setError(
        `No encontramos en tu archivo: ${r.data.columnas_faltantes.join(", ")}. Agrega esas columnas o completa las celdas antes de confirmar.`,
      );
    }
    setAvisoIa(avisoDeIa(r.data));
    setFilas(filasDesdeMapeo(r.data));
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
    setTrabajando(true);
    let actuales = filas;
    let hechas = 0;
    setAvance({ hechas, total: fotos.length });
    for (const foto of fotos) {
      const r = await subirFoto(agenteId, foto);
      if (!r.ok) {
        setError(
          esLimiteDePlan(r.code) || r.code === "plan_limit_creditos"
            ? `No te alcanza el crédito del mes: se reconocieron ${hechas} de ${fotos.length} fotos. Puedes confirmar las que ya están.`
            : `«${foto.name}»: ${r.error}`,
        );
        if (esLimiteDePlan(r.code) || r.code === "plan_limit_creditos") break;
        continue;
      }
      actuales = [...actuales, filaDesdeFoto(r.data, siguienteNumero(actuales))];
      hechas += 1;
      setFilas(actuales);
      setAvance({ hechas, total: fotos.length });
    }
    setFotos([]);
    setCotizacion(null);
    setTrabajando(false);
  }

  function importado(hecha: ImportacionHecha, confirmadas: FilaEditable[]) {
    const n = hecha.creadas;
    const partes = [`Listo: ${n} ${n === 1 ? "producto importado" : "productos importados"}`];
    if (hecha.existentes > 0) partes.push(`${hecha.existentes} ya ${hecha.existentes === 1 ? "existía" : "existían"}`);
    toast.success(`${partes.join("; ")}.`);
    onCargado({ registros: registrosDesdeFilas(confirmadas), resumen: `${partes.join("; ")}.` });
  }

  if (cargando) return <p className="text-sm text-text-soft">Revisando qué puedes cargar…</p>;

  const opciones: { id: Exclude<Modo, null>; titulo: string; texto: string; icono: React.ReactNode }[] = [];
  if (prueba) {
    opciones.push({
      id: "generar",
      titulo: "Generar datos de prueba",
      texto: "La IA crea datos de ejemplo según la descripción de tu negocio. Solo en el entorno de pruebas.",
      icono: <Sparkles aria-hidden />,
    });
  }
  if (plantilla) {
    opciones.push({
      id: "csv",
      titulo: "Importar desde un archivo (CSV)",
      texto: "Sube tu lista con tus propias columnas: las reconocemos y la IA propone las que no. Revisas antes de cargar.",
      icono: <FileSpreadsheet aria-hidden />,
    });
  }
  if (plantilla?.importa_fotos) {
    opciones.push({
      id: "fotos",
      titulo: "Importar desde fotos",
      texto: "Una foto por producto: la IA propone nombre, categoría y precio si se ve. Cuesta créditos y te decimos cuántos antes.",
      icono: <Camera aria-hidden />,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Tu agente quedó creado como borrador. Cárgale datos para probarlo, o sigue sin cargar nada y lo haces después.
      </p>

      {opciones.length === 0 ? (
        <p className="text-sm text-body">Este agente no tiene datos para cargar desde aquí.</p>
      ) : (
        <div role="radiogroup" aria-label="Cómo cargar los datos" className="grid gap-3 sm:grid-cols-2">
          {opciones.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={modo === o.id}
              disabled={trabajando}
              onClick={() => elegir(o.id)}
              className={`flex flex-col gap-1 rounded-lg border p-3 text-left ${
                modo === o.id ? "border-border-strong bg-surface-muted" : "border-border-soft bg-surface"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-headline [&_svg]:size-4">
                {o.icono} {o.titulo}
              </span>
              <span className="text-xs text-text-soft">{o.texto}</span>
            </button>
          ))}
        </div>
      )}

      {modo === "generar" && prueba && (
        <div className="flex flex-col gap-2">
          {prueba.falta_descripcion ? (
            <p className="text-sm text-body">
              Para generar hace falta la descripción de tu negocio.{" "}
              <Link className="text-link underline" href={IR_A_IDENTIDAD} target="_blank">
                Escríbela en Configuración › Identidad
              </Link>{" "}
              y vuelve a intentarlo.
            </p>
          ) : (
            prueba.lote && (
              <p className="text-sm text-text-soft">Ya tenía datos de prueba: se reemplazan por los nuevos.</p>
            )
          )}
          <div>
            <Button variant="accent" onClick={() => void generar()} loading={trabajando} disabled={trabajando}>
              <Sparkles aria-hidden /> {trabajando ? "Generando…" : "Generar datos de prueba"}
            </Button>
          </div>
        </div>
      )}

      {modo === "csv" && plantilla && (
        <div className="flex flex-col gap-3">
          <Field
            label="Tu archivo CSV"
            htmlFor="archivo-catalogo"
            help={`Hasta ${plantilla.tope_filas} filas y ${Math.round(plantilla.tope_bytes / 1_000_000)} MB, separado por comas o punto y coma. Desde Excel: «Guardar como» CSV.`}
          >
            <Input
              ref={entrada}
              id="archivo-catalogo"
              type="file"
              accept=".csv,text/csv"
              disabled={trabajando}
              onChange={(e) => void alElegirCsv(e.target.files?.[0] ?? null)}
            />
          </Field>
          {trabajando && filas.length === 0 && <p className="text-sm text-text-soft">Leyendo tu archivo…</p>}
          {avisoIa && <p className="text-sm text-body">{avisoIa}</p>}
        </div>
      )}

      {modo === "fotos" && plantilla && (
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
                      No te alcanza el crédito del mes para todas. Quita fotos o revisa tu{" "}
                      <Link className="text-link underline" href="/plan" target="_blank">
                        plan y consumo
                      </Link>
                      .
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
        </div>
      )}

      <FormFeedback error={error} />

      {(modo === "csv" || modo === "fotos") && plantilla && (
        <PrecargaDeCatalogo
          agenteId={agenteId}
          plantilla={plantilla}
          filas={filas}
          onFilas={setFilas}
          onImportado={importado}
          ocupado={trabajando}
        />
      )}
    </div>
  );
}
