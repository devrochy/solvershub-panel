import Link from "next/link";

import { MetaHealthActions } from "@/app/(app)/conexiones/meta/_components/meta-health-actions";
import { MetaHealthChecks } from "@/app/(app)/conexiones/meta/_components/meta-health-checks";
import { WebhookRegister } from "@/app/(app)/conexiones/meta/_components/webhook-register";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import { formatDate, formatDateTime } from "@/lib/format";
import { ANCLA_WEBHOOKS, anclaFacturacion } from "@/lib/meta-salud";

export const metadata = { title: "Salud de Meta" };

type HealthConnection = components["schemas"]["HealthConnection"];

type Subscription = components["schemas"]["SubscriptionItem"];

const ORIGENES: Record<string, string> = {
  byok: "App propia",
  embedded_signup: "Conectada con Facebook",
  manual: "Carga manual",
};

export default async function MetaHealthPage() {
  const [healthRes, webhooksRes] = await Promise.all([
    apiFetch<{ connections: HealthConnection[] }>("/admin/meta/health"),
    apiFetch<{ subscriptions: Subscription[] }>("/admin/meta/webhooks"),
  ]);

  if (!healthRes.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar la salud de Meta: {healthRes.error}
      </p>
    );
  }
  const connections = healthRes.data.connections;
  const subscriptions = webhooksRes.ok ? webhooksRes.data.subscriptions : [];

  const columns: Column<Subscription>[] = [
    {
      key: "canal",
      header: "Canal",
      cell: (s) => <Badge variant="neutral">{s.channel}</Badge>,
    },
    {
      key: "app",
      header: "App de Meta",
      cell: (s) => (
        <span className="text-body">
          {s.uses_platform_app ? "De la plataforma" : (ORIGENES[s.origin] ?? s.origin)}
        </span>
      ),
    },
    { key: "objeto", header: "Objeto", cell: (s) => <span className="text-body">{s.object}</span> },
    {
      key: "callback",
      header: "Callback",
      cell: (s) => (
        <span className="block max-w-xs truncate font-mono text-xs text-body">
          {s.callback_url ?? "—"}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (s) =>
        s.active === null ? (
          <Badge variant="neutral">sin datos</Badge>
        ) : (
          <Badge variant={s.active ? "success" : "danger"}>{s.active ? "Activa" : "Inactiva"}</Badge>
        ),
    },
    {
      key: "error",
      header: "Último error",
      cell: (s) => (
        <span className="block max-w-xs truncate text-xs text-danger">{s.last_error ?? "—"}</span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (s) => (
        <WebhookRegister
          connectionId={s.connection_id}
          canRegister={s.can_register}
          usesPlatformApp={s.uses_platform_app}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/conexiones">← Volver</Link>
        </Button>
      </div>

      <PageHeader
        title="Salud de Meta"
        description="Diagnóstico de las conexiones de WhatsApp y estado de las suscripciones de webhook."
      />

      {connections.length === 0 ? (
        <EmptyState
          title="Sin conexiones de Meta"
          description="Conecta WhatsApp Business para ver aquí su diagnóstico."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {connections.map((c) => {
            const billing = c.billing_manual_status ?? "";
            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>{c.channel}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{c.environment}</Badge>
                      <Badge
                        variant={
                          c.status === "connected"
                            ? "success"
                            : c.status === "error"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-text-soft">
                    Último chequeo: {formatDateTime(c.last_health_check_at)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-text-soft">Token:</span>
                    {c.token_expires_at ? (
                      (() => {
                        const days = Math.ceil(
                          (new Date(c.token_expires_at).getTime() - Date.now()) / 86400000,
                        );
                        const expired = days <= 0;
                        const soon = days > 0 && days <= 7;
                        return (
                          <Badge variant={expired ? "danger" : soon ? "warning" : "neutral"}>
                            {expired
                              ? "vencido"
                              : `vence en ${days} día${days === 1 ? "" : "s"} (${formatDate(c.token_expires_at)})`}
                          </Badge>
                        );
                      })()
                    ) : (
                      <span className="text-text-soft">sin fecha</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {c.status_reason && <p className="text-sm text-body">{c.status_reason}</p>}

                  <MetaHealthChecks connectionId={c.id} checks={c.checks ?? []} />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/conexiones/meta/${c.id}/numeros`}>Números</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/conexiones/meta/${c.id}/plantillas`}>Plantillas</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/conexiones/meta/${c.id}/produccion`}>Producción</Link>
                    </Button>
                  </div>

                  <div id={anclaFacturacion(c.id)} className="scroll-mt-20">
                    <MetaHealthActions connectionId={c.id} billingStatus={billing} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <section id={ANCLA_WEBHOOKS} className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Suscripciones de webhook</h2>
        <DataTable
          columns={columns}
          rows={subscriptions}
          getRowKey={(s) => s.connection_id}
          emptyTitle="Sin suscripciones"
          emptyDescription="Aparecerán aquí cuando haya canales de Meta conectados."
        />
      </section>
    </div>
  );
}
