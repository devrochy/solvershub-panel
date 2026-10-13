"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { QaTesterInvitado, QaTesterOut, QaTestersOut } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/lib/toast-store";

import { llamarQa } from "./api";

const ESTADO: Record<QaTesterOut["estado"], { label: string; badge: "success" | "info" | "warning" | "neutral" }> = {
  activo: { label: "Activo", badge: "success" },
  invitado: { label: "Invitado", badge: "info" },
  vencido: { label: "Invitación vencida", badge: "warning" },
  revocado: { label: "Revocado", badge: "neutral" },
};

function EstadoTester({ estado }: { estado: QaTesterOut["estado"] }) {
  const { label, badge } = ESTADO[estado];
  return badge === "neutral" ? <Badge>{label}</Badge> : <Badge variant={badge}>{label}</Badge>;
}

/**
 * Testers del centro de pruebas (HU-QA-04, ADR-0134). Un tester actúa como master en test
 * salvo Colaboradores. Se invita por correo con un enlace de un solo uso; si el correo de
 * sistema no está configurado, el enlace se muestra aquí para compartirlo a mano.
 */
export function GestionDeTesters({ inicial }: { inicial: QaTestersOut }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enlace, setEnlace] = useState<{ email: string; url: string } | null>(null);

  async function invitar(correo: string) {
    setEnviando(true);
    const r = await llamarQa<QaTesterInvitado>("testers", { method: "POST", json: { email: correo } });
    setEnviando(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    if (r.data.enlace) {
      setEnlace({ email: correo, url: r.data.enlace });
      toast.success("Invitación creada. El correo no salió: comparte el enlace a mano.");
    } else {
      setEnlace(null);
      toast.success(`Invitación enviada a ${correo}.`);
    }
    setEmail("");
    router.refresh();
  }

  async function revocar(t: QaTesterOut) {
    const ok = await confirm({
      title: `¿Revocar a ${t.email}?`,
      description: "Su sesión deja de funcionar en el siguiente pedido, en el panel y en la app. Puedes volver a invitarle después.",
      confirmLabel: "Revocar acceso",
      destructive: true,
    });
    if (!ok) return;
    const r = await llamarQa<QaTesterOut>(`testers/${t.id}/revoke`, { method: "POST" });
    if (!r.ok) toast.error(r.error);
    else {
      toast.success(`Revocaste el acceso de ${t.email}.`);
      router.refresh();
    }
  }

  const columnas: Column<QaTesterOut>[] = [
    { key: "email", header: "Correo", cell: (t) => <span className="text-headline">{t.email}</span> },
    { key: "estado", header: "Estado", cell: (t) => <EstadoTester estado={t.estado} /> },
    { key: "invitado", header: "Invitado", cell: (t) => formatDateTime(t.invitado_en) },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (t) => (
        <div className="flex justify-end gap-2">
          {t.estado !== "activo" && (
            <Button size="sm" variant="outline" disabled={enviando || !inicial.habilitado} onClick={() => void invitar(t.email)}>
              {t.estado === "revocado" ? "Volver a invitar" : "Reenviar invitación"}
            </Button>
          )}
          {t.estado !== "revocado" && (
            <Button size="sm" variant="ghost" onClick={() => void revocar(t)}>
              Revocar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {!inicial.habilitado && (
        <p role="status" className="rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          El rol tester no está habilitado en este entorno. Se activa con <code className="font-mono">QA_TESTERS_ENABLED=true</code>{" "}
          en app, worker y beat, y solo en test: en producción un tester vería datos reales de clientes.
        </p>
      )}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-sh-block text-headline">Invitar un tester</h2>
            <p className="max-w-prose text-sm text-body">
              Un tester entra al panel de test con los permisos de un master, salvo Colaboradores: no gestiona cuentas.
              Usa una cuenta propia, solo para pruebas. El enlace sirve una vez y vence en 7 días.
            </p>
          </div>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) void invitar(email.trim());
            }}
          >
            <Field label="Correo del tester" htmlFor="correo-tester" className="min-w-64 flex-1">
              <Input
                id="correo-tester"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!inicial.habilitado}
                required
              />
            </Field>
            <Button type="submit" variant="accent" loading={enviando} disabled={!inicial.habilitado || !email.trim()}>
              <UserPlus aria-hidden className="h-4 w-4" />
              Enviar invitación
            </Button>
          </form>
          {enlace && (
            <div className="flex flex-col gap-2 rounded-md border border-status-info-border bg-status-info-bg p-3 text-sm" role="status">
              <span className="text-headline">
                Enlace de un solo uso para {enlace.email}. Compártelo por un canal privado:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-sm bg-surface px-2 py-1 font-mono text-xs text-headline">
                  {enlace.url}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(enlace.url).then(
                      () => toast.success("Enlace copiado."),
                      () => toast.error("No se pudo copiar: selecciónalo y cópialo a mano."),
                    );
                  }}
                >
                  <Copy aria-hidden className="h-4 w-4" /> Copiar enlace
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <DataTable
        caption="Testers"
        columns={columnas}
        rows={inicial.testers}
        getRowKey={(t) => t.id}
        emptyTitle="Todavía no invitaste testers"
        emptyDescription="Invita a alguien de tu equipo o a un tester externo con el formulario de arriba."
      />
    </div>
  );
}
