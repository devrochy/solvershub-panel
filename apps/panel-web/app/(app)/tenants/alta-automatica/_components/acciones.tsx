"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { VendedorAltas } from "@/lib/api/types";
import { toast } from "@/lib/toast-store";

type Estado = { loading?: boolean; error?: string };

/** POST al BFF del vendedor. Devuelve el error del core, o null si salió bien. */
async function enviar(vendedor: string, payload: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(`/api/platform/altas-automaticas/${vendedor}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) return null;
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return json.error ?? "No se pudo completar la acción.";
}

/** Interruptor del alta automática: pausar (con motivo) o reanudar. */
export function Interruptor({ vendedor }: { vendedor: VendedorAltas }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState<Estado>({});
  const pausado = vendedor.interruptor.pausado;

  async function pausar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motivo = String(new FormData(event.currentTarget).get("motivo") ?? "").trim();
    setEstado({ loading: true });
    const error = await enviar(vendedor.id, { action: "interruptor", pausado: true, motivo });
    if (error) {
      setEstado({ error });
      return;
    }
    setEstado({});
    setOpen(false);
    toast.success("Alta automática pausada: las altas nuevas quedan en revisión.");
    router.refresh();
  }

  async function reanudar() {
    const ok = await confirm({
      title: "Reanudar el alta automática",
      description:
        "Las altas nuevas vuelven a crear el negocio solas. Las que quedaron en revisión siguen ahí: apruébalas o descártalas una por una.",
      confirmLabel: "Reanudar",
    });
    if (!ok) return;
    const error = await enviar(vendedor.id, { action: "interruptor", pausado: false });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Alta automática reanudada.");
    router.refresh();
  }

  if (pausado) {
    return (
      <Button variant="outline" size="sm" onClick={() => void reanudar()}>
        Reanudar
      </Button>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Pausar alta automática
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Pausar el alta automática"
        description="Úsalo ante un ataque. Los pedidos siguen entrando, pero cada alta nueva queda en revisión hasta que alguien la apruebe o la descarte."
      >
        <form onSubmit={(e) => void pausar(e)} className="flex flex-col gap-4">
          <Field label="Motivo" htmlFor={`motivo-${vendedor.id}`} help="Queda en la auditoría.">
            <Textarea id={`motivo-${vendedor.id}`} name="motivo" required maxLength={300} rows={3} />
          </Field>
          <FormFeedback error={estado.error} />
          <div className="flex justify-end">
            <Button type="submit" variant="danger" disabled={estado.loading}>
              Pausar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const TIPOS = [
  { id: "terminos", nombre: "Términos y condiciones" },
  { id: "privacidad", nombre: "Aviso de privacidad" },
  { id: "dpa", nombre: "Acuerdo de tratamiento de datos (DPA)" },
] as const;

/** Publica una versión nueva de un documento legal (no edita las anteriores). */
export function PublicarDocumento({ vendedor, tipo }: { vendedor: string; tipo?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState<Estado>({});

  async function publicar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setEstado({ loading: true });
    const error = await enviar(vendedor, {
      action: "documento",
      tipo: String(data.get("tipo") ?? ""),
      version: String(data.get("version") ?? "").trim(),
      url: String(data.get("url") ?? "").trim(),
    });
    if (error) {
      setEstado({ error });
      return;
    }
    setEstado({});
    setOpen(false);
    toast.success("Versión publicada: rige para las altas que se pidan desde ahora.");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Publicar versión
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Publicar una versión de un documento legal"
        description="Rige desde ya. Las aceptaciones anteriores conservan la versión que vieron. Conviene un enlace propio de la versión."
      >
        <form onSubmit={(e) => void publicar(e)} className="flex flex-col gap-4">
          <Field label="Documento" htmlFor={`tipo-${vendedor}`}>
            <Select id={`tipo-${vendedor}`} name="tipo" defaultValue={tipo ?? "terminos"}>
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Versión" htmlFor={`version-${vendedor}`} help="Letras, números, punto o guion. Ej.: 2026-10.">
            <Input
              id={`version-${vendedor}`}
              name="version"
              required
              maxLength={40}
              pattern="[A-Za-z0-9][A-Za-z0-9._\-]*"
            />
          </Field>
          <Field label="Enlace" htmlFor={`url-${vendedor}`} help="https://… El comprador lo abre desde el chat.">
            <Input id={`url-${vendedor}`} name="url" type="url" required maxLength={500} placeholder="https://" />
          </Field>
          <FormFeedback error={estado.error} />
          <div className="flex justify-end">
            <Button type="submit" disabled={estado.loading}>
              Publicar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Aprobar o descartar un alta en revisión. */
export function AccionesDeAlta({ vendedor, referencia }: { vendedor: string; referencia: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState<Estado>({});

  async function aprobar() {
    const ok = await confirm({
      title: `Aprobar el alta ${referencia}`,
      description:
        "Se crea el negocio sin los controles de riesgo que la frenaron (interruptor, términos, Free repetido, señales). Queda auditado con tu usuario.",
      confirmLabel: "Aprobar",
    });
    if (!ok) return;
    setEstado({ loading: true });
    const error = await enviar(vendedor, { action: "aprobar", referencia });
    setEstado({});
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Alta ${referencia} aprobada: el negocio se crea en unos segundos.`);
    router.refresh();
  }

  async function descartar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motivo = String(new FormData(event.currentTarget).get("motivo") ?? "").trim();
    setEstado({ loading: true });
    const error = await enviar(vendedor, { action: "descartar", referencia, motivo });
    if (error) {
      setEstado({ error });
      return;
    }
    setEstado({});
    setOpen(false);
    toast.success(`Alta ${referencia} descartada.`);
    router.refresh();
  }

  return (
    <span className="flex justify-end gap-2">
      <Button size="sm" onClick={() => void aprobar()} disabled={estado.loading}>
        Aprobar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={estado.loading}>
            Descartar
          </Button>
        </DialogTrigger>
        <DialogContent
          title={`Descartar el alta ${referencia}`}
          description="No se crea el negocio. Conviene escribirle al cliente: ya recibió el aviso de que el acceso llega a su correo."
        >
          <form onSubmit={(e) => void descartar(e)} className="flex flex-col gap-4">
            <Field label="Motivo" htmlFor={`descartar-${referencia}`} help="Queda en el alta y en la auditoría.">
              <Textarea id={`descartar-${referencia}`} name="motivo" required minLength={3} maxLength={300} rows={3} />
            </Field>
            <FormFeedback error={estado.error} />
            <div className="flex justify-end">
              <Button type="submit" variant="danger" disabled={estado.loading}>
                Descartar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </span>
  );
}
