"use client";

import { useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportacionHecha, PlantillaImportacion, VistaPreviaImportacion } from "@/lib/api/types";
import {
  columnasVisibles,
  editarCelda,
  enviarPrecarga,
  erroresPorFila,
  quitarFila,
  type FilaEditable,
} from "@/lib/carga-de-datos";
import { resumenDeVistaPrevia } from "@/lib/importar-datos";

/**
 * Precarga del catálogo (SPEC-45, HU-COM-19/20): las filas propuestas desde un CSV o desde fotos, editables
 * celda por celda, con lo que propuso la IA marcado. «Revisar» pide la vista previa a la API sin escribir;
 * «Confirmar» importa y la API vuelve a validar todo (la precarga solo vive en el navegador).
 */
export function PrecargaDeCatalogo({
  agenteId,
  plantilla,
  filas,
  onFilas,
  onImportado,
  ocupado = false,
}: {
  agenteId: string;
  plantilla: PlantillaImportacion;
  filas: FilaEditable[];
  onFilas: (filas: FilaEditable[]) => void;
  onImportado: (hecha: ImportacionHecha, filas: FilaEditable[]) => void;
  /** Mientras se procesan fotos no se confirma. */
  ocupado?: boolean;
}) {
  const [vista, setVista] = useState<VistaPreviaImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<"revisar" | "importar" | null>(null);
  const columnas = columnasVisibles(plantilla);
  const obligatorias = new Set(plantilla.columnas.filter((c) => c.obligatoria).map((c) => c.nombre));
  const errores = erroresPorFila(vista);
  const conFotos = filas.some((f) => f.imagenUrl);

  function cambiar(nuevas: FilaEditable[]) {
    onFilas(nuevas);
    setVista(null); // lo revisado ya no corresponde a lo que se ve
  }

  async function revisar() {
    setError(null);
    setTrabajando("revisar");
    const r = await enviarPrecarga<VistaPreviaImportacion>(agenteId, "validar", filas);
    setTrabajando(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setVista(r.data);
  }

  async function importar(soloValidas: boolean) {
    setError(null);
    setTrabajando("importar");
    const r = await enviarPrecarga<ImportacionHecha>(agenteId, "importar", filas, soloValidas);
    setTrabajando(null);
    if (!r.ok) {
      if (r.code === "archivo_con_errores") await revisar();
      setError(r.error);
      return;
    }
    onImportado(r.data, filas);
  }

  if (filas.length === 0) return null;

  const hayErrores = (vista?.errores_total ?? 0) > 0;
  const nuevas = vista?.nuevas ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-x-auto rounded-md border border-border-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Fila</TableHead>
              {conFotos && <TableHead>Foto</TableHead>}
              {columnas.map((c) => (
                <TableHead key={c} className="font-mono text-xs">
                  {c}
                  {obligatorias.has(c) ? " *" : ""}
                </TableHead>
              ))}
              <TableHead className="w-10">
                <span className="sr-only">Quitar</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => {
              const deLaFila = errores.get(f.fila) ?? [];
              return (
                <TableRow key={f.fila}>
                  <TableCell className="align-top text-xs text-text-soft">{f.fila}</TableCell>
                  {conFotos && (
                    <TableCell className="align-top">
                      {f.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL firmada del backend, sin optimizar
                        <img src={f.imagenUrl} alt={`Foto de ${f.valores.nombre || "producto"}`} className="size-12 rounded-sm object-cover" />
                      ) : null}
                    </TableCell>
                  )}
                  {columnas.map((c) => {
                    const ia = f.inferidas.includes(c);
                    const errorCelda = deLaFila.find((e) => e.columna === c);
                    return (
                      <TableCell key={c} className="min-w-32 align-top">
                        <div className="flex flex-col gap-1">
                          <Input
                            aria-label={`${c} de la fila ${f.fila}`}
                            aria-invalid={errorCelda ? true : undefined}
                            value={f.valores[c] ?? ""}
                            onChange={(e) => cambiar(editarCelda(filas, f.fila, c, e.target.value))}
                            disabled={trabajando !== null}
                          />
                          {ia && (
                            <Badge variant="accent" icon={<Sparkles aria-hidden />} className="self-start">
                              IA
                            </Badge>
                          )}
                          {errorCelda && <span className="text-xs text-status-danger-fg">{errorCelda.mensaje}</span>}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="align-top">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar la fila ${f.fila}`}
                      onClick={() => cambiar(quitarFila(filas, f.fila))}
                      disabled={trabajando !== null}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-text-soft">* obligatoria. Puedes corregir cualquier celda antes de confirmar.</p>

      {vista && (
        <div className="flex flex-col gap-1" aria-live="polite">
          <p className="text-sm text-body">{resumenDeVistaPrevia(vista)}</p>
          {deLaVistaSinColumna(vista).map((e, i) => (
            <p key={`${e.fila}-${i}`} className="text-xs text-status-danger-fg">
              Fila {e.fila}: {e.mensaje}
            </p>
          ))}
        </div>
      )}
      <FormFeedback error={error} />

      <div className="flex flex-wrap items-center gap-2">
        {!vista ? (
          <Button onClick={() => void revisar()} loading={trabajando === "revisar"} disabled={ocupado || trabajando !== null}>
            Revisar {filas.length} {filas.length === 1 ? "fila" : "filas"}
          </Button>
        ) : hayErrores ? (
          <Button
            onClick={() => void importar(true)}
            loading={trabajando === "importar"}
            disabled={ocupado || trabajando !== null || nuevas === 0}
          >
            Importar solo las {nuevas} válidas
          </Button>
        ) : (
          <Button
            variant="accent"
            onClick={() => void importar(false)}
            loading={trabajando === "importar"}
            disabled={ocupado || trabajando !== null || nuevas === 0}
          >
            {nuevas === 0 ? "No hay filas nuevas" : `Confirmar e importar ${nuevas} ${nuevas === 1 ? "fila" : "filas"}`}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Errores que no son de una celda visible (p. ej. la foto): se muestran debajo de la tabla. */
function deLaVistaSinColumna(v: VistaPreviaImportacion) {
  return v.errores.filter((e) => !e.columna || e.columna === "imagen");
}
