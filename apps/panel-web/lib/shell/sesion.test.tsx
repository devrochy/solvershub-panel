// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import { GuardiaDeSeccion } from "@/components/shell/guardia-de-seccion";
import { ShellProvider } from "@/components/shell/shell-context";
import { VigilanteDeSesion } from "@/components/shell/vigilante-de-sesion";
import { me } from "@/lib/testing/fixtures";
import { getToasts, resetToasts } from "@/lib/toast-store";

import {
  cambioLaSesion,
  claveDeNegocio,
  itemDeRuta,
  primeraSeccionVisible,
  puedeVerRuta,
  type SesionRenderizada,
} from "./sesion";

let ruta = "/colaboradores";
const refresh = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => ruta,
  useRouter: () => ({ refresh, replace, push: vi.fn() }),
}));

const PERMISOS: Record<string, string | null> = { dashboard: "write", collaborators: "write", conversations: "read" };
const DUENO: SesionRenderizada = { permisos: PERMISOS, esMaster: false, negocioId: "t-1" };

const respuesta = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

beforeEach(() => {
  ruta = "/colaboradores";
  refresh.mockReset();
  replace.mockReset();
  resetToasts();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("sesión vigente (lógica pura)", () => {
  it("detecta un permiso revocado u otorgado, otro rol u otro negocio", () => {
    const vigente = { role: "owner", permissions: { ...PERMISOS }, tenant: { id: "t-1", name: "N", role: "owner", active: true } };
    expect(cambioLaSesion(DUENO, vigente)).toBe(false);
    expect(cambioLaSesion(DUENO, { ...vigente, permissions: { dashboard: "write", conversations: "read" } })).toBe(true);
    expect(cambioLaSesion(DUENO, { ...vigente, permissions: { ...PERMISOS, collaborators: null } })).toBe(true);
    expect(cambioLaSesion(DUENO, { ...vigente, permissions: { ...PERMISOS, plugins: "read" } })).toBe(true);
    expect(cambioLaSesion(DUENO, { ...vigente, role: "master" })).toBe(true);
    expect(cambioLaSesion(DUENO, { ...vigente, tenant: { ...vigente.tenant, id: "t-2" } })).toBe(true);
  });

  it("resuelve la sección de una ruta y si la sesión puede verla", () => {
    expect(itemDeRuta("/colaboradores")?.section).toBe("collaborators");
    expect(itemDeRuta("/cobranza/pagos")?.section).toBe("pack_cobranza:cobros");
    expect(itemDeRuta("/habilidades/pack_commerce")?.section).toBe("plugins");
    expect(itemDeRuta("/catalogo")).toBeNull();
    expect(puedeVerRuta("/colaboradores", DUENO)).toBe(true);
    expect(puedeVerRuta("/colaboradores", { ...DUENO, permisos: { dashboard: "write" } })).toBe(false);
    expect(puedeVerRuta("/catalogo", { ...DUENO, permisos: {} })).toBe(true);
    // Alta automática es solo del master aunque la sección `tenants` esté en los permisos.
    const tester = { permisos: { tenants: "write", qa: "write" }, esMaster: false, negocioId: null };
    expect(puedeVerRuta("/tenants/alta-automatica", tester)).toBe(false);
    expect(puedeVerRuta("/tenants", tester)).toBe(true);
    expect(puedeVerRuta("/tenants/alta-automatica", { ...tester, esMaster: true })).toBe(true);
  });

  it("la primera sección visible y la clave del negocio", () => {
    expect(primeraSeccionVisible(DUENO)?.href).toBe("/dashboard");
    expect(primeraSeccionVisible({ ...DUENO, permisos: { conversations: "read" } })?.href).toBe("/conversaciones");
    expect(primeraSeccionVisible({ ...DUENO, permisos: {} })).toBeNull();
    expect(claveDeNegocio({ tenant: { id: "t-9", name: "x", role: "owner", active: true } })).toBe("t-9");
    expect(claveDeNegocio({ tenant: null })).toBe("sin-negocio");
  });
});

describe("VigilanteDeSesion", () => {
  function montar(sesion: SesionRenderizada = DUENO) {
    return render(
      <ShellProvider permisos={sesion.permisos} esMaster={sesion.esMaster} negocioId={sesion.negocioId}>
        <VigilanteDeSesion />
      </ShellProvider>,
    );
  }

  it("con la misma sesión no hace nada", async () => {
    const fetchMock = vi.fn(() => respuesta(200, { ...me, permissions: PERMISOS, tenant: { ...me.tenant, id: "t-1" } }));
    vi.stubGlobal("fetch", fetchMock);
    montar();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/session", expect.anything()));
    expect(refresh).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("con un permiso revocado vuelve a pedir la vista al servidor", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(200, { ...me, permissions: { dashboard: "write" }, tenant: { ...me.tenant, id: "t-1" } })));
    montar();
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("con 401 (cuenta desactivada o sesión invalidada) manda a /login", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(401, { error: "Sesión inválida o expirada." })));
    montar();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("con el negocio suspendido avisa y manda a /login", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(403, { error: "El negocio está suspendido.", code: "tenant_suspended" })));
    montar();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(getToasts()).toContainEqual(expect.objectContaining({ kind: "error", message: "El negocio está suspendido." }));
  });

  it("si el servidor no responde, deja la vista como está", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("red"))));
    montar();
    await new Promise((r) => setTimeout(r, 20));
    expect(refresh).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("GuardiaDeSeccion", () => {
  function montar(sesion: SesionRenderizada = DUENO) {
    return render(
      <ShellProvider permisos={sesion.permisos} esMaster={sesion.esMaster} negocioId={sesion.negocioId}>
        <GuardiaDeSeccion>
          <p>Contenido de la sección</p>
        </GuardiaDeSeccion>
      </ShellProvider>,
    );
  }

  it("muestra la página cuando la sesión tiene la sección", () => {
    montar();
    expect(screen.getByText("Contenido de la sección")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("bloquea la página con un aviso claro cuando la sección se revocó", () => {
    montar({ ...DUENO, permisos: { dashboard: "write" } });
    expect(screen.queryByText("Contenido de la sección")).toBeNull();
    const aviso = screen.getByRole("alert");
    expect(aviso.textContent).toContain("No tienes acceso a esta sección");
    expect(screen.getByRole("link", { name: "Ir a Resumen" }).getAttribute("href")).toBe("/dashboard");
  });

  it("Alta automática queda bloqueada para quien no es master", () => {
    ruta = "/tenants/alta-automatica";
    montar({ permisos: { tenants: "write" }, esMaster: false, negocioId: null });
    expect(screen.getByRole("alert")).toBeTruthy();
    cleanup();
    montar({ permisos: { tenants: "write" }, esMaster: true, negocioId: null });
    expect(screen.getByText("Contenido de la sección")).toBeTruthy();
  });

  it("sin shell (tests, catálogo) no bloquea nada", () => {
    render(
      <GuardiaDeSeccion>
        <p>Contenido de la sección</p>
      </GuardiaDeSeccion>,
    );
    expect(screen.getByText("Contenido de la sección")).toBeTruthy();
  });
});
