"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, FileSpreadsheet, Sparkles } from "lucide-react";

import { ImportarCatalogo } from "@/components/domain/importar-catalogo";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import type {
  EstadoDatosDePrueba,
  EstadoImportacion,
  ImportacionHecha,
  LoteGenerado,
  RegistroDePrueba,
} from "@/lib/api/types";
import { leerJson, registrosDesdeFilas, resumenDeImportacionDelCatalogo, type FilaEditable } from "@/lib/carga-de-datos";
import { IR_A_IDENTIDAD, llamarDatosDePrueba, resumenDelLote } from "@/lib/datos-de-prueba";
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

  function importado(hecha: ImportacionHecha, confirmadas: FilaEditable[]) {
    const resumen = resumenDeImportacionDelCatalogo(hecha);
    toast.success(resumen);
    onCargado({ registros: registrosDesdeFilas(confirmadas), resumen });
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
              onClick={() => {
                setModo(o.id);
                setError(null);
              }}
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
          <FormFeedback error={error} />
        </div>
      )}

      {(modo === "csv" || modo === "fotos") && plantilla && (
        // `key`: al cambiar de CSV a fotos (o al revés) se empieza una precarga nueva.
        <ImportarCatalogo key={modo} agenteId={agenteId} plantilla={plantilla} modo={modo} onImportado={importado} />
      )}
    </div>
  );
}
