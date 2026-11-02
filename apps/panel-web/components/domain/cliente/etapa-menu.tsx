"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ETAPA_PERDIDA, MAX_NOTA_PERDIDA, TONO_DE_ETAPA } from "@/lib/clientes";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/use-action";

/**
 * Etapa de un lead con menú para cambiarla desde la lista (HU-CRM-19). El cambio se ve al instante y
 * vuelve a la etapa anterior si el servidor lo rechaza (el toast trae su motivo). Escribe con el mismo
 * `PATCH` del pack que usa la ficha (ADR-0149), así que la lista y la ficha muestran lo mismo y el
 * cambio queda en la historia del cliente (HU-CRM-18).
 *
 * Pasar a «perdido» pide el motivo (HU-CRM-23): si el pack declara motivos, se abre un diálogo con el
 * motivo (obligatorio) y una nota opcional, y el cambio no se hace hasta confirmarlo. Sin motivos
 * declarados (backend viejo) se escribe la etapa sola y el servidor dice si le falta algo.
 */
export function EtapaMenu({
  leadId,
  nombre,
  pluginId,
  clave,
  actual,
  texto,
  opciones,
  motivos = [],
  grande = false,
}: {
  leadId: string;
  /** Nombre visible del cliente, para el aviso y las etiquetas accesibles. */
  nombre: string;
  pluginId: string;
  /** Clave del campo editable de la etapa (`estado_lead`). */
  clave: string;
  /** Código de la etapa que trae la fila; "" si el nombre no está entre las opciones. */
  actual: string;
  /** Nombre de la etapa tal como lo trae la fila. */
  texto: string;
  opciones: { value: string; label: string }[];
  /** Motivos de pérdida que declara el pack (sin «Sin motivo registrado»); vacío = no se pide motivo. */
  motivos?: { value: string; label: string }[];
  /** Destino táctil de 44 px (tarjetas móviles). */
  grande?: boolean;
}) {
  const [codigo, setCodigo] = useState(actual);
  const [delServidor, setDelServidor] = useState(actual);
  // Cuando la vista del servidor se refresca, manda lo que dice el servidor.
  if (delServidor !== actual) {
    setDelServidor(actual);
    setCodigo(actual);
  }
  const anterior = useRef(actual);
  const accion = useAction({ rollback: () => setCodigo(anterior.current) });

  const elegida = opciones.find((o) => o.value === codigo);
  const etiqueta = elegida?.label ?? texto;

  // Diálogo del motivo: se abre al elegir «perdido» y no cambia nada hasta confirmar.
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | undefined>();

  function elegir(valor: string) {
    if (valor === codigo || accion.pending) return;
    if (valor === ETAPA_PERDIDA && motivos.length > 0) {
      setMotivo("");
      setNota("");
      setErrorMotivo(undefined);
      setPidiendoMotivo(true);
      return;
    }
    void cambiar(valor);
  }

  function confirmarPerdida(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo) {
      setErrorMotivo("Elige el motivo de la pérdida.");
      return;
    }
    setPidiendoMotivo(false);
    void cambiar(ETAPA_PERDIDA, {
      motivo_perdida: motivo,
      ...(nota.trim() ? { nota_perdida: nota.trim() } : {}),
    });
  }

  async function cambiar(valor: string, extra: Record<string, string> = {}) {
    if (valor === codigo || accion.pending) return;
    const nueva = opciones.find((o) => o.value === valor);
    anterior.current = codigo;
    setCodigo(valor);
    await accion.run(async () => {
      const res = await fetch(
        `/api/leads/${encodeURIComponent(leadId)}/pack/${encodeURIComponent(pluginId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ valores: { [clave]: valor, ...extra } }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      return {
        ok: res.ok,
        status: res.status,
        error: typeof json.error === "string" ? json.error : undefined,
        success: `${nombre} pasó a ${nueva?.label ?? valor}.`,
      };
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={accion.pending}
            aria-label={`Etapa: ${etiqueta}. Cambiar la etapa de ${nombre}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1 text-left outline-none transition-colors",
              "hover:bg-hover focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60",
              grande ? "min-h-11" : "min-h-9",
            )}
          >
            <Badge variant={TONO_DE_ETAPA[codigo] ?? "neutral"}>
              {etiqueta}
            </Badge>
            <ChevronDown className="h-4 w-4 text-text-soft" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {opciones.map((o) => (
            <DropdownMenuItem
              key={o.value}
              onSelect={() => elegir(o.value)}
              icon={
                o.value === codigo ? (
                  <Check aria-hidden />
                ) : (
                  <span className="inline-block h-4 w-4" aria-hidden />
                )
              }
            >
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={pidiendoMotivo} onOpenChange={setPidiendoMotivo}>
        <DialogContent
          title="¿Por qué se perdió?"
          description={`Elige el motivo para marcar a ${nombre} como perdido. Queda en su historia.`}
          className="max-w-md"
        >
          <form onSubmit={confirmarPerdida} className="flex flex-col gap-4">
            <Field
              label="Motivo de la pérdida"
              htmlFor={`motivo-${leadId}`}
              error={errorMotivo}
              required
            >
              <Select
                id={`motivo-${leadId}`}
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  setErrorMotivo(undefined);
                }}
              >
                <option value="">Elige un motivo</option>
                {motivos.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Nota (opcional)"
              htmlFor={`nota-${leadId}`}
              help={`Hasta ${MAX_NOTA_PERDIDA} caracteres.`}
            >
              <Textarea
                id={`nota-${leadId}`}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                maxLength={MAX_NOTA_PERDIDA}
                rows={3}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" variant="accent" size="sm">
                Marcar como perdido
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
