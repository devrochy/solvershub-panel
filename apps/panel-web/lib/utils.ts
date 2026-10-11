import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge no conoce la escala tipográfica de los tokens (`text-sh-*`, HU-DS-01) y la
 * tomaba por un color: al juntarla con `text-headline` descartaba el tamaño. Se registra
 * como tamaño de fuente; `shadow-elev-*` como sombra.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["sh-hero", "sh-h1", "sh-block", "sh-body", "sh-dense", "sh-label", "sh-caption", "sh-mono"] }],
      shadow: [{ shadow: ["elev-0", "elev-1", "elev-2", "elev-3"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
