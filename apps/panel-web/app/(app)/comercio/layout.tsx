import type { ReactNode } from "react";

import { PestanasOpcionales } from "@/components/shell/pestanas-opcionales";
import type { ModulosComercio } from "@/lib/aliados";
import { apiFetch } from "@/lib/api/server";

/** Ventas (VEN-14): con el módulo de aliados encendido, Aliados sale como pestaña. */
export default async function VentasLayout({ children }: { children: ReactNode }) {
  const modulos = await apiFetch<ModulosComercio>("/pack/commerce/modulos");
  const encendidos = modulos.ok && modulos.data.aliados ? ["aliados"] : [];
  return <PestanasOpcionales modulos={encendidos}>{children}</PestanasOpcionales>;
}
