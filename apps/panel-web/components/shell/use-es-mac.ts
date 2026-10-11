"use client";

import { useSyncExternalStore } from "react";

const nada = () => () => {};

/** En Mac los atajos dicen ⌘ en vez de Ctrl. El servidor no lo sabe: arranca con Ctrl. */
export function useEsMac(): boolean {
  return useSyncExternalStore(
    nada,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}
