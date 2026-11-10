"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** `<details>` que arranca abierto en escritorio y plegado en el celular, donde ocuparía media pantalla. */
export function TarjetaPlegable({
  abierta,
  className,
  children,
}: {
  abierta: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (abierta && ref.current && window.matchMedia?.("(max-width: 767px)").matches) ref.current.open = false;
  }, [abierta]);

  return (
    <details ref={ref} open={abierta} className={className}>
      {children}
    </details>
  );
}
