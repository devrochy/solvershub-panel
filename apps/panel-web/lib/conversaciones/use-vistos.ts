"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  CLAVE_VISTOS as CLAVE,
  estaVisto,
  guardarVistos,
  leerVistos,
  marcarVisto,
  type Vistos,
} from "./vistos";

const VACIO: Vistos = {};

type Cache = { crudo: string | null; vistos: Vistos };

let cache: Cache | null = null;
const oyentes = new Set<() => void>();

/**
 * Snapshot estable: se reutiliza mientras el valor guardado no cambie. El servidor usa
 * `VACIO`, así la hidratación coincide y la píldora se oculta justo después de montar.
 */
function leer(): Vistos {
  let crudo: string | null = null;
  try {
    crudo = window.localStorage.getItem(CLAVE);
  } catch {
    /* sin almacenamiento */
  }
  if (cache && cache.crudo === crudo) return cache.vistos;
  cache = { crudo, vistos: leerVistos() };
  return cache.vistos;
}

function suscribir(notificar: () => void) {
  oyentes.add(notificar);
  return () => {
    oyentes.delete(notificar);
  };
}

function escribir(vistos: Vistos) {
  guardarVistos(vistos);
  try {
    cache = { crudo: window.localStorage.getItem(CLAVE), vistos };
  } catch {
    cache = { crudo: null, vistos };
  }
  oyentes.forEach((notificar) => notificar());
}

type ChatConActividad = {
  id: string;
  last_message_at?: string | null;
  started_at: string;
};

/** Marcas de «visto» del dispositivo, compartidas por todos los componentes de la bandeja. */
export function useVistos() {
  const vistos = useSyncExternalStore(suscribir, leer, () => VACIO);

  const marcar = useCallback((id: string, actividad: string) => {
    const actuales = leer();
    const siguiente = marcarVisto(actuales, id, actividad);
    if (siguiente !== actuales) escribir(siguiente);
  }, []);

  const visto = useCallback((chat: ChatConActividad) => estaVisto(vistos, chat), [vistos]);

  return { marcar, visto };
}
