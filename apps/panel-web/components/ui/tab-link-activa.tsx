"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import Link from "next/link";

/**
 * La pestaña activa de `TabLinks` compacto: al montar desplaza solo la fila de pestañas (no la
 * página) para que quede a la vista. Con `scrollIntoView` la página saltaría hasta las pestañas
 * cuando están bajo el primer pantallazo.
 */
export function TabLinkActiva(props: ComponentProps<typeof Link>) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const enlace = ref.current;
    const fila = enlace?.closest("nav");
    if (!enlace || !fila || fila.scrollWidth <= fila.clientWidth) return;
    const caja = fila.getBoundingClientRect();
    const pestana = enlace.getBoundingClientRect();
    if (pestana.right > caja.right) fila.scrollLeft += pestana.right - caja.right;
    else if (pestana.left < caja.left) fila.scrollLeft -= caja.left - pestana.left;
  }, []);
  return <Link ref={ref} {...props} />;
}
