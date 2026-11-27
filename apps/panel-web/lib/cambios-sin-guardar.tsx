"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useConfirm } from "@/components/ui/confirm";

/**
 * Aviso de «cambios sin guardar» de Configuración. Cada formulario declara si tiene cambios con
 * `useAvisarCambios`; el shell pregunta con `hayCambios()` antes de cambiar de sección (el formulario
 * se desmonta y lo escrito se perdería). Sin proveedor, los formularios funcionan igual y no avisan.
 */
interface Registro {
  marcar: (id: string, sucio: boolean) => void;
  /** ¿Algún formulario tiene cambios? `ignorar` deja fuera al que sigue montado al cambiar de sección. */
  hayCambios: (ignorar?: string) => boolean;
  /** Ids de las secciones con cambios, para nombrarlas antes de descartar. */
  cambios: () => string[];
}

const Contexto = createContext<Registro | null>(null);

export function CambiosSinGuardarProvider({
  children,
  registro,
}: {
  children: ReactNode;
  /** Registro creado por `useRegistroDeCambios`, para que el shell lo consulte. */
  registro: Registro;
}) {
  return <Contexto.Provider value={registro}>{children}</Contexto.Provider>;
}

export function useRegistroDeCambios(): Registro {
  const sucios = useRef(new Set<string>());

  const marcar = useCallback((id: string, sucio: boolean) => {
    if (sucio) sucios.current.add(id);
    else sucios.current.delete(id);
  }, []);
  const hayCambios = useCallback(
    (ignorar?: string) => [...sucios.current].some((id) => id !== ignorar),
    [],
  );
  const cambios = useCallback(() => [...sucios.current], []);

  // El navegador también avisa si se cierra la pestaña con cambios sin guardar.
  useEffect(() => {
    const alSalir = (evento: BeforeUnloadEvent) => {
      if (sucios.current.size === 0) return;
      evento.preventDefault();
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, []);

  return useMemo(() => ({ marcar, hayCambios, cambios }), [marcar, hayCambios, cambios]);
}

/**
 * Una página entera que avisa al salir con cambios sin guardar (Editar agente, HU-AOS-78): lo de dentro
 * declara sus cambios con `useAvisarCambios`; un enlace interno a otra página (la salida de la cabecera,
 * las migas, el menú) pide confirmar antes de irse, y cerrar o recargar la pestaña lo avisa el navegador.
 */
export function AvisoAlSalir({
  children,
  descripcion = "Si sales ahora, se pierde lo que cambiaste y no guardaste.",
}: {
  children: ReactNode;
  descripcion?: string;
}) {
  const registro = useRegistroDeCambios();
  const confirm = useConfirm();
  const router = useRouter();

  useEffect(() => {
    // En captura y en el documento: corre antes que el `onClick` de `next/link` y frena su navegación.
    const alPulsar = (evento: MouseEvent) => {
      if (!registro.hayCambios() || evento.defaultPrevented) return;
      if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const enlace = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
      if (!(enlace instanceof HTMLAnchorElement) || enlace.hasAttribute("download")) return;
      if (enlace.target && enlace.target !== "_self") return;
      const destino = new URL(enlace.href, window.location.href);
      // Fuera del panel avisa el navegador; dentro de la misma página (`?paso=`) no se pierde nada.
      if (destino.origin !== window.location.origin || destino.pathname === window.location.pathname) return;
      evento.preventDefault();
      evento.stopPropagation();
      void confirm({
        title: "Tienes cambios sin guardar",
        description: descripcion,
        confirmLabel: "Descartar cambios",
        cancelLabel: "Seguir editando",
        destructive: true,
      }).then((salir) => {
        if (salir) router.push(`${destino.pathname}${destino.search}${destino.hash}`);
      });
    };
    document.addEventListener("click", alPulsar, true);
    return () => document.removeEventListener("click", alPulsar, true);
  }, [registro, confirm, router, descripcion]);

  return <CambiosSinGuardarProvider registro={registro}>{children}</CambiosSinGuardarProvider>;
}

/**
 * Un formulario avisa si tiene cambios sin guardar; al desmontarse deja de avisar. Acepta varios ids
 * cuando un mismo formulario pinta campos de varias secciones (Identidad, Horario, Voz y Calidad).
 */
export function useAvisarCambios(id: string | readonly string[], sucio: boolean): void {
  const registro = useContext(Contexto);
  // La clave evita re-ejecutar el efecto cuando el arreglo se recrea con los mismos ids.
  const clave = typeof id === "string" ? id : id.join("|");
  useEffect(() => {
    if (!registro) return;
    const ids = clave ? clave.split("|") : [];
    for (const seccion of ids) registro.marcar(seccion, sucio);
    return () => {
      for (const seccion of ids) registro.marcar(seccion, false);
    };
  }, [registro, clave, sucio]);
}
