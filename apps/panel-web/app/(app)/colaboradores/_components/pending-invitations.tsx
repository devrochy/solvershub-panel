"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Invitacion = { id: string; slug: string; nombre: string; rol: string };

/** Invitaciones pendientes del usuario: aceptar/rechazar (ADR-0081). */
export function PendingInvitations() {
  const router = useRouter();
  const [items, setItems] = useState<Invitacion[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch("/api/invitations")
      .then((r) => r.json())
      .then((d: { items?: Invitacion[] }) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  async function resolver(id: string, action: "accept" | "reject") {
    setBusy(id);
    setError(undefined);
    const res = await fetch(`/api/invitations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "No se pudo resolver la invitación.");
      return;
    }
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    router.refresh();
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitaciones pendientes</CardTitle>
        <CardDescription>
          Un negocio te invitó a unirte. Al aceptar, tendrás acceso según el rol indicado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-headline">
              {inv.nombre}
              <Badge variant="neutral">{inv.rol}</Badge>
            </span>
            <div className="flex gap-2">
              <Button
                disabled={busy === inv.id}
                onClick={() => resolver(inv.id, "accept")}
                size="sm"
                variant="accent"
              >
                Aceptar
              </Button>
              <Button
                disabled={busy === inv.id}
                onClick={() => resolver(inv.id, "reject")}
                size="sm"
                variant="ghost"
              >
                Rechazar
              </Button>
            </div>
          </div>
        ))}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
