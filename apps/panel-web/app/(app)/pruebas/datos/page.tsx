import { apiFetch } from "@/lib/api/server";
import type { QaCatalogo, QaMisDatos } from "@/lib/api/types";

import { DatosDePrueba } from "../_components/datos-de-prueba";

export const metadata = { title: "Datos de prueba" };

/**
 * Pruebas › Datos de prueba (HU-QA-07): el negocio y las cuentas propias del tester, que se
 * preparan con un botón (solo en test), y la guía de los datos externos (Wompi, WhatsApp,
 * correo…) que enlaza cada prueba.
 */
export default async function DatosDePruebaPage() {
  const [datos, guia] = await Promise.all([
    apiFetch<QaMisDatos>("/admin/qa/datos"),
    apiFetch<QaCatalogo>("/admin/qa/catalog?seccion=datos"),
  ]);
  if (!datos.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar tus datos de prueba: {datos.error}
      </p>
    );
  }
  return <DatosDePrueba inicial={datos.data} guia={guia.ok ? guia.data.items : []} />;
}
