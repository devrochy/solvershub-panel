import Link from "next/link";

import { WawebPanel } from "@/app/(app)/conexiones/waweb/_components/waweb-panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "WhatsApp Web" };

type State = { status: string; risk_ok: boolean; jid: string | null; qr_image: string | null };

export default async function WawebPage() {
  const res = await apiFetch<State>("/admin/meta/waweb");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar el canal WhatsApp Web: {res.error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/conexiones">← Volver</Link>
      </Button>

      <PageHeader
        title="WhatsApp Web"
        description="Vincula un número propio por QR (canal no oficial, ADR-0074)."
      />

      <WawebPanel initial={res.data} />
    </div>
  );
}
