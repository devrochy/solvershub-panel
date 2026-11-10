"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { SelectorDeColor } from "@/components/domain/tipo-de-cita";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CODIGO_MAX, normalizarCodigo } from "@/lib/calendario/agenda";
import { etiquetaDeDuracion, opcionesDeDuracion } from "@/lib/calendario/formulario";
import { enlaceValido } from "@/lib/citas";
import { toast } from "@/lib/toast-store";

export type Responsable = { id: string; email: string };
export type TipoCita = {
  id: string;
  name: string;
  duration_minutes: number;
  description: string;
  responsable_admin_id?: string | null;
  enlace_reunion?: string | null;
  color?: string;
  codigo?: string;
};

/**
 * Cuerpo de alta/edición de un tipo (HU-SH-02: responsable y enlace). Color y código siguen
 * existiendo (los usa la ficha del cliente) pero van plegados: solo se mandan si el campo está.
 * Sin color elegido no se manda: el backend rota la paleta al crear y lo conserva al editar.
 */
function cuerpoTipo(data: FormData): Record<string, unknown> | string {
  const enlace = String(data.get("enlace_reunion") ?? "").trim();
  if (!enlaceValido(enlace)) return "El enlace de la reunión tiene que empezar con https://.";
  return {
    name: String(data.get("name") ?? ""),
    duration_minutes: Number(data.get("duration_minutes") ?? 30),
    description: String(data.get("description") ?? ""),
    responsable_admin_id: String(data.get("responsable_admin_id") ?? "") || null,
    enlace_reunion: enlace,
    ...(data.get("color") ? { color: String(data.get("color")) } : {}),
    ...(data.has("codigo") ? { codigo: normalizarCodigo(String(data.get("codigo") ?? "")) } : {}),
  };
}

/** Quién recibe el aviso de las citas del tipo, dicho para el dueño. */
export function quienAtiende(tipo: Pick<TipoCita, "responsable_admin_id">, responsables: Responsable[]): string {
  const email = responsables.find((r) => r.id === tipo.responsable_admin_id)?.email;
  return email ? `lo atiende ${email}` : "lo atienden los dueños";
}

/** Alta o edición de un tipo de cita en un diálogo (AGE-09). */
export function TipoDialog({
  tipo,
  responsables,
  abierto,
  onAbiertoChange,
}: {
  tipo?: TipoCita;
  responsables: Responsable[];
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const sufijo = tipo?.id ?? "nuevo";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cuerpo = cuerpoTipo(new FormData(event.currentTarget));
    if (typeof cuerpo === "string") {
      setStatus({ error: cuerpo });
      return;
    }
    setStatus({ loading: true });
    const res = await fetch(tipo ? `/api/pack/calendar/types/${tipo.id}` : "/api/pack/calendar/types", {
      method: tipo ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? (tipo ? "No se pudo guardar el tipo." : "No se pudo crear el tipo.") });
      return;
    }
    setStatus({});
    onAbiertoChange(false);
    toast.success(tipo ? "Tipo guardado." : "Tipo creado.");
    router.refresh();
  }

  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent
        title={tipo ? `Editar ${tipo.name}` : "Nuevo tipo de cita"}
        description="Un servicio que tu agente puede agendar, cuánto dura y quién recibe el aviso."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre" htmlFor={`t-name-${sufijo}`} required>
            <Input id={`t-name-${sufijo}`} name="name" required placeholder="Valoración, Control…" defaultValue={tipo?.name ?? ""} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Duración" htmlFor={`t-dur-${sufijo}`}>
              <Select id={`t-dur-${sufijo}`} name="duration_minutes" defaultValue={String(tipo?.duration_minutes ?? 30)}>
                {opcionesDeDuracion(tipo?.duration_minutes).map((m) => (
                  <option key={m} value={m}>
                    {etiquetaDeDuracion(m)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quién recibe el aviso" htmlFor={`t-resp-${sufijo}`}>
              <Select id={`t-resp-${sufijo}`} name="responsable_admin_id" defaultValue={tipo?.responsable_admin_id ?? ""}>
                <option value="">Los dueños del negocio</option>
                {responsables.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.email}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Descripción" htmlFor={`t-desc-${sufijo}`} help="Tu agente la usa para explicarle el servicio al cliente.">
            <Textarea id={`t-desc-${sufijo}`} name="description" rows={2} defaultValue={tipo?.description ?? ""} />
          </Field>
          <Field label="Enlace de la reunión" htmlFor={`t-link-${sufijo}`} help="Meet, Zoom… Vacío = el enlace general.">
            <Input id={`t-link-${sufijo}`} name="enlace_reunion" type="url" placeholder="https://" defaultValue={tipo?.enlace_reunion ?? ""} />
          </Field>
          <details className="rounded-md border border-border-soft px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-headline">Color y código</summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-xs text-text-soft">Se ven en la ficha del cliente. En la Agenda cada cita lleva el color de su agenda.</p>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1.5 text-sm font-medium text-headline">Color</legend>
                <SelectorDeColor name="color" defaultValue={tipo?.color} idBase={`t-color-${sufijo}`} />
              </fieldset>
              <Field label="Código" htmlFor={`t-cod-${sufijo}`} help="Corto (ej. VAL)." className="w-36">
                <Input
                  id={`t-cod-${sufijo}`}
                  name="codigo"
                  maxLength={CODIGO_MAX}
                  className="uppercase placeholder:normal-case"
                  placeholder="Del nombre"
                  defaultValue={tipo?.codigo ?? ""}
                />
              </Field>
            </div>
          </details>
          <FormFeedback error={status.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onAbiertoChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" loading={status.loading}>
              {tipo ? "Guardar" : "Crear tipo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Menú de un tipo de cita: editarlo o eliminarlo, con confirmación. */
export function MenuTipo({ tipo, responsables }: { tipo: TipoCita; responsables: Responsable[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editando, setEditando] = useState(false);

  async function eliminar() {
    const ok = await confirm({
      title: `¿Eliminar «${tipo.name}»?`,
      description: "Tu agente deja de ofrecerlo. Las citas que ya tiene se quedan como están.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/pack/calendar/types/${tipo.id}/delete`, { method: "POST" });
    if (!res.ok) {
      toast.error("No se pudo eliminar el tipo.");
      return;
    }
    toast.success("Tipo eliminado.");
    router.refresh();
  }

  return (
    <>
      <MenuDeFila etiqueta={`Más acciones de ${tipo.name}`}>
        <DropdownMenuItem icon={<Pencil />} onSelect={() => setEditando(true)}>
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Trash2 />} tone="danger" onSelect={() => void eliminar()}>
          Eliminar
        </DropdownMenuItem>
      </MenuDeFila>
      <TipoDialog tipo={tipo} responsables={responsables} abierto={editando} onAbiertoChange={setEditando} />
    </>
  );
}
