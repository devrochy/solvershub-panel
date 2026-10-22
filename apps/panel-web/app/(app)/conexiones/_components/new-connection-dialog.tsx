"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      setError("Este tipo se configura en el panel clásico (abre el enlace ↗).");
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
  const categoriasVisibles = (categories ?? [])
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
          form ? form.description ?? undefined : "Elige el tipo de canal que quieres conectar."
        }
        className="max-w-2xl"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {error && <FormFeedback error={error} className="mb-4" />}

          {!form && categories && (
            <Input
              aria-label="Buscar tipo de conexión"
              className="mb-4"
              placeholder="Buscar canal… (ej.: WhatsApp, correo, QR)"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          )}

          {!form && categoriasVisibles.map((group) => (
            <div key={group.category} className="mb-5">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-text-soft">
                {group.label}
              </p>
              <ul className="flex flex-col gap-2">
                {group.items.map((type) => (
                  <li key={type.id}>
                    <button
                      type="button"
                      disabled={!type.available}
                      onClick={() => elegir(type)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md border border-border-soft px-3 py-2 text-left transition-colors hover:border-focus/50 hover:bg-focus/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border-soft disabled:hover:bg-transparent"
                    >
                      <span className="flex items-center gap-3">
                        <ChannelIcon id={type.id} />
                        <span className="flex flex-col">
                          <span className="text-sm text-headline">{type.label}</span>
                          {type.description && (
                            <span className="text-xs text-text-soft">{type.description}</span>
                          )}
                        </span>
                      </span>
                      {!type.available && <Badge variant="neutral">Próximamente</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {!form && filtro && categoriasVisibles.length === 0 && (
            <p className="text-sm text-text-soft">Sin canales que coincidan con «{busqueda}».</p>
          )}

          {!form && categories && (
            <p className="mt-2 text-xs text-text-soft">
              ¿El asistente falla?{" "}
              <Link href="/conexiones/whatsapp" className="text-link hover:underline">
                Carga manual de respaldo ↗
              </Link>
            </p>
          )}

          {form && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="self-start text-sm text-link hover:underline"
              >
                ← Elegir otro tipo
              </button>
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
