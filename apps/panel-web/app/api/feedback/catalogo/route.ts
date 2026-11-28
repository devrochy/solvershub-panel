import { reenviar } from "@/app/api/feedback/proxy";

/** Tipos, áreas y límites del formulario de reporte (404 = reportes apagados). */
export async function GET() {
  return reenviar("/catalogo", { method: "GET" });
}
