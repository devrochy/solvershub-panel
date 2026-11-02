"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

/**
 * Aviso de «cambios sin guardar» de Configuración. Cada formulario declara si tiene cambios con
 * `useAvisarCambios`; el shell pregunta con `hayCambios()` antes de cambiar de sección (el formulario
 * se desmonta y lo escrito se perdería). Sin proveedor, los formularios funcionan igual y no avisan.
 */
interface Registro {
  marcar: (id: string, sucio: boolean) => void;
  /** ¿Algún formulario tiene cambios? `ignorar` deja fuera al que sigue montado al cambiar de sección. */
  hayCambios: (ignorar?: string) => boolean;
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

  // El navegador también avisa si se cierra la pestaña con cambios sin guardar.
  useEffect(() => {
    const alSalir = (evento: BeforeUnloadEvent) => {
      if (sucios.current.size === 0) return;
      evento.preventDefault();
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, []);

  return useMemo(() => ({ marcar, hayCambios }), [marcar, hayCambios]);
}

/** Un formulario avisa si tiene cambios sin guardar; al desmontarse deja de avisar. */
export function useAvisarCambios(id: string, sucio: boolean): void {
  const registro = useContext(Contexto);
  useEffect(() => {
    registro?.marcar(id, sucio);
    return () => registro?.marcar(id, false);
  }, [registro, id, sucio]);
}
