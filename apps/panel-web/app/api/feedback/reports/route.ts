import { CLAVE_DE_IDEMPOTENCIA, invalido, reenviar } from "@/app/api/feedback/proxy";
import { queryDeReportes } from "@/lib/feedback";

const CAMPOS = ["tipo", "area", "titulo", "descripcion"] as const;

/** Mis reportes (o los del negocio, para el propietario): solo `alcance`, `estado` y `cursor`. */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  return reenviar(`/reports${queryDeReportes({ alcance: sp.get("alcance"), estado: sp.get("estado"), cursor: sp.get("cursor") })}`, {
    method: "GET",
  });
}

/** Envía un reporte (multipart: los cuatro campos y hasta 5 `adjuntos`) con su `Idempotency-Key`. */
export async function POST(request: Request) {
  const clave = request.headers.get("Idempotency-Key")?.trim() ?? "";
  if (!CLAVE_DE_IDEMPOTENCIA.test(clave)) return invalido("Falta la clave del envío. Cierra el formulario y ábrelo de nuevo.");
  const recibido = await request.formData().catch(() => null);
  if (!recibido) return invalido();
  // Solo los campos que la API conoce: nunca se reenvía otra cosa.
  const form = new FormData();
  for (const campo of CAMPOS) {
    const valor = recibido.get(campo);
    if (typeof valor !== "string") return invalido();
    form.set(campo, valor);
  }
  for (const archivo of recibido.getAll("adjuntos")) {
    if (!(archivo instanceof Blob)) return invalido();
    form.append("adjuntos", archivo, archivo instanceof File && archivo.name ? archivo.name : "adjunto");
  }
  return reenviar("/reports", { method: "POST", body: form, idempotencyKey: clave });
}
