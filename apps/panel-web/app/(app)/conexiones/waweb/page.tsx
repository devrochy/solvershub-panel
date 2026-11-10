import { redirect } from "next/navigation";

import { WawebPanel } from "@/app/(app)/conexiones/_components/waweb-panel";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { unicaDeTipo } from "@/lib/conexion-ficha";
import { cargarConsola } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "WhatsApp con QR" };

type State = {
  status: string;
  risk_ok: boolean;
  jid: string | null;
  qr_image: string | null;
  last_error: string | null;
};

/**
 * Alta de WhatsApp Web (HU-UX-09). La conexión nace al vincular el número: si ya existe, su
 * ficha (Estado); si no, el aviso de riesgo y el QR.
 */
export default async function WawebPage() {
  const consola = await cargarConsola();
  const existente = consola.ok ? unicaDeTipo(consola.data.items, "whatsapp_waweb") : null;
  if (existente) redirect(`/conexiones/${existente.id}/estado`);

  const res = await apiFetch<State>("/admin/meta/waweb");
  if (!res.ok) {
    return <ErrorDeCarga titulo="No se pudo preparar WhatsApp con QR" detalle={res.error} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Conectar WhatsApp con QR" description="Vincula el WhatsApp de un teléfono escaneando un código, como en WhatsApp Web." />

      <WawebPanel initial={res.data} />
    </div>
  );
}
