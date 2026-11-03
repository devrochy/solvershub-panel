import generado from "@/lib/ayuda/contenido.generado.json";
import type { PaginaAyuda } from "@/lib/ayuda/paginas";

/**
 * Páginas de la Wiki ya renderizadas (`npm run wiki:sync`). Solo para componentes de servidor: el
 * HTML de todas las páginas pesa ~1 MB y no debe llegar al navegador.
 */
export const PAGINAS_DE_AYUDA: readonly PaginaAyuda[] = generado.paginas;
