import { permanentRedirect } from "next/navigation";

/**
 * La pestaña Leads se retiró en el rediseño de Clientes: el embudo y el filtro «Con datos» viven dentro de
 * `/leads`. Esta ruta queda como redirección para los enlaces y marcadores viejos.
 */
export default async function LeadsCaptadosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = new URLSearchParams();
  for (const clave of ["q", "page", "orden", "vista"]) {
    const valor = sp[clave];
    if (typeof valor === "string" && valor) next.set(clave, valor);
  }
  const filtros = (Array.isArray(sp.filtro) ? sp.filtro : sp.filtro ? [sp.filtro] : []).filter(Boolean);
  if (!filtros.some((filtro) => filtro.startsWith("lead_datos:"))) filtros.push("lead_datos:con");
  for (const filtro of filtros) next.append("filtro", filtro);
  permanentRedirect(`/leads${next.size ? `?${next.toString()}` : ""}`);
}
