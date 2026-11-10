"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ChannelIcon } from "@/components/domain/channel-icon";
import { JsonSchemaForm } from "@/components/domain/json-schema-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { destinoDeAlta } from "@/lib/conexiones";

type TypeItem = {
  id: string;
  label: string;
  description: string | null;
  available: boolean;
  setup_kind: string;
  url: string | null;
  has_schema: boolean;
};

type Category = { category: string; label: string; items: TypeItem[] };

type ManualForm = {
  type_id: string;
  label: string;
  description: string | null;
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  configured_secrets: string[];
};

/**
 * El catálogo llega por categoría técnica (comunicación, correo, calendario); al negocio le sirve
 * saber para qué es cada una: hablar con sus clientes o darle herramientas al agente (CON-15).
 */
const PARA_CLIENTES = new Set(["comunicacion"]);

function agruparPorUso(categorias: Category[]): Category[] {
  const clientes = categorias.filter((c) => PARA_CLIENTES.has(c.category)).flatMap((c) => c.items);
  const trabajo = categorias.filter((c) => !PARA_CLIENTES.has(c.category)).flatMap((c) => c.items);
  return [
    { category: "clientes", label: "Para hablar con tus clientes", items: clientes },
    { category: "trabajo", label: "Para que el agente trabaje", items: trabajo },
  ].filter((g) => g.items.length > 0);
}

/** Alta de conexión: elegir tipo del catálogo y, si es manual, completar el form. */
export function NewConnectionDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [form, setForm] = useState<ManualForm | null>(null);
  const [label, setLabel] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadCatalog() {
    setError(null);
    const res = await fetch("/api/connections/catalog");
    const json = (await res.json().catch(() => null)) as { categories?: Category[]; error?: string } | null;
    if (!res.ok || !json?.categories) {
      setError(json?.error ?? "No se pudo cargar el catálogo.");
      return;
    }
    setCategories(json.categories);
  }

  async function openType(type: TypeItem) {
    if (type.setup_kind !== "manual" || !type.has_schema) {
      setError("Este tipo todavía no se puede conectar desde aquí. Escríbenos y lo conectamos contigo.");
      return;
    }
    setError(null);
    const res = await fetch(`/api/connections/manual/${encodeURIComponent(type.id)}`);
    const json = (await res.json().catch(() => null)) as (ManualForm & { error?: string }) | null;
    if (!res.ok || !json?.type_id) {
      setError(json?.error ?? "No se pudo cargar el formulario.");
      return;
    }
    setLabel(type.label);
    setForm(json);
  }

  function elegir(type: TypeItem) {
    const destino = destinoDeAlta(type);
    if (!destino) return;
    if (destino.tipo === "formulario") {
      void openType(type);
      return;
    }
    setOpen(false);
    if (destino.tipo === "externo") {
      window.location.assign(destino.href);
      return;
    }
    router.push(destino.href);
  }

  function toggle(next: boolean) {
    setOpen(next);
    setForm(null);
    setError(null);
    setBusqueda("");
    if (next && categories === null) void loadCatalog();
  }

  const filtro = busqueda.trim().toLowerCase();
  const categoriasVisibles = agruparPorUso(categories ?? [])
    .map((grupo) => ({
      ...grupo,
      items: filtro
        ? grupo.items.filter(
            (t) =>
              t.label.toLowerCase().includes(filtro) ||
              (t.description ?? "").toLowerCase().includes(filtro) ||
              t.id.toLowerCase().includes(filtro),
          )
        : grupo.items,
    }))
    .filter((grupo) => grupo.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={toggle}>
      <DialogTrigger asChild>
        <Button variant="accent">Agregar conexión</Button>
      </DialogTrigger>
      <DialogContent
        title={form ? `Nueva conexión · ${form.label}` : "Agregar conexión"}
        description={
          form ? form.description ?? undefined : "¿Por dónde quieres que atienda tu agente?"
        }
        className="max-w-2xl"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {error && <FormFeedback error={error} className="mb-4" />}

          {!form && categories && (
            <Input
              aria-label="Buscar tipo de conexión"
              className="mb-4"
              placeholder="Buscar: WhatsApp, correo, agenda…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          )}

          {!form && categoriasVisibles.map((group) => (
            <section key={group.category} aria-labelledby={`alta-${group.category}`} className="mb-5">
              <h3 id={`alta-${group.category}`} className="mb-2 text-sm font-medium text-headline">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.items.map((type) => (
                  <li key={type.id}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!type.available}
                      onClick={() => elegir(type)}
                      className="h-auto min-h-14 w-full justify-between gap-3 whitespace-normal px-3 py-2.5 text-left font-normal"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <ChannelIcon id={type.id} />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm text-headline">{type.label}</span>
                          {type.description && <span className="text-xs text-text-soft">{type.description}</span>}
                        </span>
                      </span>
                      {type.available ? (
                        <ChevronRight className="h-4 w-4 shrink-0 text-text-soft" aria-hidden />
                      ) : (
                        <Badge variant="neutral">Próximamente</Badge>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {!form && filtro && categoriasVisibles.length === 0 && (
            <p className="text-sm text-text-soft">Ningún canal coincide con «{busqueda}».</p>
          )}

          {form && (
            <div className="flex flex-col gap-4">
              <Button type="button" variant="ghost" onClick={() => setForm(null)} className="self-start">
                <ChevronLeft className="h-4 w-4" aria-hidden /> Elegir otro tipo
              </Button>
              <JsonSchemaForm
                resourcePath="/api/connections/manual"
                method="POST"
                extraBody={{ type_id: form.type_id, label }}
                schema={form.schema}
                initialValues={form.values}
                configuredSecrets={form.configured_secrets}
                submitLabel="Guardar conexión"
                onSaved={() => {
                  setOpen(false);
                  setForm(null);
                  router.refresh();
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
