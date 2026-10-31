// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { NewCollaboratorDialog } from "@/app/(app)/colaboradores/_components/new-collaborator-dialog";
import { TablaDeColaboradores } from "@/app/(app)/colaboradores/_components/tabla-de-colaboradores";
import { FeedbackProviders } from "@/components/ui/providers";
import type { CollaboratorItem, PackProfile } from "@/lib/api/types";
import { resetToasts } from "@/lib/toast-store";

import {
  filtrarPorNegocio,
  mensajeDeAlta,
  negociosDeFilas,
  perfilDePack,
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
    nombre: null,
    telefono: null,
    avatar_url: null,
    role: "colaborador",
    active: true,
    is_self: false,
    is_platform_master: false,
    permissions: [],
    links: [{ role: "colaborador", ...NORTE }],
    pack_profiles: [],
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

  it("para un dueño: avatar, sin acciones sobre el otro dueño ni cuentas de plataforma, permisos como badge", () => {
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[YO, OTRO_DUENO, MASTER, OPERADOR]} secciones={["conversations"]} esMaster={false} />
      </FeedbackProviders>,
    );
    expect(screen.getByRole("switch", { name: "Desactivar a operador@test" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Restablecer contraseña de duena@test" })).toBeTruthy();
    expect(screen.queryByRole("switch", { name: "Desactivar a socio@test" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Desactivar a master@test" })).toBeNull();
    // Permisos como chip clicable con su conteo, no como texto plano.
    expect(screen.getByRole("button", { name: "Permisos de operador@test" })).toBeTruthy();
    expect(screen.getAllByText("Gestionar").length).toBeGreaterThan(0);
    // Sin filtro por negocio (la sección es del negocio activo).
    expect(screen.queryByRole("combobox", { name: "Negocio" })).toBeNull();
  });

  it("para el master: conmutador «Todas las cuentas» que recarga la lista", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("?todos=1")) {
        return new Response(JSON.stringify([MASTER, OTRO_DUENO]), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[OTRO_DUENO]} secciones={["conversations"]} esMaster />
      </FeedbackProviders>,
    );
    expect(screen.getByRole("checkbox", { name: "Todas las cuentas" })).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Todas las cuentas" }));
    await waitFor(() => expect(screen.getByText("master@test")).toBeTruthy());
    vi.unstubAllGlobals();
  });

  it("la grilla muestra el heredado y guarda el mapa completo (HU-UI-10)", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void init;
      const url = String(input);
      if (url.includes("/permissions")) {
        return new Response(
          JSON.stringify([
            { section: "conversations", access: "read", heredado: true },
            { section: "leads", access: "write", heredado: false },
          ]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[OPERADOR]} secciones={["conversations", "leads"]} esMaster={false} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Permisos de operador@test" }));

    expect(await screen.findByText("heredado")).toBeTruthy();
    expect((screen.getByRole("radio", { name: "Conversaciones: Ver" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Clientes: Editar" }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: "Conversaciones: Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar permisos" }));

    await waitFor(() => {
      const guardado = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(guardado).toBeTruthy();
      const body = JSON.parse(String(guardado?.[1]?.body));
      expect(body.action).toBe("permissions");
      expect(body.permissions).toEqual({ conversations: "write", leads: "write" });
    });
    vi.unstubAllGlobals();
  });

  it("el estado se cambia con un interruptor y pide confirmación al desactivar", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[OPERADOR]} secciones={["conversations"]} esMaster={false} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Desactivar a operador@test" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(within(dialogo).getByText(/sin acceso al panel/)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Desactivar" }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post?.[1]?.body)).action).toBe("toggle");
    });
    // El interruptor refleja el nuevo estado (optimista).
    await waitFor(() => expect(screen.getByRole("switch", { name: "Activar a operador@test" })).toBeTruthy());
    vi.unstubAllGlobals();
  });
});

const PERFIL_GESTOR: PackProfile = {
  pack: "pack_cobranza",
  role_id: "gestor",
  ref_id: "g-1",
  etiqueta: "Gestor",
  resumen: {
    estatus: "activo",
    carteras: [
      { id: "c1", nombre: "Ruta A" },
      { id: "c2", nombre: "Ruta B" },
    ],
    permisos_activos: 3,
    permisos_total: 14,
  },
  edit: { kind: "cobranza_gestor_permisos", ref_id: "g-1" },
};

describe("perfil de pack en la fila (ADR-0176)", () => {
  afterEach(cleanup);

  it("traduce el perfil de gestor: estatus, carteras, permisos y edición conocida", () => {
    expect(perfilDePack(PERFIL_GESTOR)).toEqual({
      clave: "pack_cobranza:g-1",
      etiqueta: "Gestor",
      detalle: {
        estatus: "activo",
        carteras: [
          { id: "c1", nombre: "Ruta A" },
          { id: "c2", nombre: "Ruta B" },
        ],
        permisos: { activos: 3, total: 14 },
      },
      edicion: { kind: "cobranza_gestor_permisos", refId: "g-1" },
    });
  });

  it("sin detalle (recortado por permiso) queda solo la etiqueta y no se edita", () => {
    const p = perfilDePack({ ...PERFIL_GESTOR, resumen: null, edit: null });
    expect(p.detalle).toBeNull();
    expect(p.edicion).toBeNull();
    expect(p.etiqueta).toBe("Gestor");
  });

  it("un resumen con otra forma o un `kind` desconocido no rompe: solo lectura", () => {
    const p = perfilDePack({
      ...PERFIL_GESTOR,
      resumen: { carteras: "no-es-lista", permisos_activos: "x", otra_cosa: 1 },
      edit: { kind: "otro_pack_otro_kind", ref_id: "z" },
    });
    expect(p.detalle).toEqual({ estatus: null, carteras: [], permisos: null });
    expect(p.edicion).toBeNull();
  });

  it("la fila muestra «Gestor», estatus, carteras y el conteo; quien no es gestor no muestra nada", () => {
    const gestor = cuenta({ id: "g", email: "gestor@test", pack_profiles: [PERFIL_GESTOR] });
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[YO, gestor]} secciones={["conversations"]} esMaster={false} />
      </FeedbackProviders>,
    );
    expect(screen.getByText("Gestor")).toBeTruthy();
    expect(screen.getByText("activo")).toBeTruthy();
    expect(screen.getByText("2 carteras")).toBeTruthy();
    expect(screen.getByText(/3 de 14/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Permisos de campo de gestor@test" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Asignar" }).getAttribute("href")).toBe("/cobranza/gestores");
  });

  it("sin ningún perfil la columna no existe", () => {
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[YO, OPERADOR]} secciones={["conversations"]} esMaster={false} />
      </FeedbackProviders>,
    );
    expect(screen.queryByRole("columnheader", { name: /Perfil/ })).toBeNull();
  });

  it("con el detalle recortado se ve que es gestor pero sin carteras ni permisos", () => {
    const gestor = cuenta({
      id: "g",
      email: "gestor@test",
      pack_profiles: [{ ...PERFIL_GESTOR, resumen: null, edit: null }],
    });
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[gestor]} secciones={[]} esMaster={false} />
      </FeedbackProviders>,
    );
    expect(screen.getByText("Gestor")).toBeTruthy();
    expect(screen.queryByText(/permisos de campo/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Asignar" })).toBeNull();
  });

  it("editar los permisos usa el PUT existente y refresca la lista", async () => {
    refresh.mockClear();
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "PUT") return new Response(JSON.stringify({ activos: [] }), { status: 200 });
      return new Response(JSON.stringify({ catalogo: ["ver_cartera"], activos: ["ver_cartera"] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const gestor = cuenta({ id: "g", email: "gestor@test", pack_profiles: [PERFIL_GESTOR] });
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[gestor]} secciones={[]} esMaster={false} />
      </FeedbackProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Permisos de campo de gestor@test" }));
    fireEvent.click(await screen.findByRole("button", { name: "Guardar permisos" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(String(put?.[0])).toBe("/api/pack/cobranza/collectors/g-1/permissions");
    vi.unstubAllGlobals();
  });
});

describe("alta de colaborador (dos pasos)", () => {
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

  function fetchPorRuta(rutas: Record<string, unknown>) {
    fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const metodo = init?.method ?? "GET";
      for (const [fragmento, respuesta] of Object.entries(rutas)) {
        if (url.includes(fragmento)) return new Response(JSON.stringify(respuesta), { status: 200 });
      }
      if (url.includes("/api/invitations") && metodo === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/api/collaborators") && metodo === "POST") {
        return new Response(JSON.stringify({ ok: true, resultado: "creado" }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
  }

  async function abrirDialogo(esMaster = false) {
    render(
      <FeedbackProviders>
        <NewCollaboratorDialog esMaster={esMaster} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Nuevo colaborador/ }));
    return await screen.findByRole("dialog");
  }

  it("si el correo ya existe, ofrece invitar y envía la invitación sin contraseña", async () => {
    fetchPorRuta({ "/existe": { existe: true } });
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "socia@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));

    expect(await within(dialogo).findByText(/Ya existe una cuenta/)).toBeTruthy();
    expect(within(dialogo).queryByLabelText(/Contraseña/)).toBeNull();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar invitación" }));

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/invitations"));
      expect(llamada).toBeTruthy();
      const body = JSON.parse(String(llamada?.[1]?.body));
      expect(body.email).toBe("socia@x.test");
      expect(body.password).toBeUndefined();
    });
  });

  it("crea una cuenta nueva con nombre, usuario y teléfono", async () => {
    fetchPorRuta({ "/existe": { existe: false }, "/username-disponible": { disponible: true } });
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));

    fireEvent.change(await within(dialogo).findByLabelText(/Nombre completo/), { target: { value: "Ana Pérez" } });
    fireEvent.change(within(dialogo).getByLabelText(/^Usuario/), { target: { value: "ana.perez" } });
    expect(await within(dialogo).findByText("Disponible")).toBeTruthy();
    fireEvent.change(within(dialogo).getByLabelText(/Contraseña/), { target: { value: "clave-larga-1" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear colaborador" }));

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes("/api/collaborators") && init?.method === "POST",
      );
      expect(llamada).toBeTruthy();
      const body = JSON.parse(String(llamada?.[1]?.body));
      expect(body.email).toBe("ana@x.test");
      expect(body.nombre).toBe("Ana Pérez");
      expect(body.username).toBe("ana.perez");
      expect(body.password).toBe("clave-larga-1");
    });
  });

  it("rechaza un correo inválido con un error en español y no llama a la API", async () => {
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));
    expect(await within(dialogo).findByText(/Escribe un correo válido/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("avisa cuando el usuario ya está en uso", async () => {
    fetchPorRuta({ "/existe": { existe: false }, "/username-disponible": { disponible: false } });
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));
    fireEvent.change(await within(dialogo).findByLabelText(/^Usuario/), { target: { value: "ana.perez" } });
    expect(await within(dialogo).findByText(/ya está en uso/)).toBeTruthy();
  });

  it("un dueño no ve el rol Master; el master sí", async () => {
    fetchPorRuta({ "/existe": { existe: false }, "/username-disponible": { disponible: true } });
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));
    await within(dialogo).findByRole("radiogroup");
    expect(within(dialogo).queryByRole("radio", { name: /Master/ })).toBeNull();
    cleanup();

    fetchPorRuta({ "/existe": { existe: false }, "/username-disponible": { disponible: true } });
    const deMaster = await abrirDialogo(true);
    fireEvent.change(within(deMaster).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(deMaster).getByRole("button", { name: "Continuar" }));
    await within(deMaster).findByRole("radiogroup");
    expect(within(deMaster).getByRole("radio", { name: /Master/ })).toBeTruthy();
  });
});
