"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SearchInput } from "@/components/ui/search-input";

/**
 * Búsqueda que filtra mientras se escribe (PLT-01, PLT-09): escribe `?q=` en la URL con una pausa
 * corta, conserva los demás filtros y vuelve a la primera página. Sin botón «Filtrar».
 */
export function BuscarEnUrl({
  label,
  placeholder,
  param = "q",
  className,
}: {
  label: string;
  placeholder?: string;
  param?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const inicial = sp.get(param) ?? "";
  const [texto, setTexto] = useState(inicial);
  const ultimo = useRef(inicial);

  useEffect(() => {
    if (texto.trim() === ultimo.current) return;
    const espera = setTimeout(() => {
      ultimo.current = texto.trim();
      const next = new URLSearchParams(sp.toString());
      if (texto.trim()) next.set(param, texto.trim());
      else next.delete(param);
      next.delete("page");
      router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
    }, 300);
    return () => clearTimeout(espera);
    // Solo importa el texto: la URL vigente se lee al momento de escribirla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return <SearchInput label={label} placeholder={placeholder ?? label} value={texto} onChange={setTexto} className={className} />;
}
