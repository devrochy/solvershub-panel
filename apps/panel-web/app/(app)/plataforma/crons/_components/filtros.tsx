import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ESTADOS_CRON, ESTADO_CRON_LABEL, type FiltrosCrons } from "@/lib/crons";

/** Filtros de la lista de crons. Formulario GET: la URL es el estado. */
export function FiltrosDeCrons({ sp, modulos }: { sp: FiltrosCrons; modulos: string[] }) {
  const activos = Boolean(sp.q || sp.estado || sp.module);
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <Field label="Buscar" htmlFor="q" className="w-60">
        <Input id="q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Nombre o descripción" />
      </Field>
      <Field label="Módulo" htmlFor="module" className="w-52">
        <Select id="module" name="module" defaultValue={sp.module ?? ""}>
          <option value="">Todos</option>
          {modulos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Estado" htmlFor="estado" className="w-44">
        <Select id="estado" name="estado" defaultValue={sp.estado ?? ""}>
          <option value="">Todos</option>
          {ESTADOS_CRON.map((e) => (
            <option key={e} value={e}>
              {ESTADO_CRON_LABEL[e]}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {activos && (
        <Link href="/plataforma/crons" className="pb-2.5 text-sm text-link hover:underline">
          Limpiar
        </Link>
      )}
    </form>
  );
}
