"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuLinkItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { contactoDelFormulario, type Aliado } from "@/lib/aliados";
import { useAction } from "@/lib/use-action";
import { cuantosProductos, hrefAliado } from "@/lib/ventas";

/** Alta o edición de un aliado (proveedor) del negocio (HU-CRM-03), abierta desde la URL. */
export function EditorDeAliado({ aliado, alCerrar }: { aliado?: Aliado; alCerrar: string }) {
  const router = useRouter();
  const [activo, setActivo] = useState(aliado?.active ?? true);
  const [estado, setEstado] = useState<{ guardando?: boolean; error?: string }>({});
  const cerrar = () => router.replace(alCerrar, { scroll: false });

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setEstado({ guardando: true });
    const res = await fetch(aliado ? `/api/pack/commerce/allies/${aliado.id}` : "/api/pack/commerce/allies", {
      method: aliado ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? "").trim(),
        contact_info: contactoDelFormulario(data),
        active: activo,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setEstado({ error: json.error ?? "No se pudo guardar el aliado." });
      return;
    }
    setEstado({});
    cerrar();
    router.refresh();
  }

  const c = aliado?.contact_info ?? {};
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent
        title={aliado ? `Editar ${aliado.name}` : "Nuevo aliado"}
        description="Un proveedor cuyos productos vendes. Sirve para agruparlos y para limitar promociones."
        className="max-w-lg"
      >
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <Field label="Nombre" htmlFor="a-name" required help="Es el que va en la columna «aliado» del archivo de productos.">
            <Input id="a-name" name="name" required maxLength={120} defaultValue={aliado?.name ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Persona de contacto" htmlFor="a-contacto">
              <Input id="a-contacto" name="contacto" maxLength={120} defaultValue={c.contacto ?? ""} />
            </Field>
            <Field label="Teléfono" htmlFor="a-telefono">
              <Input id="a-telefono" name="telefono" type="tel" maxLength={40} defaultValue={c.telefono ?? ""} />
            </Field>
          </div>
          <Field label="Correo" htmlFor="a-email">
            <Input id="a-email" name="email" type="email" maxLength={254} defaultValue={c.email ?? ""} />
          </Field>
          <Field label="Notas" htmlFor="a-notas">
            <Input id="a-notas" name="notas" maxLength={500} defaultValue={c.notas ?? ""} />
          </Field>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-headline">Activo</span>
            <Switch checked={activo} onCheckedChange={setActivo} aria-label="Aliado activo" />
          </label>
          <FormFeedback error={estado.error} />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" loading={estado.guardando}>
              {aliado ? "Guardar aliado" : "Crear aliado"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** «Más acciones» de un aliado: editar, ver sus productos y eliminar (sus productos quedan sin aliado). */
export function AccionesDeAliado({ aliado }: { aliado: Aliado }) {
  const { run } = useAction();
  const confirmar = useConfirm();

  async function eliminar() {
    const ok = await confirmar({
      title: `¿Eliminar a ${aliado.name}?`,
      description:
        aliado.products > 0
          ? `${cuantosProductos(aliado.products)} quedan como tuyos (sin aliado) y sus promociones se apagan.`
          : "Sus promociones se apagan.",
      confirmLabel: "Eliminar aliado",
      destructive: true,
    });
    if (!ok) return;
    void run(async () => {
      const res = await fetch(`/api/pack/commerce/allies/${encodeURIComponent(aliado.id)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return res.ok ? { ok: true, success: `${aliado.name} eliminado.` } : { ok: false, status: res.status, error: json.error ?? "No se pudo eliminar." };
    });
  }

  return (
    <MenuDeFila etiqueta={`Más acciones de ${aliado.name}`}>
      <DropdownMenuLinkItem href={hrefAliado(aliado.id)} scroll={false}>
        Editar
      </DropdownMenuLinkItem>
      <DropdownMenuLinkItem href={`/comercio/productos?aliado=${aliado.id}`}>Ver sus productos</DropdownMenuLinkItem>
      <DropdownMenuItem tone="danger" onSelect={() => void eliminar()}>
        Eliminar aliado
      </DropdownMenuItem>
    </MenuDeFila>
  );
}
