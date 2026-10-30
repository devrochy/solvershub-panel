import { respuestaDeAcceso } from "@/lib/api/access-respuesta";
import { apiFetch } from "@/lib/api/server";

/** BFF: feed de alertas de acceso con filtros y cursor («Cargar más»). */
export async function GET(request: Request) {
  const entrada = new URL(request.url).searchParams;
  const salida = new URLSearchParams();
  for (const clave of ["severidad", "tipo", "admin_id", "desde", "cursor"]) {
    const valor = entrada.get(clave);
    if (valor) salida.set(clave, valor);
  }
  const consulta = salida.toString();
  return respuestaDeAcceso(await apiFetch(`/access/events${consulta ? `?${consulta}` : ""}`));
}
