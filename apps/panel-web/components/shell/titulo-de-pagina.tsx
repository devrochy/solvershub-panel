"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { TenantSwitcher } from "@/components/shell/tenant-switcher";
import type { TenantOption } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Título de la página en la topbar al hacer scroll.
 *
 * El `h1` vive dentro de `main#contenido` (el único contenedor que scrollea) y la topbar
 * es su hermana. `PageHeader` publica el elemento y su texto aquí; `Topbar` los consume.
 * Cuando el `h1` empieza a ocultarse por arriba, la barra lo repite con una entrada desde
 * abajo. El `h1` real no se mueve ni se duplica para lectores de pantalla (`aria-hidden`).
 */
type Estado = {
  titulo: string | null;
  visible: boolean;
  registrar: (elemento: HTMLElement | null, titulo: string | null) => void;
};

const TituloDePaginaContext = createContext<Estado | null>(null);

/** Margen de histéresis: una vez visible, el título no se oculta hasta que el `h1` baja 8 px. */
const MARGEN = 8;

/**
 * ¿El `h1` ya empezó a ocultarse por arriba del contenedor de scroll? Con `yaVisible` se
 * exige que haya vuelto a bajar un poco, para no parpadear en el umbral.
 */
export function tituloFueraDeVista(rectTitulo: DOMRect, rectRaiz: DOMRect, yaVisible = false): boolean {
  return yaVisible ? rectTitulo.top < rectRaiz.top + MARGEN : rectTitulo.top < rectRaiz.top;
}

export function TituloDePaginaProvider({ children }: { children: ReactNode }) {
  const [elemento, setElemento] = useState<HTMLElement | null>(null);
  const [titulo, setTitulo] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);

  const registrar = useCallback((el: HTMLElement | null, texto: string | null) => {
    setElemento(el);
    setTitulo(texto);
    // Al desmontar el `h1` (navegación) se oculta de inmediato: no queda el título de la
    // página anterior en la barra mientras se registra el nuevo.
    if (!el) {
      visibleRef.current = false;
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!elemento) return;
    const raiz = document.getElementById("contenido");

    const medir = () => {
      const rectTitulo = elemento.getBoundingClientRect();
      // Sin contenedor (tests, páginas fuera del shell) se usa el borde superior de la ventana.
      const rectRaiz = raiz?.getBoundingClientRect() ?? ({ top: 0 } as DOMRect);
      const siguiente = tituloFueraDeVista(rectTitulo, rectRaiz, visibleRef.current);
      if (siguiente !== visibleRef.current) {
        visibleRef.current = siguiente;
        setVisible(siguiente);
      }
    };

    // Un solo cálculo por frame aunque el evento de scroll se dispare varias veces.
    let frame = 0;
    const alScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        medir();
      });
    };

    medir();
    // Segundo repaso en el frame siguiente: al navegar, `ScrollAlInicio` devuelve el scroll
    // a 0 después de que el `PageHeader` nuevo registre su `h1`.
    frame = requestAnimationFrame(() => {
      frame = 0;
      medir();
    });

    raiz?.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("resize", alScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      raiz?.removeEventListener("scroll", alScroll);
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("resize", alScroll);
    };
  }, [elemento]);

  return (
    <TituloDePaginaContext.Provider value={{ titulo, visible, registrar }}>
      {children}
    </TituloDePaginaContext.Provider>
  );
}

/** El `h1` de la página: se registra en el contexto para que la topbar pueda repetirlo. */
export function TituloDePagina({ title }: { title: string }) {
  const contexto = useContext(TituloDePaginaContext);
  const registrar = contexto?.registrar;
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!registrar) return;
    registrar(ref.current, title);
    return () => registrar(null, null);
  }, [registrar, title]);

  return (
    <h1 ref={ref} className="font-display text-sh-h1 tracking-tight text-headline">
      {title}
    </h1>
  );
}

/**
 * Zona izquierda de la topbar: menú, selector de negocio y el título que sube al hacer
 * scroll. En escritorio conviven; en celular el título reemplaza al nombre del negocio
 * mientras está visible (el selector vuelve al subir).
 */
export function ZonaDeTitulo({
  menu,
  current,
  count,
}: {
  menu?: ReactNode;
  current: TenantOption | null;
  count: number;
}) {
  const estado = useContext(TituloDePaginaContext);
  const visible = estado?.visible ?? false;
  const titulo = estado?.titulo ?? null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      {menu}
      <div className="grid min-w-0 flex-1 grid-cols-1 items-center md:flex md:flex-none">
        <div className={cn("col-start-1 row-start-1 min-w-0 md:order-1", visible && "max-md:invisible")}>
          <TenantSwitcher current={current} count={count} />
        </div>
        {titulo && (
          <div
            aria-hidden="true"
            data-titulo-barra={visible ? "visible" : "oculto"}
            className={cn(
              "col-start-1 row-start-1 flex h-6 min-w-0 items-center overflow-hidden md:order-2 md:ml-3 md:max-w-[36ch] md:border-l md:pl-3",
              "transition-[transform,opacity,border-color] duration-150 ease-sh-in",
              visible
                ? "translate-y-0 border-border-soft opacity-100 duration-200 ease-sh-out"
                : "translate-y-2 border-transparent opacity-0 max-md:invisible",
            )}
          >
            <span title={titulo} className="min-w-0 truncate font-display text-sm font-semibold text-headline">{titulo}</span>
          </div>
        )}
      </div>
    </div>
  );
}
