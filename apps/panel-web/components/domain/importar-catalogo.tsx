"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { PrecargaDeCatalogo } from "@/components/domain/precarga-de-catalogo";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import type { CotizacionFotos, ImportacionHecha, PlantillaImportacion } from "@/lib/api/types";
import {
  MAX_BYTES_FOTO,
  MAX_FOTOS,
  TIPOS_DE_FOTO,
  avisoDeIa,
  cotizarFotos,
  filaDesdeFoto,
  filasDesdeMapeo,
  mapearArchivo,
  siguienteNumero,
  subirFoto,
  textoDeCotizacion,
  type FilaEditable,
} from "@/lib/carga-de-datos";
import { esLimiteDePlan } from "@/lib/plan-limite";

/**
 * Importar el catálogo desde un CSV cualquiera (HU-COM-19) o desde fotos (HU-COM-20), con la precarga editable.
 * Lo usan el paso «Datos» del asistente y Comercio › Productos (SPEC-45): el CSV se mapea con la IA y las fotos
 * se cotizan antes y se reconocen una por una, parando si se acaba el crédito sin perder lo reconocido.
 */
export function ImportarCatalogo({
  agenteId,
  plantilla,
  modo,
  onImportado,
}: {
  agenteId: string;
  plantilla: PlantillaImportacion;
  modo: "csv" | "fotos";
  onImportado: (hecha: ImportacionHecha, filas: FilaEditable[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [filas, setFilas] = useState<FilaEditable[]>([]);
  const [avisoIa, setAvisoIa] = useState<string | null>(null);
  const [fotos, setFotos] = useState<File[]>([]);
  const [cotizacion, setCotizacion] = useState<CotizacionFotos | null>(null);
  const [avance, setAvance] = useState<{ hechas: number; total: number } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

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
        const sinCredito = esLimiteDePlan(r.code) || r.code === "plan_limit_creditos";
        setError(
          sinCredito
            ? `No te alcanza el crédito del mes: se reconocieron ${hechas} de ${fotos.length} fotos. Puedes confirmar las que ya están.`
            : `«${foto.name}»: ${r.error}`,
        );
        if (sinCredito) break;
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

  return (
    <div className="flex flex-col gap-3">
      {modo === "csv" && (
        <>
          <Field
            label="Tu archivo CSV"
            htmlFor={`archivo-catalogo-${agenteId}`}
            help={`Hasta ${plantilla.tope_filas} filas y ${Math.round(plantilla.tope_bytes / 1_000_000)} MB, separado por comas o punto y coma. Desde Excel: «Guardar como» CSV.`}
          >
            <Input
              ref={entrada}
              id={`archivo-catalogo-${agenteId}`}
              type="file"
              accept=".csv,text/csv"
              disabled={trabajando}
              onChange={(e) => void alElegirCsv(e.target.files?.[0] ?? null)}
            />
          </Field>
          {trabajando && filas.length === 0 && <p className="text-sm text-text-soft">Leyendo tu archivo…</p>}
          {avisoIa && <p className="text-sm text-body">{avisoIa}</p>}
        </>
      )}

      {modo === "fotos" && (
        <>
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
        </>
      )}

      <FormFeedback error={error} />

      <PrecargaDeCatalogo
        agenteId={agenteId}
        plantilla={plantilla}
        filas={filas}
        onFilas={setFilas}
        onImportado={onImportado}
        ocupado={trabajando}
      />
    </div>
  );
}
