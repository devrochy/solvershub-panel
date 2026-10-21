// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { NewCollaboratorDialog } from "@/app/(app)/colaboradores/_components/new-collaborator-dialog";
import { TablaDeColaboradores } from "@/app/(app)/colaboradores/_components/tabla-de-colaboradores";
import { FeedbackProviders } from "@/components/ui/providers";
import type { CollaboratorItem } from "@/lib/api/types";
import { getToasts, resetToasts } from "@/lib/toast-store";

import {
  filtrarPorNegocio,
  mensajeDeAlta,
  negociosDeFilas,
  permisoLegible,
  puedeActuarSobre,
  seccionesOtorgables,
} from "./colaboradores";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/colaboradores",
}));

const NORTE = { slug: "tienda-norte", name: "Tienda Norte" };
const SUR = { slug: "tienda-sur", name: "Tienda Sur" };

function cuenta(extra: Partial<CollaboratorItem>): CollaboratorItem {
  return {
    id: "c-1",
    email: "cuenta@test",
    username: null,
    role: "colaborador",
    active: true,
    is_self: false,
    is_platform_master: false,
    permissions: [],
    links: [{ role: "colaborador", ...NORTE }],
    ...extra,
  };
}

const YO = cuenta({ id: "yo", email: "duena@test", role: "owner", is_self: true, links: [{ role: "owner", ...NORTE }] });
const OTRO_DUENO = cuenta({ id: "dueno2", email: "socio@test", links: [{ role: "owner", ...NORTE }] });
const MASTER = cuenta({ id: "master", email: "master@test", role: "master", is_platform_master: true, links: [] });
const TESTER = cuenta({ id: "tester", email: "tester@test", role: "tester", links: [] });
const OPERADOR = cuenta({
  id: "op",
  email: "operador@test",
  permissions: [
    { section: "conversations", access: "write", scope: "tienda-norte" },
    { section: "plugins", access: "none", scope: "*" },
  ],
});
const DEL_SUR = cuenta({ id: "sur", email: "sur@test", links: [{ role: "colaborador", ...SUR }] });

describe("reglas de Colaboradores (lógica pura)", () => {
  it("permisos en texto claro, con el negocio solo para quien ve varios", () => {
    const permiso = { section: "conversations", access: "write", scope: "tienda-norte" };
    expect(permisoLegible(permiso)).toBe("Conversaciones: escritura");
    expect(permisoLegible(permiso, { "tienda-norte": "Tienda Norte" })).toBe("Conversaciones: escritura · Tienda Norte");
    expect(permisoLegible({ section: "plugins", access: "read", scope: "*" }, {})).toBe("Habilidades: lectura");
    expect(permisoLegible({ section: "plugins", access: "none", scope: "*" })).toBe("Habilidades: sin acceso");
  });

  it("un dueño no actúa sobre otros dueños ni sobre cuentas de plataforma; el master sí", () => {
    expect(puedeActuarSobre(OPERADOR, false)).toBe(true);
    expect(puedeActuarSobre(YO, false)).toBe(true);
    expect(puedeActuarSobre(OTRO_DUENO, false)).toBe(false);
    expect(puedeActuarSobre(MASTER, false)).toBe(false);
    expect(puedeActuarSobre(TESTER, false)).toBe(false);
    for (const fila of [OTRO_DUENO, MASTER, TESTER]) expect(puedeActuarSobre(fila, true)).toBe(true);
  });

  it("negocios de las filas y filtro", () => {
    const filas = [YO, OPERADOR, DEL_SUR];
    expect(negociosDeFilas(filas)).toEqual([NORTE, SUR]);
    expect(filtrarPorNegocio(filas, "tienda-sur").map((f) => f.id)).toEqual(["sur"]);
    expect(filtrarPorNegocio(filas, "")).toHaveLength(3);
  });

  it("un dueño no otorga plataforma, pruebas ni la gestión de cuentas", () => {
    const permisos = { dashboard: "write", collaborators: "write", tenants: "write", qa: "write", plugins: null };
    expect(seccionesOtorgables(permisos, false)).toEqual(["dashboard"]);
    expect(seccionesOtorgables(permisos, true)).toEqual(["collaborators", "dashboard", "qa", "tenants"]);
  });

  it("el aviso del alta distingue cuenta creada de invitación enviada", () => {
    expect(mensajeDeAlta("invitado")).toMatch(/se le envió una invitación/);
    expect(mensajeDeAlta("creado")).toMatch(/Cuenta creada/);
  });
});

describe("tabla de colaboradores", () => {
  afterEach(cleanup);

  it("para un dueño: sin acciones sobre el otro dueño ni las cuentas de plataforma, y permisos legibles", () => {
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[YO, OTRO_DUENO, MASTER, OPERADOR]} secciones={["conversations"]} esMaster={false} />
      </FeedbackProviders>,
    );
    expect(screen.getByRole("button", { name: "Desactivar a operador@test" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Restablecer contraseña de duena@test" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /socio@test/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /master@test/ })).toBeNull();
    expect(screen.getByText("Conversaciones: escritura")).toBeTruthy();
    expect(screen.getByText("Habilidades: sin acceso")).toBeTruthy();
    expect(screen.queryByText(/conversations:write/)).toBeNull();
    // Un solo negocio: sin filtro.
    expect(screen.queryByRole("combobox", { name: "Negocio" })).toBeNull();
  });

  it("para el master: filtro por negocio cuando hay más de uno y acciones sobre todos", () => {
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[YO, OTRO_DUENO, DEL_SUR]} secciones={["conversations"]} esMaster />
      </FeedbackProviders>,
    );
    expect(screen.getByRole("button", { name: "Desactivar a socio@test" })).toBeTruthy();
    const filtro = screen.getByRole("combobox", { name: "Negocio" });
    fireEvent.change(filtro, { target: { value: "tienda-sur" } });
    expect(screen.getByText("sur@test")).toBeTruthy();
    expect(screen.queryByText("socio@test")).toBeNull();
  });
});

describe("alta de colaborador", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetToasts();
    refresh.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  async function crear(esMaster = false) {
    render(
      <FeedbackProviders>
        <NewCollaboratorDialog esMaster={esMaster} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nuevo colaborador" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.change(within(dialogo).getByLabelText(/^Contraseña/), { target: { value: "clave-larga-1" } });
    return dialogo;
  }

  it("si el correo ya tenía cuenta, avisa que se envió la invitación y cierra", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, resultado: "invitado" }), { status: 200 }));
    const dialogo = await crear();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear cuenta" }));
    await waitFor(() =>
      expect(getToasts()).toContainEqual(
        expect.objectContaining({ kind: "success", message: expect.stringMatching(/se le envió una invitación/) }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(refresh).toHaveBeenCalled();
  });

  it("un dueño no ve el campo de negocio ni el rol master; el master sí", async () => {
    const dialogo = await crear(false);
    expect(within(dialogo).queryByLabelText(/Negocio/)).toBeNull();
    expect(within(dialogo).queryByRole("option", { name: /Master/ })).toBeNull();
    cleanup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const deMaster = await crear(true);
    expect(within(deMaster).getByLabelText(/Negocio/)).toBeTruthy();
    expect(within(deMaster).getByRole("option", { name: /Master/ })).toBeTruthy();
  });

  it("rechaza un correo inválido con un error en español y no llama a la API", async () => {
    const dialogo = await crear();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear cuenta" }));
    expect(await within(dialogo).findByText(/Escribe un correo válido/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
