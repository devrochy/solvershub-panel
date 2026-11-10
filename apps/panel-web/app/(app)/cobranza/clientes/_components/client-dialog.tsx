"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { MenuDeFila } from "@/components/domain/cobranza/menu-de-fila";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RIESGO_STATUS } from "@/lib/cobranza/presentacion";

export type CarteraOpcion = { id: string; nombre: string };

export type Cliente = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  tipo_documento: string;
  numero_documento: string;
  negocio: string;
  cartera: string;
  cartera_id: string;
  tope_maximo_deuda: number;
  color_riesgo: string;
};

/** Alta y edición de un cliente de la cartera (mismos campos que el clásico). */
export function ClientFormDialog({
  carteras,
  cliente,
  defaultCarteraId,
  trigger,
  abierto,
  onAbiertoChange,
}: {
  carteras: CarteraOpcion[];
  cliente?: Cliente;
  defaultCarteraId?: string;
  trigger?: ReactNode;
  /** Controlado: el diálogo se abre desde un menú, sin disparador propio. */
  abierto?: boolean;
  onAbiertoChange?: (abierto: boolean) => void;
}) {
  const router = useRouter();
  const [abiertoPropio, setAbiertoPropio] = useState(false);
  const open = abierto ?? abiertoPropio;
  const setOpen = onAbiertoChange ?? setAbiertoPropio;
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const editando = Boolean(cliente);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(
      editando ? `/api/pack/cobranza/clients/${cliente?.id}` : "/api/pack/cobranza/clients",
      {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: String(data.get("nombre") ?? ""),
          apellido: String(data.get("apellido") ?? ""),
          telefono: String(data.get("telefono") ?? ""),
          tipo_documento: String(data.get("tipo_documento") ?? ""),
          numero_documento: String(data.get("numero_documento") ?? ""),
          negocio: String(data.get("negocio") ?? ""),
          cartera_id: String(data.get("cartera_id") ?? ""),
          tope_maximo_deuda: Number(data.get("tope_maximo_deuda") ?? 0),
          color_riesgo: String(data.get("color_riesgo") ?? "blanco"),
        }),
      },
    );
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo guardar el cliente." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        title={editando ? "Editar cliente" : "Nuevo cliente"}
        description="El cliente pertenece a una cartera; los préstamos se registran desde su ficha."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="nombre">
              <Input id="nombre" name="nombre" defaultValue={cliente?.nombre} required />
            </Field>
            <Field label="Apellido" htmlFor="apellido">
              <Input id="apellido" name="apellido" defaultValue={cliente?.apellido ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono (WhatsApp)" htmlFor="telefono">
              <Input id="telefono" name="telefono" defaultValue={cliente?.telefono ?? ""} />
            </Field>
            <Field label="Negocio" htmlFor="negocio">
              <Input id="negocio" name="negocio" defaultValue={cliente?.negocio ?? ""} />
            </Field>
          </div>
          <Field label="Cartera" htmlFor="cartera_id">
            <Select
              id="cartera_id"
              name="cartera_id"
              defaultValue={cliente?.cartera_id ?? defaultCarteraId ?? ""}
              required
            >
              <option value="">Elige una cartera</option>
              {carteras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de documento" htmlFor="tipo_documento">
              <Input id="tipo_documento" name="tipo_documento" defaultValue={cliente?.tipo_documento ?? ""} />
            </Field>
            <Field label="Número de documento" htmlFor="numero_documento">
              <Input id="numero_documento" name="numero_documento" defaultValue={cliente?.numero_documento ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tope de deuda" htmlFor="tope_maximo_deuda">
              <Input
                id="tope_maximo_deuda"
                name="tope_maximo_deuda"
                type="number"
                step="0.01"
                min={0}
                defaultValue={cliente?.tope_maximo_deuda ?? 0}
              />
            </Field>
            <Field label="Color de riesgo" htmlFor="color_riesgo">
              <Select id="color_riesgo" name="color_riesgo" defaultValue={cliente?.color_riesgo ?? "blanco"}>
                {Object.entries(RIESGO_STATUS).map(([valor, { label }]) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Guardando…" : editando ? "Guardar cambios" : "Crear cliente"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Acciones por fila: editar y eliminar, con confirmación. */
export function ClientRowActions({
  cliente,
  carteras,
}: {
  cliente: Cliente;
  carteras: CarteraOpcion[];
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string>();
  const nombre = `${cliente.nombre} ${cliente.apellido}`.trim();

  async function eliminar() {
    const ok = await confirmar({
      title: `¿Eliminar a ${nombre}?`,
      description: "Sale de su cartera y deja de verse en Cobranza.",
      confirmLabel: "Eliminar cliente",
      destructive: true,
    });
    if (!ok) return;
    setError(undefined);
    const res = await fetch(`/api/pack/cobranza/clients/${cliente.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo eliminar el cliente.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && (
        <span className="text-xs text-status-danger-fg" role="alert">
          {error}
        </span>
      )}
      <MenuDeFila etiqueta={`Más acciones de ${nombre}`}>
        <DropdownMenuItem icon={<Pencil />} onSelect={() => setEditando(true)}>
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Trash2 />} tone="danger" onSelect={() => void eliminar()}>
          Eliminar
        </DropdownMenuItem>
      </MenuDeFila>
      <ClientFormDialog carteras={carteras} cliente={cliente} abierto={editando} onAbiertoChange={setEditando} />
    </div>
  );
}
