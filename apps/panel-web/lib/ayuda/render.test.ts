import { describe, expect, it } from "vitest";

import { expandirAdmoniciones, leerFrontmatter, renderizarMarkdown, rutaDePagina } from "@/lib/ayuda/render";

const ruta = "02-guia/03-modulos/01-x.md";
const render = (md: string, extra: Partial<Parameters<typeof renderizarMarkdown>[1]> = {}) =>
  renderizarMarkdown(md, { ruta, ...extra });

describe("frontmatter", () => {
  it("se lee y no se renderiza como regla horizontal", async () => {
    const md = "---\ntitulo: Hola\nproposito: Con: dos puntos\nacceso: usuario\n---\n\n# Hola\n";
    expect(leerFrontmatter(md)).toEqual({ titulo: "Hola", proposito: "Con: dos puntos", acceso: "usuario" });
    expect((await render(md)).html).not.toContain("<hr");
  });
});

describe("enlaces relativos .md → /ayuda/...", () => {
  it("resuelve contra la página, conserva el fragmento y lo anota", async () => {
    const r = await render("[a](02-otra.md) [b](../04-tec/05-x.md#sec) [c](../../index.md) [d](#local)", {
      paginas: new Set(["02-guia/03-modulos/02-otra.md", "02-guia/04-tec/05-x.md", "index.md"]),
    });
    expect(r.html).toContain('href="/ayuda/02-guia/03-modulos/02-otra"');
    expect(r.html).toContain('href="/ayuda/02-guia/04-tec/05-x#sec"');
    expect(r.html).toContain('href="/ayuda"');
    expect(r.html).toContain('href="#local"');
    expect(r.enlaces.sort()).toEqual(["02-guia/03-modulos/02-otra.md", "02-guia/04-tec/05-x.md", "index.md"]);
    expect(r.avisos).toEqual([]);
  });

  it("avisa de un enlace roto o que sale de docs/", async () => {
    const r = await render("[a](../../../../fuera.md) [b](no-existe.md)", { paginas: new Set() });
    expect(r.avisos.join("\n")).toMatch(/fuera de docs/);
    expect(r.avisos.join("\n")).toMatch(/enlace roto/);
  });

  it("los enlaces externos llevan rel y mantienen su dirección", async () => {
    const r = await render("[p](https://solvershub.site/precios)");
    expect(r.html).toContain('href="https://solvershub.site/precios"');
    expect(r.html).toContain('rel="noopener noreferrer"');
  });

  it("rutaDePagina", () => {
    expect(rutaDePagina("index.md")).toBe("/ayuda");
    expect(rutaDePagina("a/b.md")).toBe("/ayuda/a/b");
  });
});

describe("admoniciones", () => {
  it("convierte `!!! tipo \"Título\"` con cuerpo sangrado en un bloque con rol y título", async () => {
    const md = '!!! warning "Ojo"\n    Texto con `código`.\n\n    - uno\n    - dos\n\nDespués.\n';
    const { html } = await render(md);
    expect(html).toContain('<div class="admonition warning" role="note">');
    expect(html).toContain('<p class="admonition-title"><strong>Advertencia:</strong> Ojo</p>');
    expect(html).toContain("<li>uno</li>");
    expect(html).toMatch(/<\/div>\s*<p>Después\.<\/p>/);
  });

  it("acepta info y note, y un título sin comillas no rompe", async () => {
    const info = (await render('!!! info "Requisitos previos"\n    - a\n')).html;
    const nota = (await render('!!! note\n    Algo.\n')).html;
    expect(info).toContain("admonition info");
    expect(nota).toContain("<strong>Nota:</strong></p>");
  });

  it("no toca `!!!` dentro de un bloque de código", () => {
    const md = "```markdown\n!!! info \"X\"\n    cuerpo\n```\n";
    expect(expandirAdmoniciones(md)).toBe(md);
  });

  it("escapa el título", async () => {
    const { html } = await render('!!! info "<img src=x onerror=alert(1)>"\n    x\n');
    expect(html).not.toContain("<img");
    expect(html).toContain("&#x3C;img");
  });
});

describe("tablas y código", () => {
  it("las tablas llevan encabezados con scope y un contenedor desplazable con teclado", async () => {
    const { html } = await render("| A | B |\n|---|---|\n| 1 | 2 |\n");
    expect(html).toContain('<th scope="col">A</th>');
    expect(html).toMatch(/<div class="ayuda-tabla" tabindex="0" role="region" aria-label="[^"]+"><table>/);
  });

  it("los enlaces dentro de una tabla también se reescriben", async () => {
    const { html } = await render("| A |\n|---|\n| [x](02-otra.md) |\n");
    expect(html).toContain('href="/ayuda/02-guia/03-modulos/02-otra"');
  });

  it("los bloques de código conservan el lenguaje y se enfocan con teclado", async () => {
    const { html } = await render("```bash\nnpm ci\n```\n");
    expect(html).toContain('<pre tabindex="0" data-lang="bash"><code class="language-bash">');
  });

  it("mermaid queda como bloque de código etiquetado como diagrama", async () => {
    const { html } = await render("```mermaid\nflowchart LR\n  A --> B\n```\n");
    expect(html).toContain('data-lang="diagrama (mermaid)"');
    expect(html).toContain('class="language-mermaid"');
    expect(html).toContain("A --> B");
  });

  it("los títulos reciben un id estable que coincide con los enlaces #… de la Wiki", async () => {
    const { html } = await render("## 2.2 Comportamiento esperado\n\n[ver](#22-comportamiento-esperado)\n");
    expect(html).toContain('<h2 id="22-comportamiento-esperado">');
    expect(html).toContain('href="#22-comportamiento-esperado"');
  });
});

describe("imágenes y marcadores de captura", () => {
  it("sin imagen se degrada a un recuadro con el texto alternativo", async () => {
    const { html } = await render("![captura: tabla de Equipo](../../assets/equipo.png)");
    expect(html).toContain('<figure class="ayuda-captura-pendiente">');
    expect(html).toContain("<figcaption>captura: tabla de Equipo</figcaption>");
    expect(html).not.toContain("<img");
  });

  it("con imagen en docs/assets/ se incrusta como data URI y se resuelve contra la página", async () => {
    let pedida = "";
    const { html } = await render("![captura: login](../../assets/login.png)", {
      resolverImagen: (r) => {
        pedida = r;
        return "data:image/png;base64,AAAA";
      },
    });
    expect(pedida).toBe("assets/login.png");
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('alt="captura: login"');
  });

  it("una imagen remota nunca se carga", async () => {
    const r = await render("![x](https://tracker.test/p.png)");
    expect(r.html).not.toContain("tracker.test");
    expect(r.html).toContain("ayuda-captura-pendiente");
  });
});

describe("saneado: el texto no puede traer scripts", () => {
  const md = [
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    '<a href="javascript:alert(1)" onclick="x()">malo</a>',
    '<div class="admonition" onmouseover="x()" style="position:fixed">d</div>',
    '<iframe src="https://evil.test"></iframe>',
    "[m](javascript:alert(1)) [d](data:text/html,hola)",
    '<svg onload="alert(1)"></svg>',
    '<p id="clobber" name="x">p</p>',
  ].join("\n\n");

  it("quita scripts, manejadores, iframes, estilos y esquemas peligrosos", async () => {
    const { html } = await render(md);
    for (const malo of ["<script", "onerror", "onclick", "onmouseover", "onload", "<iframe", "javascript:", "data:text", "style=", "<svg", 'id="clobber"', 'name="x"']) {
      expect(html, malo).not.toContain(malo);
    }
  });
});
