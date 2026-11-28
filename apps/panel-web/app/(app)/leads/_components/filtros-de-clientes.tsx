"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * En el celular los filtros viven en una sección plegada: se abre con el botón y se vuelve a cerrar al
 * enviar el formulario. En escritorio la sección siempre está visible y el botón no aparece.
 */
export function FiltrosDeClientes({ activos, children }: { activos: number; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = contenedor.current?.querySelector("form");
    if (!form) return;
    const cerrar = () => setAbierto(false);
    form.addEventListener("submit", cerrar);
    return () => form.removeEventListener("submit", cerrar);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="md:hidden"
        aria-expanded={abierto}
        aria-controls="filtros-de-clientes"
        onClick={() => setAbierto((valor) => !valor)}
      >
        {abierto ? <X className="h-4 w-4" aria-hidden /> : <SlidersHorizontal className="h-4 w-4" aria-hidden />}
        Filtros
        {activos > 0 && <span className="tabular-nums text-text-soft">({activos})</span>}
      </Button>
      <div
        id="filtros-de-clientes"
        ref={contenedor}
        className={cn("w-full md:block md:flex-1", abierto ? "block" : "hidden")}
      >
        {children}
      </div>
    </>
  );
}
