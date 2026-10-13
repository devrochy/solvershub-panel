import { reenviarQa } from "@/lib/api/qa-proxy";

/** BFF del centro de pruebas (SPEC-30): lista blanca de rutas en `lib/api/qa-proxy.ts`. */
type Contexto = { params: Promise<{ ruta: string[] }> };

async function manejar(request: Request, { params }: Contexto) {
  const { ruta } = await params;
  return reenviarQa(request, ruta);
}

export { manejar as DELETE, manejar as GET, manejar as POST, manejar as PUT };
