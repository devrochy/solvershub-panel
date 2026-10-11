import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

import { BusinessHoursForm } from "./_components/business-hours-form";

export const metadata = { title: "Horario de atención" };

type PluginConfig = {
  plugin_id: string;
  values: Record<string, unknown>;
};

const PLUGIN_ID = "pack_calendar";

export default async function CalendarHoursPage() {
  const res = await apiFetch<PluginConfig>(`/admin/plugins/${PLUGIN_ID}/config`);
  const hours = res.ok ? String(res.data.values?.business_hours ?? "") : "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Horario de atención"
        description="Días y horas en que el asistente puede agendar citas (habilidad Calendario)."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/calendario">← Volver a Calendario</Link>
          </Button>
        }
      />

      {!res.ok && (
        <p role="alert" className="text-status-danger-fg">
          No se pudo cargar la configuración de Calendario: {res.error}
        </p>
      )}

      <Card>
        <CardContent className="pt-5">
          <BusinessHoursForm pluginId={PLUGIN_ID} initialHours={hours} />
        </CardContent>
      </Card>
    </div>
  );
}
