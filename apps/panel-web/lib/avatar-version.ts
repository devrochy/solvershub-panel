"use client";

import { useSyncExternalStore } from "react";

/**
 * Estado compartido del avatar propio (SPEC-34): al subir o quitar la foto, la tarjeta del
 * menú y la sección de perfil deben reflejarlo al instante. Guarda una `version` (para romper
 * la caché del `<img>` del BFF) y una `preview` (object URL del archivo recién subido).
 */
export type EstadoAvatar = { version: number; preview: string | null };

let estado: EstadoAvatar = { version: 0, preview: null };
const oyentes = new Set<() => void>();

function emitir() {
  oyentes.forEach((notificar) => notificar());
}

function suscribir(notificar: () => void) {
  oyentes.add(notificar);
  return () => {
    oyentes.delete(notificar);
  };
}

function leer(): EstadoAvatar {
  return estado;
}

export function useAvatarPerfil(): EstadoAvatar {
  return useSyncExternalStore(suscribir, leer, leer);
}

/** Marca una foto recién subida; `preview` es un object URL para verla sin esperar al servidor. */
export function marcarAvatarSubido(preview: string | null) {
  if (estado.preview && estado.preview !== preview && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(estado.preview);
  }
  estado = { version: estado.version + 1, preview };
  emitir();
}

/** Marca la foto quitada: la próxima lectura muestra las iniciales. */
export function marcarAvatarQuitado() {
  if (estado.preview && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(estado.preview);
  }
  estado = { version: estado.version + 1, preview: null };
  emitir();
}

/** URL para el `<img>` del avatar propio: preview recién subida o el BFF con cache-busting. */
export function urlAvatarPropio(
  avatarUrl: string | null | undefined,
  { version, preview }: EstadoAvatar,
): string | null {
  if (preview) return preview;
  return avatarUrl ? `/api/perfil/avatar?v=${version}` : null;
}
