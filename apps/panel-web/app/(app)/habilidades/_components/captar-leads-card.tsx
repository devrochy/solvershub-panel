import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

/** Acceso a Captar leads (HU-AOS-70): es del core, no un pack, así que no viene en `/admin/plugins`. */
export function CaptarLeadsCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-headline">Captar leads</h2>
          <p className="text-sm text-body">El formulario de tu página y los avisos de seguimiento de tus leads.</p>
        </div>
        <Link href="/habilidades/captar-leads" className="text-sm font-medium text-link underline-offset-4 hover:underline">
          Configurar
        </Link>
      </CardContent>
    </Card>
  );
}
