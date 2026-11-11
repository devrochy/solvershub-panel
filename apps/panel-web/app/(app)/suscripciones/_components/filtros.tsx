"use client";

import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BuscarEnUrl } from "@/components/domain/buscar-en-url";
import { CHARGE_STATUS, SUBSCRIPTION_SITUATION } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import {
  ESTADOS_PAGO,
  ESTADOS_SUSCRIPCION,
  PERIODICIDADES,
  TIPOS_PAGO,
  periodicidadLabel,
  tipoDePagoLabel,
  vistaDePagos,
  type OpcionDePlan,
} from "@/lib/suscripciones-admin";

type Cambios = Record<string, string | null>;

/** Lee y reescribe la URL: los filtros viven en ella y cada cambio vuelve a la primera página. */
function useFiltrosEnUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const href = (cambios: Cambios) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    return `${pathname}${next.size ? `?${next.toString()}` : ""}`;
  };
  return { sp, href, ir: (cambios: Cambios) => router.replace(href(cambios), { scroll: false }) };
}

type Opcion = { value: string; label: string };

/** «Filtros»: lo que se usa poco, en un menú que se aplica al elegir. */
function MasFiltros({ campos }: { campos: { clave: string; etiqueta: string; opciones?: Opcion[]; fecha?: boolean }[] }) {
  const { sp, ir } = useFiltrosEnUrl();
  const activos = campos.filter((c) => sp.get(c.clave)).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" aria-label={activos ? `Filtros, ${activos} activos` : "Filtros"}>
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          {activos ? `Filtros · ${activos}` : "Filtros"}
        </Button>
      </PopoverTrigger>
      <PopoverContent label="Más filtros" align="end" className="flex w-72 flex-col gap-3 p-4">
        {campos.map((c) => (
          <Field key={c.clave} label={c.etiqueta} htmlFor={`filtro-${c.clave}`}>
            {c.fecha ? (
              <Input
                id={`filtro-${c.clave}`}
                type="date"
                value={sp.get(c.clave) ?? ""}
                onChange={(e) => ir({ [c.clave]: e.target.value || null })}
              />
            ) : (
              <Select id={`filtro-${c.clave}`} value={sp.get(c.clave) ?? ""} onChange={(e) => ir({ [c.clave]: e.target.value || null })}>
                <option value="">Todos</option>
                {(c.opciones ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ))}
        {activos > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => ir(Object.fromEntries(campos.map((c) => [c.clave, null])))}
          >
            Quitar estos filtros
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

const VISTAS_SUSCRIPCIONES: { value: string; label: string; cambios: Cambios }[] = [
  { value: "", label: "Todas", cambios: { estado: null, con_mora: null } },
  { value: "mora", label: "En mora", cambios: { estado: null, con_mora: "1" } },
  { value: "trialing", label: "En prueba", cambios: { estado: "trialing", con_mora: null } },
  { value: "pausada", label: "Pausadas", cambios: { estado: "pausada", con_mora: null } },
  { value: "cancelada", label: "Canceladas", cambios: { estado: "cancelada", con_mora: null } },
];

/**
 * Filtros de la lista de suscripciones (SUS-05): la búsqueda filtra al escribir, los estados más
 * usados son un control segmentado y plan, periodicidad y los demás estados van en «Filtros».
 */
export function FiltrosSuscripciones({ planes }: { planes: OpcionDePlan[] }) {
  const { sp, href } = useFiltrosEnUrl();
  const conMora = sp.get("con_mora") === "1" || sp.get("con_mora") === "true";
  const estado = sp.get("estado") ?? "";
  // Un estado que no tiene segmento (`?estado=activa`, del Resumen) deja el control sin selección.
  const actual = conMora ? "mora" : !estado ? "" : VISTAS_SUSCRIPCIONES.some((v) => v.value === estado) ? estado : "otro";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <BuscarEnUrl label="Buscar por cliente, teléfono o plan" placeholder="Buscar un cliente" className="w-72 max-w-full" />
      <div className="max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:overflow-x-auto max-sm:px-4">
        <SegmentedControl
          label="Qué suscripciones ver"
          value={actual}
          options={VISTAS_SUSCRIPCIONES.map((v) => ({ value: v.value, label: v.label, href: href(v.cambios) }))}
          className="w-max"
        />
      </div>
      <MasFiltros
        campos={[
          {
            clave: "estado",
            etiqueta: "Estado",
            opciones: ESTADOS_SUSCRIPCION.map((e) => ({ value: e, label: SUBSCRIPTION_SITUATION[e].label })),
          },
          ...(planes.length > 0 ? [{ clave: "plan", etiqueta: "Plan", opciones: planes }] : []),
          { clave: "periodicidad", etiqueta: "Se cobra", opciones: PERIODICIDADES.map((p) => ({ value: p, label: periodicidadLabel(p) })) },
        ]}
      />
    </div>
  );
}

const VISTAS_PAGOS: { value: string; label: string; cambios: Cambios }[] = [
  { value: "por_cobrar", label: "Por cobrar", cambios: { ver: null, estado: "pendiente", vencidos: null } },
  { value: "vencidos", label: "Vencidos", cambios: { ver: null, estado: null, vencidos: "1" } },
  { value: "pagados", label: "Pagados", cambios: { ver: null, estado: "pagado", vencidos: null } },
  { value: "todos", label: "Todos", cambios: { ver: "todos", estado: null, vencidos: null } },
];

/** Filtros de los pagos (SUS-12): empieza por lo que hay que cobrar; tipo y fechas en «Filtros». */
export function FiltrosPagos() {
  const { sp, href } = useFiltrosEnUrl();
  const vista = vistaDePagos(Object.fromEntries(sp.entries()));
  return (
    <div className="flex flex-wrap items-center gap-3">
      <BuscarEnUrl label="Buscar por cliente, teléfono o plan" placeholder="Buscar un cliente" className="w-72 max-w-full" />
      <div className="max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:overflow-x-auto max-sm:px-4">
        <SegmentedControl
          label="Qué pagos ver"
          value={vista}
          options={VISTAS_PAGOS.map((v) => ({ value: v.value, label: v.label, href: href(v.cambios) }))}
          className="w-max"
        />
      </div>
      <MasFiltros
        campos={[
          { clave: "tipo", etiqueta: "Tipo de cobro", opciones: TIPOS_PAGO.map((t) => ({ value: t, label: tipoDePagoLabel(t) })) },
          ...(vista === "todos"
            ? [{ clave: "estado", etiqueta: "Estado", opciones: ESTADOS_PAGO.map((e) => ({ value: e, label: CHARGE_STATUS[e].label })) }]
            : []),
          { clave: "desde", etiqueta: "Vence desde", fecha: true },
          { clave: "hasta", etiqueta: "Vence hasta", fecha: true },
        ]}
      />
    </div>
  );
}

/** Filtros de los clientes con suscripción (SUS-11). */
export function FiltrosClientes() {
  const { sp, href, ir } = useFiltrosEnUrl();
  const conMora = sp.get("con_mora") === "1" || sp.get("con_mora") === "true";
  const canceladas = sp.get("incluir_canceladas") === "1" || sp.get("incluir_canceladas") === "true";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <BuscarEnUrl label="Buscar por nombre o teléfono" className="w-72 max-w-full" />
      <SegmentedControl
        label="Qué clientes ver"
        value={conMora ? "mora" : ""}
        options={[
          { value: "", label: "Todos", href: href({ con_mora: null }) },
          { value: "mora", label: "Con mora", href: href({ con_mora: "1" }) },
        ]}
        className="w-max"
      />
      <Checkbox
        id="incluir-canceladas"
        label="Incluir quienes cancelaron"
        checked={canceladas}
        onCheckedChange={(v) => ir({ incluir_canceladas: v ? "1" : null })}
      />
    </div>
  );
}
