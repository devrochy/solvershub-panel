"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FormFeedback } from "@/components/ui/form-feedback";

const OTROS_ESTADOS: Record<string, { estado: string; label: string }[]> = {
  cumplida: [
    { estado: "pendiente", label: "Volver a pendiente" },
    { estado: "incumplida", label: "Marcar incumplida" },
  ],
  incumplida: [
    { estado: "pendiente", label: "Volver a pendiente" },
    { estado: "cumplida", label: "Marcar cumplida" },
  ],
};

/** Decide una promesa de un toque; una ya decidida se corrige desde su menú. */
export function PromiseStatus({ promiseId, estado, cliente }: { promiseId: string; estado: string; cliente: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ loading?: string; error?: string }>({});

  async function guardar(nuevo: string) {
    setState({ loading: nuevo });
    const res = await fetch(`/api/pack/cobranza/promises/${promiseId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevo }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setState({ error: json.error ?? "No se pudo cambiar el estado." });
      return;
    }
    setState({});
    router.refresh();
  }

  if (estado !== "pendiente") {
    return (
      <div className="flex items-center gap-2">
        <FormFeedback error={state.error} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="pointer-coarse:h-11 pointer-coarse:w-11"
              aria-label={`Cambiar el estado de la promesa de ${cliente}`}
              title="Cambiar el estado"
              disabled={Boolean(state.loading)}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {(OTROS_ESTADOS[estado] ?? []).map((o) => (
              <DropdownMenuItem key={o.estado} onSelect={() => void guardar(o.estado)}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <FormFeedback error={state.error} />
      <Button
        variant="ghost"
        className="pointer-coarse:h-11"
        disabled={Boolean(state.loading)}
        aria-label={`${cliente} no cumplió la promesa`}
        onClick={() => void guardar("incumplida")}
      >
        {state.loading === "incumplida" ? "Guardando…" : "No cumplió"}
      </Button>
      <Button
        variant="outline"
        className="pointer-coarse:h-11"
        disabled={Boolean(state.loading)}
        aria-label={`${cliente} cumplió la promesa`}
        onClick={() => void guardar("cumplida")}
      >
        {state.loading === "cumplida" ? "Guardando…" : "Cumplió"}
      </Button>
    </div>
  );
}
