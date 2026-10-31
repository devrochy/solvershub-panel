"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * El shell ya no scrollea la ventana: el scroll vive en `main#contenido`. Al cambiar de
 * sección se vuelve arriba, como hacía el navegador con una página normal.
 */
export function ScrollAlInicio() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.getElementById("contenido");
    if (main) main.scrollTop = 0;
  }, [pathname]);

  return null;
}
