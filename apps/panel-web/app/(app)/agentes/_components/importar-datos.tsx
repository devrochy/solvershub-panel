"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  DatosRetirados,
  EstadoImportacion,
  ImportacionHecha,
  VistaPreviaImportacion,
} from "@/lib/api/types";
import { conteoLegible } from "@/lib/datos-de-prueba";
import {
  avisoDeColumnas,
  borrarImportado,
  resumenDeImportacion,
  resumenDeVistaPrevia,
  subirArchivo,
  urlDePlantilla,
} from "@/lib/importar-datos";
import { toast } from "@/lib/toast-store";

/**
 * «Importar datos» en la ficha del agente (HU-QA-12, solo en test): el dueño descarga la plantilla CSV de su
 * agente, la llena con sus datos reales y la sube. La vista previa muestra cada error junto a su fila y
 * cuántas filas se crearían o ya existen; se importa todo, solo las válidas o se corrige y se vuelve a subir.
 * Lo que ya existe se omite y lo importado se borra aparte de los datos de prueba generados.
 */
export function ImportarDatosDelAgente({
  agenteId,
  nombre,
  estado,
}: {
  agenteId: string;
  nombre: string;
  estado: EstadoImportacion;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const entrada = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<VistaPreviaImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<"revisar" | "importar" | "borrar" | null>(null);
  const plantilla = estado.plantilla;
  const importado = estado.importado ?? null;

  if (!estado.disponible || !plantilla) return null;

  function reiniciar() {
    setArchivo(null);
    setVista(null);
    setError(null);
    if (entrada.current) entrada.current.value = "";
  }

  async function alElegir(elegido: File | null) {
    setVista(null);
    setError(null);
    setArchivo(elegido);
    if (!elegido) return;
    setTrabajando("revisar");
    const r = await subirArchivo<VistaPreviaImportacion>(agenteId, "validar", elegido);
    setTrabajando(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setVista(r.data);
  }

  async function importar(soloValidas: boolean) {
    if (!archivo) return;
    setTrabajando("importar");
    const r = await subirArchivo<ImportacionHecha>(agenteId, "importar", archivo, soloValidas);
    setTrabajando(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    toast.success(resumenDeImportacion(r.data));
    setAbierto(false);
    reiniciar();
    router.refresh();
  }

  async function borrar() {
    if (!importado) return;
    const ok = await confirmar({
      title: `¿Borrar lo importado de ${nombre}?`,
      description: `Se retiran ${conteoLegible(importado.conteos)} que importaste desde un archivo. Los datos de prueba generados y lo que creaste a mano no cambian.`,
      confirmLabel: "Borrar lo importado",
    });
    if (!ok) return;
    setTrabajando("borrar");
    const r = await borrarImportado<DatosRetirados>(agenteId);
    setTrabajando(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Lo importado se borró.");
    router.refresh();
  }

  const aviso = vista ? avisoDeColumnas(vista.columnas_ignoradas) : null;
  const hayFaltantes = (vista?.columnas_faltantes.length ?? 0) > 0;
  const errores = vista?.errores_total ?? 0;
  const aImportar = vista?.nuevas ?? 0;

  return (
    <>
      {importado && (
        <Button variant="ghost" onClick={borrar} loading={trabajando === "borrar"} disabled={trabajando !== null}>
          <Trash2 aria-hidden /> Borrar lo importado
        </Button>
      )}
      <Button
        variant="outline"
        onClick={() => {
          reiniciar();
          setAbierto(true);
        }}
      >
        <Upload aria-hidden /> Importar datos
      </Button>

      <Dialog
        open={abierto}
        onOpenChange={(abrir) => {
          if (trabajando === "importar") return;
          setAbierto(abrir);
          if (!abrir) reiniciar();
        }}
      >
        <DialogContent
          title={`Importar ${plantilla.titulo.toLowerCase()} de ${nombre}`}
          description={plantilla.ayuda}
          className="max-w-2xl"
        >
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
            {importado && (
              <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-body">
                Ya importaste {conteoLegible(importado.conteos)}. Subir otro archivo agrega solo lo que no existe.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-headline">1. Descarga la plantilla y llénala</p>
              <div>
                <Button asChild variant="outline" size="sm">
                  <a href={urlDePlantilla(agenteId)} download>
                    <Download aria-hidden /> Descargar plantilla (CSV)
                  </a>
                </Button>
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-text-soft">
                {plantilla.columnas.map((c) => (
                  <li key={c.nombre}>
                    <span className="font-mono text-body">{c.nombre}</span>
                    {c.obligatoria ? " (obligatoria)" : ""}: {c.descripcion}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-soft">
                Hasta {plantilla.tope_filas} filas y {Math.round(plantilla.tope_bytes / 1_000_000)} MB. Guarda el
                archivo como CSV (separado por comas o por punto y coma).
              </p>
            </div>

            <Field label="2. Sube tu archivo CSV" htmlFor="archivo-importar">
              <Input
                ref={entrada}
                id="archivo-importar"
                type="file"
                accept=".csv,text/csv"
                disabled={trabajando !== null}
                onChange={(e) => void alElegir(e.target.files?.[0] ?? null)}
              />
            </Field>

            {trabajando === "revisar" && <p className="text-sm text-text-soft">Revisando el archivo…</p>}
            {error && (
              <p role="alert" className="text-sm text-status-danger-fg">
                {error}
              </p>
            )}

            {vista && (
              <div className="flex flex-col gap-3" aria-live="polite">
                <p className="text-sm font-medium text-headline">3. Revisa y confirma</p>
                <p className="text-sm text-body">{resumenDeVistaPrevia(vista)}</p>
                {aviso && <p className="text-xs text-text-soft">{aviso}</p>}
                {hayFaltantes && (
                  <p role="alert" className="text-sm text-status-danger-fg">
                    Al archivo le faltan columnas obligatorias: {vista.columnas_faltantes.join(", ")}.
                  </p>
                )}
                {errores > 0 && (
                  <div className="flex flex-col gap-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          <TableHead>Columna</TableHead>
                          <TableHead>Qué corregir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vista.errores.map((e, i) => (
                          <TableRow key={`${e.fila}-${e.columna ?? ""}-${i}`}>
                            <TableCell>{e.fila}</TableCell>
                            <TableCell className="font-mono text-xs">{e.columna ?? "—"}</TableCell>
                            <TableCell>{e.mensaje}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {errores > vista.errores.length && (
                      <p className="text-xs text-text-soft">
                        Se muestran {vista.errores.length} de {errores} errores.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {errores === 0 && !hayFaltantes && (
                    <Button onClick={() => void importar(false)} loading={trabajando === "importar"} disabled={aImportar === 0}>
                      {aImportar === 0 ? "No hay filas nuevas" : `Importar ${aImportar} ${aImportar === 1 ? "fila" : "filas"}`}
                    </Button>
                  )}
                  {errores > 0 && !hayFaltantes && (
                    <Button
                      onClick={() => void importar(true)}
                      loading={trabajando === "importar"}
                      disabled={aImportar === 0}
                    >
                      Importar solo las {aImportar} válidas
                    </Button>
                  )}
                  <Button variant="ghost" onClick={reiniciar} disabled={trabajando !== null}>
                    Elegir otro archivo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
