import { redirect } from "next/navigation";

import { unicaDeTipo } from "@/lib/conexion-ficha";
import { cargarConsola } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "Plantillas de WhatsApp" };

/**
 * Las plantillas viven en la WABA de cada número (HU-UX-09): con un solo WhatsApp oficial, su
 * pestaña Plantillas; con varios o ninguno, la lista de Conexiones.
 */
export default async function PlantillasGlobal() {
  const res = await cargarConsola();
  const unica = res.ok ? unicaDeTipo(res.data.items, "whatsapp_meta") : null;
  redirect(unica ? `/conexiones/${unica.id}/plantillas` : "/conexiones");
}
