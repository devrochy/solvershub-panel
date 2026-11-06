import Link from "next/link";
import { redirect } from "next/navigation";

import { WawebPanel } from "@/app/(app)/conexiones/_components/waweb-panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { unicaDeTipo } from "@/lib/conexion-ficha";
import { cargarConsola } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "WhatsApp Web" };

type State = {
  status: string;
  risk_ok: boolean;
  jid: string | null;
  qr_image: string | null;
  last_error: string | null;
};

/**
 * Alta de WhatsApp Web (HU-UX-09). La conexión nace al vincular el número: si ya existe, su
 * ficha (Vinculación); si no, el aviso de riesgo y el QR.
 */
export default async function WawebPage() {
  const consola = await cargarConsola();
  const existente = consola.ok ? unicaDeTipo(consola.data.items, "whatsapp_waweb") : null;
  if (existente) redirect(`/conexiones/${existente.id}/vinculacion`);

  const res = await apiFetch<State>("/admin/meta/waweb");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el canal WhatsApp Web: {res.error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/conexiones">← Conexiones</Link>
      </Button>

      <PageHeader title="Conectar WhatsApp Web" description="Vincula un número propio por QR (canal no oficial, ADR-0074)." />

      <WawebPanel initial={res.data} />
    </div>
  );
}
