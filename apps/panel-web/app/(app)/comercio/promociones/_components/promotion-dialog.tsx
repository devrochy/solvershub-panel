"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Promotion = {
  id: string;
  type: string;
  rules: Record<string, unknown>;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
};

const TYPES = ["temporada", "volumen", "campaña"];

/** Alta/edición de promoción (reglas en JSON). */
export function PromotionDialog({ promotion }: { promotion?: Promotion }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rawRules = String(data.get("rules") ?? "").trim();
    let rules: Record<string, unknown> = {};
    if (rawRules) {
      try {
        rules = JSON.parse(rawRules) as Record<string, unknown>;
      } catch {
        setStatus({ error: "Las reglas deben ser JSON válido." });
        return;
      }
    }
    setStatus({ loading: true });
    const res = await fetch("/api/pack/commerce/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promotion_id: promotion?.id ?? null,
        type: String(data.get("type") ?? "temporada"),
        rules,
        valid_from: String(data.get("valid_from") ?? "") || null,
        valid_to: String(data.get("valid_to") ?? "") || null,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar la promoción." });
      return;
    }
    setStatus({});
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {promotion ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button variant="accent">Nueva promoción</Button>
        )}
      </DialogTrigger>
      <DialogContent
        title={promotion ? "Editar promoción" : "Nueva promoción"}
        description="Tipo, reglas (JSON) y vigencia."
        className="max-w-xl"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Tipo" htmlFor="pr-type">
            <select
              id="pr-type"
              name="type"
              defaultValue={promotion?.type ?? "temporada"}
              className="h-10 w-full rounded-md border border-control-border bg-bg-deep px-3 text-sm text-headline"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Reglas (JSON)"
            htmlFor="pr-rules"
            help='Ej.: {"discount_pct": 10} o {"min_quantity": 3, "discount_pct": 15}'
          >
            <Textarea
              id="pr-rules"
              name="rules"
              rows={4}
              defaultValue={promotion ? JSON.stringify(promotion.rules, null, 2) : ""}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vigente desde" htmlFor="pr-from">
              <Input id="pr-from" name="valid_from" type="date" defaultValue={promotion?.valid_from?.slice(0, 10) ?? ""} />
            </Field>
            <Field label="Vigente hasta" htmlFor="pr-to">
              <Input id="pr-to" name="valid_to" type="date" defaultValue={promotion?.valid_to?.slice(0, 10) ?? ""} />
            </Field>
          </div>

          <FormFeedback error={status.error} />

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar promoción"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Activa/desactiva una promoción. */
export function PromotionToggle({ promotionId, active }: { promotionId: string; active: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(active);
  const [loading, setLoading] = useState(false);

  async function toggle(next: boolean) {
    setValue(next);
    setLoading(true);
    await fetch(`/api/pack/commerce/promotions/${promotionId}/toggle`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Switch checked={value} onCheckedChange={(next) => void toggle(next)} disabled={loading} aria-label="Activar promoción" />
      <span className="text-xs text-body">{value ? "Activa" : "Inactiva"}</span>
    </div>
  );
}
