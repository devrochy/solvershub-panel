// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { PAGINAS_DE_AYUDA } from "@/lib/ayuda/contenido";
import { me } from "@/lib/testing/fixtures";
import { violacionesGraves } from "@/lib/testing/axe";
import { resolverServidor } from "@/lib/testing/servidor";

// Ruta /ayuda (Wiki): sesión, 404 por nivel de acceso, menú filtrado y accesibilidad de la página.

let respuestaDeMe: unknown = me;
let statusDeMe = 200;

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async () =>
    statusDeMe === 200
      ? { ok: true, status: 200, data: respuestaDeMe }
      : { ok: false, status: statusDeMe, error: "sin sesión" },
  ),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));

// Como en Next: `notFound()` y `redirect()` interrumpen el render lanzando.
vi.mock("next/navigation", () => ({
  usePathname: () => "/ayuda",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  },
}));

afterEach(() => {
  cleanup();
  respuestaDeMe = me;
  statusDeMe = 200;
});

const comoColaborador = {
  ...me,
  role: "agent",
  tenant: { ...me.tenant!, role: "agent" },
  permissions: { dashboard: "read", conversations: "write" },
};
const comoMaster = { ...me, role: "master" };

const PAGINA_DE_USUARIO = "02-guia-de-usuario/01-interfaz-y-navegacion";
const PAGINA_TECNICA = "05-operaciones-devops/06-seguridad";

async function abrir(slug?: string) {
  const Pagina = (await import("@/app/(app)/ayuda/[[...slug]]/page")).default as (p: {
    params: Promise<{ slug?: string[] }>;
  }) => Promise<ReactNode>;
  const arbol = await resolverServidor(await Pagina({ params: Promise.resolve({ slug: slug?.split("/") }) }));
  return render(<>{arbol}</>);
}

describe("/ayuda", () => {
  it("la página técnica de la prueba existe y es técnica", () => {
    expect(PAGINAS_DE_AYUDA.find((p) => p.slug === PAGINA_TECNICA)?.acceso).toBe("tecnico");
    expect(PAGINAS_DE_AYUDA.find((p) => p.slug === PAGINA_DE_USUARIO)?.acceso).toBe("usuario");
  });

  it("un usuario normal ve una página de su nivel, con títulos jerárquicos, tablas con encabezados y sin fallos de accesibilidad", async () => {
    respuestaDeMe = comoColaborador;
    const { container } = await abrir(PAGINA_DE_USUARIO);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Interfaz y navegación");
    expect(container.querySelectorAll("th[scope='col']").length).toBeGreaterThan(0);
    expect(container.querySelector("script")).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("el menú de un usuario normal solo lista páginas de nivel usuario", async () => {
    respuestaDeMe = comoColaborador;
    await abrir(PAGINA_DE_USUARIO);
    const menu = screen.getByRole("navigation", { name: "Contenido de la Wiki" });
    const visibles = new Set(within(menu).getAllByRole("link").map((a) => a.getAttribute("href")));
    const prohibidas = PAGINAS_DE_AYUDA.filter((p) => p.acceso !== "usuario").map((p) => `/ayuda/${p.slug}`);
    expect(prohibidas.length).toBeGreaterThan(0);
    expect(prohibidas.filter((h) => visibles.has(h))).toEqual([]);
    expect(visibles.has(`/ayuda/${PAGINA_DE_USUARIO}`)).toBe(true);
    expect(menu.querySelector("[aria-current='page']")?.getAttribute("href")).toBe(`/ayuda/${PAGINA_DE_USUARIO}`);
    expect(within(menu).queryByText("Operaciones y DevOps")).toBeNull();
    expect(within(menu).queryByText("Documentación técnica")).toBeNull();
  });

  it("una página técnica responde 404 a un usuario normal y al dueño, igual que una que no existe", async () => {
    respuestaDeMe = comoColaborador;
    await expect(abrir(PAGINA_TECNICA)).rejects.toThrow("NEXT_NOT_FOUND");
    respuestaDeMe = me; // dueño del negocio: administrador, no técnico
    await expect(abrir(PAGINA_TECNICA)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(abrir("05-operaciones-devops/no-existe")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("una página de administración responde 404 al usuario normal y es visible al dueño", async () => {
    const pagina = PAGINAS_DE_AYUDA.find((p) => p.acceso === "administrador")!;
    respuestaDeMe = comoColaborador;
    await expect(abrir(pagina.slug)).rejects.toThrow("NEXT_NOT_FOUND");
    respuestaDeMe = me;
    await abrir(pagina.slug);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(pagina.titulo);
    expect(screen.getByText(/Solo para quien administra el negocio/)).toBeTruthy();
  });

  it("un master sí ve la página técnica y su sección en el menú", async () => {
    respuestaDeMe = comoMaster;
    const { container } = await abrir(PAGINA_TECNICA);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      PAGINAS_DE_AYUDA.find((p) => p.slug === PAGINA_TECNICA)!.titulo,
    );
    const menu = screen.getByRole("navigation", { name: "Contenido de la Wiki" });
    expect(within(menu).getByText("Operaciones y DevOps")).toBeTruthy();
    expect(screen.getByText(/Solo para el equipo de plataforma/)).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("un tester también ve las páginas técnicas", async () => {
    respuestaDeMe = { ...me, role: "tester" };
    await abrir(PAGINA_TECNICA);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("la portada es /ayuda y el diagrama mermaid queda como bloque de código accesible", async () => {
    respuestaDeMe = comoMaster;
    const { container } = await abrir("04-documentacion-tecnica/01-arquitectura");
    const pre = container.querySelector("pre[data-lang='diagrama (mermaid)']");
    expect(pre?.getAttribute("tabindex")).toBe("0");
    cleanup();
    respuestaDeMe = comoColaborador;
    await abrir();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Wiki de SolversHub");
  });

  it("sin sesión (401) vuelve al login recordando la página", async () => {
    statusDeMe = 401;
    await expect(abrir(PAGINA_DE_USUARIO)).rejects.toThrow(
      `NEXT_REDIRECT:/login?volver=${encodeURIComponent(`/ayuda/${PAGINA_DE_USUARIO}`)}`,
    );
  });

  it("el 404 de la Wiki es el mismo para todo y ofrece volver al inicio", async () => {
    const { default: NoEncontrada } = await import("@/app/(app)/ayuda/not-found");
    const { container } = render(<NoEncontrada />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Esta página de ayuda no existe");
    expect(screen.getByRole("link", { name: "Ir al inicio de la Wiki" }).getAttribute("href")).toBe("/ayuda");
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
