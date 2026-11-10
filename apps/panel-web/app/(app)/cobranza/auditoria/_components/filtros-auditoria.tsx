"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FiltrosDeAuditoria = { entidad?: string; operacion?: string; desde?: string; hasta?: string };

/** Filtros de Auditoría: cada cambio navega con la query nueva, sin botón «Filtrar». */
export function FiltrosAuditoria({
  sp,
  entidades,
  operaciones,
}: {
  sp: FiltrosDeAuditoria;
  entidades: { valor: string; etiqueta: string }[];
  operaciones: { valor: string; etiqueta: string }[];
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const activos = Boolean(sp.entidad || sp.operacion || sp.desde || sp.hasta);

  function navegar(cambio: FiltrosDeAuditoria) {
    const qs = new URLSearchParams();
    for (const [clave, valor] of Object.entries({ ...sp, ...cambio })) {
      if (valor) qs.set(clave, valor);
    }
    startTransition(() => router.push(`/cobranza/auditoria${qs.size ? `?${qs}` : ""}`));
  }

  return (
    <div aria-busy={pendiente || undefined} className={cn("grid w-full grid-cols-2 items-end gap-3 transition-opacity md:flex md:flex-wrap", pendiente && "opacity-70")}>
      <Field label="Qué cambió" htmlFor="entidad" className="md:w-44">
        <Select key={sp.entidad ?? ""} id="entidad" defaultValue={sp.entidad ?? ""} onChange={(e) => navegar({ entidad: e.target.value })}>
          <option value="">Todo</option>
          {entidades.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.etiqueta}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Operación" htmlFor="operacion" className="md:w-44">
        <Select key={sp.operacion ?? ""} id="operacion" defaultValue={sp.operacion ?? ""} onChange={(e) => navegar({ operacion: e.target.value })}>
          <option value="">Todas</option>
          {operaciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Desde" htmlFor="desde" className="md:w-44">
        <Input key={sp.desde ?? ""} id="desde" type="date" defaultValue={sp.desde ?? ""} onChange={(e) => navegar({ desde: e.target.value })} />
      </Field>
      <Field label="Hasta" htmlFor="hasta" className="md:w-44">
        <Input key={sp.hasta ?? ""} id="hasta" type="date" defaultValue={sp.hasta ?? ""} onChange={(e) => navegar({ hasta: e.target.value })} />
      </Field>
      {activos && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push("/cobranza/auditoria"))}
          className="col-span-2 min-h-11 justify-self-start rounded-sm text-sh-label text-link hover:underline focus-visible:outline-2 md:min-h-10"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
