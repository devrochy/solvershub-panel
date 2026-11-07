import { redirect } from "next/navigation";

import { unicaDeTipo } from "@/lib/conexion-ficha";
import { cargarConsola } from "@/lib/conexion-ficha-servidor";

/** Producción global (HU-UX-09): con un solo WhatsApp oficial, su pestaña; si no, la lista. */
export default async function ProduccionGlobal() {
  const res = await cargarConsola();
  const unica = res.ok ? unicaDeTipo(res.data.items, "whatsapp_meta") : null;
  redirect(unica ? `/conexiones/${unica.id}/produccion` : "/conexiones");
}
