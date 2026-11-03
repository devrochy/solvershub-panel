import { describe, expect, it } from "vitest";

import { nivelAlcanza } from "@/lib/ayuda/acceso";
import { PAGINAS_DE_AYUDA } from "@/lib/ayuda/contenido";

// Invariantes del contenido generado por `npm run wiki:sync` (se versiona, igual que tokens.css).

const slugs = new Set(PAGINAS_DE_AYUDA.map((p) => p.slug));
const hrefsDe = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
const porSlug = new Map(PAGINAS_DE_AYUDA.map((p) => [p.slug, p]));

describe("contenido generado de la Wiki", () => {
  it("tiene la portada y todas las páginas con título y acceso válidos", () => {
    expect(PAGINAS_DE_AYUDA.length).toBeGreaterThan(70);
    expect(slugs.has("")).toBe(true);
    expect(slugs.size).toBe(PAGINAS_DE_AYUDA.length);
    for (const p of PAGINAS_DE_AYUDA) {
      expect(p.titulo, p.ruta).toBeTruthy();
      expect(["usuario", "administrador", "tecnico"], p.ruta).toContain(p.acceso);
    }
  });

  it("todos los enlaces a /ayuda apuntan a páginas que existen", () => {
    for (const p of PAGINAS_DE_AYUDA) {
      for (const href of hrefsDe(p.html).filter((h) => h.startsWith("/ayuda"))) {
        const slug = href.replace(/[#?].*$/, "").replace(/^\/ayuda\/?/, "");
        expect(slugs.has(slug), `${p.ruta} → ${href}`).toBe(true);
      }
    }
  });

  it("ninguna página enlaza a otra de nivel superior (su lector daría con un 404)", () => {
    for (const p of PAGINAS_DE_AYUDA) {
      for (const href of hrefsDe(p.html).filter((h) => h.startsWith("/ayuda"))) {
        const destino = porSlug.get(href.replace(/[#?].*$/, "").replace(/^\/ayuda\/?/, ""));
        expect(nivelAlcanza(p.acceso as "usuario", destino!.acceso), `${p.ruta} → ${href}`).toBe(true);
      }
    }
  });

  it("no queda ningún enlace .md sin reescribir ni HTML activo", () => {
    for (const p of PAGINAS_DE_AYUDA) {
      expect(hrefsDe(p.html).filter((h) => /\.md(#|$)/.test(h)), p.ruta).toEqual([]);
      expect(p.html, p.ruta).not.toMatch(/<script|<iframe|<[a-z][^>]*\son[a-z]+\s*=|href="javascript:/i);
    }
  });
});
