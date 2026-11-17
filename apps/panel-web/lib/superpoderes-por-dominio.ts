import type { components } from "@/lib/api/schema";

type Superpower = components["schemas"]["Superpower"];

export type DominioDeSuperpoderes<T> = { key: string; label: string; items: T[] };

/**
 * Superpoderes agrupados por dominio (SPEC-48, HU-AOS-83): «Ventas», «Formas de pago», «Agenda»…
 * El dominio lo declara el pack (`group`/`group_label`); uno sin dominio cae en «Otros», al final.
 * Conserva el orden de la API dentro de cada dominio y el orden de aparición entre dominios.
 */
export function agruparPorDominio<T extends Pick<Superpower, "group" | "group_label">>(
  superpoderes: T[],
): DominioDeSuperpoderes<T>[] {
  const grupos = new Map<string, DominioDeSuperpoderes<T>>();
  for (const poder of superpoderes) {
    const key = poder.group || "otros";
    const label = key === "otros" ? "Otros" : poder.group_label || "Otros";
    if (!grupos.has(key)) grupos.set(key, { key, label, items: [] });
    grupos.get(key)!.items.push(poder);
  }
  const lista = [...grupos.values()];
  return [...lista.filter((g) => g.key !== "otros"), ...lista.filter((g) => g.key === "otros")];
}
