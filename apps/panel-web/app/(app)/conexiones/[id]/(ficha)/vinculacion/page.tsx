import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { WawebPanel } from "@/app/(app)/conexiones/_components/waweb-panel";
import { apiFetch } from "@/lib/api/server";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "Vinculación" };

type Estado = { status: string; risk_ok: boolean; jid: string | null; qr_image: string | null; last_error: string | null };

/** Vinculación de WhatsApp Web (antes `/conexiones/waweb`): aviso de riesgo, QR y reiniciar vínculo. */
export default async function VinculacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "vinculacion");
  if (!ficha) return null;
  const res = await apiFetch<Estado>("/admin/meta/waweb");
  return (
    <SeccionFicha titulo="Vinculación" descripcion="Vincula el número por QR desde WhatsApp → Dispositivos vinculados.">
      {res.ok ? (
        <WawebPanel initial={res.data} />
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudo cargar el canal WhatsApp Web: {res.error}
        </p>
      )}
    </SeccionFicha>
  );
}
