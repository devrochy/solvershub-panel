"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Recarga el hilo y la ficha (equivale al refresco del clásico). */
export function RefreshButton({ label = "Actualizar" }: { label?: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function refrescar() {
    setCargando(true);
    router.refresh();
    setTimeout(() => setCargando(false), 600);
  }

  return (
    <Button
      aria-label={label}
      disabled={cargando}
      onClick={() => void refrescar()}
      size="sm"
      title={label}
      variant="outline"
    >
      <RefreshCw className={cargando ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
      {label}
    </Button>
  );
}
