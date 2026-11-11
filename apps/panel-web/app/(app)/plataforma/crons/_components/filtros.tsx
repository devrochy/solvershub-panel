import { BuscarEnUrl } from "@/components/domain/buscar-en-url";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { FiltrosCrons } from "@/lib/crons";

const VISTAS = [
  { value: "", label: "Todos" },
  { value: "failing", label: "Con fallo" },
  { value: "paused", label: "En pausa" },
  { value: "atrasados", label: "Atrasados" },
];

/**
 * Filtros de Crons (PLT-09): la búsqueda filtra al escribir y el estado es un control segmentado
 * que se aplica al tocarlo. «Atrasados» lo resuelve la página: la API no lo filtra.
 */
export function FiltrosDeCrons({ sp }: { sp: FiltrosCrons & { vista?: string } }) {
  const actual = sp.vista === "atrasados" ? "atrasados" : (sp.estado ?? "");
  const href = (valor: string) => {
    const qs = new URLSearchParams();
    if (sp.q) qs.set("q", sp.q);
    if (sp.module) qs.set("module", sp.module);
    if (valor === "atrasados") qs.set("vista", "atrasados");
    else if (valor) qs.set("estado", valor);
    return `/plataforma/crons${qs.size ? `?${qs.toString()}` : ""}`;
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <BuscarEnUrl label="Buscar un cron" placeholder="Buscar un cron" className="w-72 max-w-full" />
      <div className="max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:overflow-x-auto max-sm:px-4">
        <SegmentedControl
          label="Qué crons ver"
          value={VISTAS.some((v) => v.value === actual) ? actual : ""}
          options={VISTAS.map((v) => ({ value: v.value, label: v.label, href: href(v.value) }))}
          className="w-max"
        />
      </div>
    </div>
  );
}
