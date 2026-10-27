// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDePlantilla } from "@/app/(app)/plantillas-opciones/_components/editor";
import { PublicarEnMeta } from "@/app/(app)/plantillas-opciones/_components/meta/publicar-en-meta";
import { VersionesYMeta } from "@/app/(app)/plantillas-opciones/_components/meta/versiones-y-meta";
import { FeedbackProviders } from "@/components/ui/providers";
import type { HealthConnectionMeta, OpcionesDefinicion, OpcionesMetaResultado, OpcionesPlantilla } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";
import { accionesDeOpciones, definicionDeOpciones, metaDeVersion, plantillaDeOpciones, saludMeta, variablesDeOpciones, versionesConMeta } from "@/lib/testing/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/plantillas-opciones/confirmar_cita",
  useSearchParams: () => new URLSearchParams(),
}));

const CONEXIONES = saludMeta.connections as unknown as HealthConnectionMeta[];
const DEFINICION = definicionDeOpciones as unknown as OpcionesDefinicion;
const plantilla = (extra: Partial<OpcionesPlantilla> = {}) => ({ ...plantillaDeOpciones, ...extra }) as unknown as OpcionesPlantilla;
const demo = () => plantilla({ clave: "demo_estados", version_vigente: 5, versiones: versionesConMeta as unknown as OpcionesPlantilla["versiones"] });

const VISTA = {
  interactivo: { type: "button", body: "x", buttons: [] },
  cabe_en_whatsapp: true,
  componentes_meta: [
    { type: "BODY", text: "Hola {{1}}, tu cita en {{2}} es mañana.", example: {} },
    { type: "FOOTER", text: "Responde tocando una opción" },
    { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Confirmar cita" }, { type: "QUICK_REPLY", text: "Pagar el anticipo" }] },
  ],
  cuerpo_meta_renderizado: "Hola Ana, tu cita en Mi negocio es mañana.",
  texto_de_respaldo: "x",
  hallazgos: [],
};

const RESULTADO = (extra: Partial<OpcionesMetaResultado> = {}): OpcionesMetaResultado => ({
  ok: true,
  outcome: "published",
  reintentable: false,
  nombre: "confirmar_cita_v2",
  estado: "PENDING",
  categoria: "UTILITY",
  message_template_id: "00000000-0000-4000-8000-0000000000bb",
  meta_template_id: "123",
  motivo: null,
  ...extra,
});

type Respuesta = { status: number; cuerpo?: unknown };
type Llamada = { ruta: string; cuerpo: Record<string, unknown> | undefined };
let llamadas: Llamada[];

/** `publicar` responde en orden cada una de las respuestas dadas (la última se repite). */
function simular(...publicar: Respuesta[]) {
  llamadas = [];
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const ruta = new URL(url, "http://panel.test").pathname.replace("/api/", "");
      llamadas.push({ ruta, cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined });
      const r: Respuesta = ruta.endsWith("/vista-previa")
        ? { status: 200, cuerpo: VISTA }
        : ruta.endsWith("/publicar-en-meta")
          ? (publicar[Math.min(i++, publicar.length - 1)] ?? { status: 200, cuerpo: RESULTADO() })
          : { status: 404, cuerpo: { error: "sin simular" } };
      return new Response(JSON.stringify(r.cuerpo ?? null), { status: r.status });
    }),
  );
}
const publicaciones = () => llamadas.filter((l) => l.ruta.endsWith("/publicar-en-meta"));

/** Como la sección: el diálogo se monta al abrirlo y se desmonta al cerrar. */
function Arnes(props: Omit<React.ComponentProps<typeof PublicarEnMeta>, "onCerrar">) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}>
        Publicar en Meta
      </button>
      {abierto && <PublicarEnMeta {...props} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

function pintarDialogo(props: Partial<React.ComponentProps<typeof PublicarEnMeta>> = {}) {
  const onResultado = vi.fn();
  const onBanderaApagada = vi.fn();
  render(
    <FeedbackProviders>
      <Arnes
        clave="confirmar_cita"
        version={2}
        definicion={DEFINICION}
        conexiones={CONEXIONES}
        onResultado={onResultado}
        onBanderaApagada={onBanderaApagada}
        {...props}
      />
    </FeedbackProviders>,
  );
  return { onResultado, onBanderaApagada };
}

const abrir = () => fireEvent.click(screen.getByRole("button", { name: /Publicar en Meta/ }));
const enviarBtn = () => screen.getByRole("button", { name: /Crear plantilla en Meta|Reintentar/ }) as HTMLButtonElement;
const elegir = (nombre: RegExp) => fireEvent.click(screen.getByRole("radio", { name: nombre }));
const entender = () => fireEvent.click(screen.getByRole("checkbox", { name: /Entiendo que se creará una plantilla real/ }));

async function llenarYEnviar(categoria: RegExp = /^Utilidad/) {
  abrir();
  elegir(/Conectada con Facebook/); // la conexión «…aaaa»
  elegir(categoria);
  entender();
  await waitFor(() => expect(enviarBtn().disabled).toBe(false));
  fireEvent.click(enviarBtn());
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
  simular({ status: 200, cuerpo: RESULTADO() });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("diálogo «Publicar en Meta»", () => {
  it("explica qué se crea, con el nombre _v<n>, y que no se edita una aprobada", () => {
    pintarDialogo();
    abrir();
    const d = screen.getByRole("dialog");
    expect(within(d).getByText(/plantilla «confirmar_cita_v2»/)).toBeTruthy();
    expect(within(d).getByText(/Esto crea una plantilla real en tu cuenta de WhatsApp Business/)).toBeTruthy();
    expect(within(d).getByText(/Consume uno de los cupos de creación/)).toBeTruthy();
    expect(within(d).getByText(/«confirmar_cita_v3»/)).toBeTruthy();
  });

  it("ofrece solo UTILITY y MARKETING y explica la diferencia y el consentimiento", () => {
    pintarDialogo();
    abrir();
    const categorias = screen.getAllByRole("radio").filter((r) => /Utilidad|Marketing/.test(r.getAttribute("id") ?? "") || r.id.startsWith("categoria-meta"));
    expect(categorias.map((c) => c.id)).toEqual(["categoria-meta-UTILITY", "categoria-meta-MARKETING"]);
    expect(screen.getByText(/requiere que el cliente haya aceptado recibir mensajes promocionales \(consentimiento\)/)).toBeTruthy();
    expect(screen.getByText(/puede rechazarlo o cambiarle la categoría después; el cobro cambia/)).toBeTruthy();
  });

  it("ofrece solo las conexiones listas y dice por qué las otras no", () => {
    pintarDialogo();
    abrir();
    const conexiones = screen.getAllByRole("radio").filter((r) => r.id.startsWith("conexion-meta"));
    expect(conexiones).toHaveLength(2);
    expect(screen.getByText(/No disponibles:.*tiene un error/i)).toBeTruthy();
    expect(screen.getByText(/Con avisos de salud/)).toBeTruthy();
  });

  it("muestra los componentes de Meta con el conteo de cada botón", async () => {
    pintarDialogo();
    abrir();
    await screen.findByText("Hola Ana, tu cita en Mi negocio es mañana.");
    expect(screen.getByText("Responde tocando una opción")).toBeTruthy();
    const botones = within(screen.getByRole("list", { name: "Botones de la plantilla" })).getAllByRole("listitem");
    expect(botones.map((b) => b.textContent)).toEqual(["Confirmar cita14/25", "Pagar el anticipo17/25"]);
    expect(screen.getByText(/2 botones de respuesta rápida \(hasta 10, de 25 caracteres cada uno\)/)).toBeTruthy();
    // La vista previa pide los valores de muestra escritos.
    const previa = llamadas.find((l) => l.ruta.endsWith("/vista-previa"))!;
    expect(previa.cuerpo).toMatchObject({ ejemplos: { "cliente.nombre": "Ana", "negocio.nombre": "Mi negocio" } });
  });

  it("no se puede enviar sin conexión, sin categoría o sin la confirmación explícita", async () => {
    pintarDialogo();
    abrir();
    expect(enviarBtn().disabled).toBe(true);
    elegir(/Conectada con Facebook/);
    expect(enviarBtn().disabled).toBe(true); // falta categoría
    elegir(/^Marketing/);
    expect(enviarBtn().disabled).toBe(true); // falta confirmar
    fireEvent.click(enviarBtn());
    expect(publicaciones()).toHaveLength(0);
    entender();
    await waitFor(() => expect(enviarBtn().disabled).toBe(false));
    expect(publicaciones()).toHaveLength(0); // habilitar no envía
  });

  it("con una sola conexión lista la deja elegida", () => {
    pintarDialogo({ conexiones: [CONEXIONES[0]] });
    abrir();
    expect((screen.getByRole("radio", { name: /Conectada con Facebook/ }) as HTMLElement).getAttribute("aria-checked")).toBe("true");
  });

  it("envía la conexión, la categoría, el idioma y los ejemplos, y muestra el resultado", async () => {
    const { onResultado } = pintarDialogo();
    await llenarYEnviar(/^Marketing/);
    await screen.findByText("Enviada a Meta");
    expect(publicaciones()).toHaveLength(1);
    expect(publicaciones()[0].ruta).toBe("plantillas-opciones/confirmar_cita/versiones/2/publicar-en-meta");
    expect(publicaciones()[0].cuerpo).toEqual({
      connection_id: CONEXIONES[0].id,
      categoria: "MARKETING",
      idioma: "es",
      ejemplos: { "cliente.nombre": "Ana", "negocio.nombre": "Mi negocio" },
    });
    expect(onResultado).toHaveBeenCalledWith(RESULTADO());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("un doble clic envía una sola vez", async () => {
    pintarDialogo();
    abrir();
    elegir(/Conectada con Facebook/);
    elegir(/^Utilidad/);
    entender();
    await waitFor(() => expect(enviarBtn().disabled).toBe(false));
    fireEvent.click(enviarBtn());
    fireEvent.click(enviarBtn());
    await screen.findByText("Enviada a Meta");
    expect(publicaciones()).toHaveLength(1);
  });

  it("si el resultado es reintentable ofrece Reintentar, y solo se reenvía con un clic", async () => {
    simular({ status: 200, cuerpo: RESULTADO({ ok: false, outcome: "network_error", reintentable: true, estado: "DRAFT" }) }, { status: 200, cuerpo: RESULTADO() });
    pintarDialogo();
    await llenarYEnviar();
    await screen.findByText("Sin confirmar");
    expect(screen.getByText(/La versión sigue publicada como mensaje interactivo/)).toBeTruthy();
    expect(screen.getByText(/no se duplica/)).toBeTruthy();
    await new Promise((r) => setTimeout(r, 50));
    expect(publicaciones()).toHaveLength(1); // nada se reenvía solo
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByText("Enviada a Meta");
    expect(publicaciones()).toHaveLength(2);
  });

  it("un rechazo de Meta no se reintenta: muestra el motivo y que la versión sigue publicada", async () => {
    simular({ status: 200, cuerpo: RESULTADO({ ok: false, outcome: "meta_rejected", reintentable: false, estado: "DRAFT", motivo: "Parameter 'example' is invalid." }) });
    pintarDialogo();
    await llenarYEnviar();
    await screen.findByText("Meta no la aceptó");
    expect(screen.getByText(/Parameter 'example' is invalid\./)).toBeTruthy();
    expect(screen.getByText(/La versión sigue publicada como mensaje interactivo/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Cerrar" }).length).toBeGreaterThan(0);
  });

  describe("errores de la petición", () => {
    it("422 con el sobre propio y código de categoría", async () => {
      simular({ status: 422, cuerpo: { error: "Hay datos que no se pudieron guardar. Revisa: categoria.", code: "categoria_invalida" } });
      pintarDialogo();
      await llenarYEnviar();
      expect((await screen.findByRole("alert")).textContent).toBe("Elige una categoría válida: Utilidad o Marketing.");
      expect(publicaciones()).toHaveLength(1);
    });

    it("422 estándar de FastAPI (`detail` en lista)", async () => {
      simular({ status: 422, cuerpo: { detail: [{ type: "literal_error", loc: ["body", "categoria"], msg: "Input should be 'UTILITY' or 'MARKETING'" }] } });
      pintarDialogo();
      await llenarYEnviar();
      expect((await screen.findByRole("alert")).textContent).toBe("Elige una categoría válida: Utilidad o Marketing.");
    });

    it("bandera apagada: cierra el diálogo y avisa a la pantalla, sin alertas rojas", async () => {
      simular({ status: 404, cuerpo: { error: "No habilitadas.", code: "opciones_directas_no_habilitadas" } });
      const { onBanderaApagada } = pintarDialogo();
      await llenarYEnviar();
      await waitFor(() => expect(onBanderaApagada).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("permisos (403) y versión retirada (409) con mensajes claros", async () => {
      simular({ status: 403, cuerpo: { error: "Solo propietario o master." } });
      pintarDialogo();
      await llenarYEnviar();
      expect((await screen.findByRole("alert")).textContent).toMatch(/Solo el propietario del negocio puede publicar en Meta/);
      cleanup();
      simular({ status: 409, cuerpo: { error: "Esa versión está retirada: publica una versión nueva.", code: "version_retirada" } });
      pintarDialogo();
      await llenarYEnviar();
      expect((await screen.findByRole("alert")).textContent).toMatch(/retirada/);
    });

    it("502: invita a reintentar y deja reintentar a mano, sin enviar solo", async () => {
      simular({ status: 502, cuerpo: { error: "No se pudo contactar el backend." } }, { status: 200, cuerpo: RESULTADO() });
      pintarDialogo();
      await llenarYEnviar();
      expect((await screen.findByRole("alert")).textContent).toMatch(/Puedes reintentar: no se duplica la plantilla en Meta/);
      await new Promise((r) => setTimeout(r, 50));
      expect(publicaciones()).toHaveLength(1);
      fireEvent.click(enviarBtn());
      await screen.findByText("Enviada a Meta");
      expect(publicaciones()).toHaveLength(2);
    });
  });

  describe("sin conexión lista", () => {
    it("sin conexiones de WhatsApp: estado vacío con enlace a conectar", () => {
      pintarDialogo({ conexiones: [] });
      abrir();
      expect(screen.getByText(/todavía no tiene una conexión de WhatsApp con Meta/)).toBeTruthy();
      expect(screen.getByRole("link", { name: "Conectar WhatsApp" }).getAttribute("href")).toBe("/conexiones/whatsapp");
      expect(screen.queryByRole("button", { name: /Crear plantilla en Meta/ })).toBeNull();
    });

    it("con conexiones que no sirven: dice por qué y lleva a su salud", () => {
      pintarDialogo({ conexiones: [CONEXIONES[2]] });
      abrir();
      expect(screen.getByText(/Ninguna de tus conexiones de WhatsApp está lista/)).toBeTruthy();
      expect(screen.getByText(/Tiene un error/)).toBeTruthy();
      expect(screen.getByRole("link", { name: /Revisar la salud/ }).getAttribute("href")).toBe("/conexiones/meta");
    });
  });

  it("una versión anterior no tiene vista previa y lo dice", () => {
    pintarDialogo({ definicion: null });
    abrir();
    expect(screen.getByText(/No mostramos la vista previa de una versión anterior/)).toBeTruthy();
    expect(llamadas.filter((l) => l.ruta.endsWith("/vista-previa"))).toHaveLength(0);
  });
});

describe("versiones y estado de Meta", () => {
  const pintar = (p: OpcionesPlantilla, puedeEscribir = true) =>
    render(
      <FeedbackProviders>
        <VersionesYMeta plantilla={p} conexiones={CONEXIONES} puedeEscribir={puedeEscribir} onActualizar={vi.fn()} />
      </FeedbackProviders>,
    );
  const fila = (n: number) => screen.getByRole("heading", { name: `Versión ${n}` }).closest("li") as HTMLElement;

  it("pinta cada estado con su insignia y su explicación", () => {
    pintar(demo());
    expect(within(fila(5)).getByText("En revisión")).toBeTruthy();
    expect(within(fila(4)).getByText("Aprobada")).toBeTruthy();
    expect(within(fila(3)).getByText("Rechazada")).toBeTruthy();
    expect(within(fila(2)).getByText("Pausada")).toBeTruthy();
    expect(within(fila(1)).getByText("Sin confirmar")).toBeTruthy();
    expect(within(fila(3)).getByText(/INVALID_FORMAT/)).toBeTruthy();
    expect(within(fila(3)).getByText(/Quita los saltos de línea/)).toBeTruthy();
    expect(within(fila(4)).getByText(/Meta cambió la categoría de Utilidad a Marketing/)).toBeTruthy();
  });

  it("Reintentar solo aparece donde el reintento tiene sentido", () => {
    pintar(demo());
    const conReintento = [1, 2, 3, 4, 5].filter((n) => within(fila(n)).queryByRole("button", { name: /Reintentar/ }));
    expect(conReintento).toEqual([1]); // DRAFT con `network_error`; PENDING, APPROVED, REJECTED y PAUSED no
    expect(screen.queryByRole("button", { name: /Publicar en Meta/ })).toBeNull(); // todas ya están en Meta
  });

  it("la versión sin plantilla de Meta ofrece publicar, con el aviso de que sale como texto fuera de las 24 horas", () => {
    pintar(plantilla());
    expect(within(fila(2)).getAllByRole("button", { name: /Publicar en Meta/ })).toHaveLength(1);
    expect(within(fila(1)).getAllByRole("button", { name: /Publicar en Meta/ })).toHaveLength(1);
    // El aviso va solo en la vigente.
    expect(within(fila(2)).getByRole("note").textContent).toMatch(/Sin plantilla de Meta, fuera de las 24 horas sale como texto/);
    expect(within(fila(1)).queryByRole("note")).toBeNull();
  });

  it("mientras la vigente esté en revisión avisa de la degradación; aprobada, no", () => {
    pintar(demo());
    expect(within(fila(5)).getByRole("note").textContent).toMatch(/Mientras Meta no la apruebe, fuera de las 24 horas sale como texto/);
    cleanup();
    const aprobada = { ...demo(), versiones: demo().versiones.map((v) => (v.version_n === 5 ? { ...v, meta: metaDeVersion("demo_estados_v5", "APPROVED") } : v)) } as OpcionesPlantilla;
    pintar(aprobada);
    expect(within(fila(5)).queryByRole("note")).toBeNull();
  });

  it("quien solo lee ve el estado pero no tiene ninguna acción", () => {
    pintar(demo(), false);
    expect(screen.getByText(/Solo el propietario del negocio puede publicar en Meta/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Publicar en Meta|Reintentar/ })).toBeNull();
    expect(within(fila(3)).getByText("Rechazada")).toBeTruthy();
  });

  it("una versión retirada sin Meta no ofrece publicar", () => {
    const p = plantilla({
      versiones: [{ ...(plantillaDeOpciones.versiones[0] as object), retirada_en: "2026-10-28T00:00:00Z", vigente: false } as OpcionesPlantilla["versiones"][number]],
    });
    pintar(p);
    expect(screen.queryByRole("button", { name: /Publicar en Meta/ })).toBeNull();
    expect(screen.getByText(/está retirada y ya no se puede enviar a Meta/)).toBeTruthy();
  });

  it("enlaza a las plantillas de Meta cuando hay una ligada", () => {
    pintar(demo());
    const enlaces = screen.getAllByRole("link", { name: /Ver en las plantillas de Meta/ });
    expect(enlaces).toHaveLength(5);
    expect(enlaces[0].getAttribute("href")).toBe("/plantillas"); // 3 conexiones de WhatsApp → selector
  });

  it("sin versiones publicadas explica que podrá enviarla a Meta", () => {
    pintar(plantilla({ versiones: [], estado: "draft", version_vigente: null }));
    expect(screen.getByText(/podrás enviarla también a Meta/)).toBeTruthy();
  });

  it("tras un intento reintentable que falló, la fila ofrece Reintentar y la versión sigue publicada", async () => {
    simular({ status: 200, cuerpo: RESULTADO({ ok: false, outcome: "rate_limited", reintentable: true, estado: "DRAFT" }) });
    pintar(plantilla());
    fireEvent.click(within(fila(2)).getByRole("button", { name: /Publicar en Meta/ }));
    elegir(/Conectada con Facebook/);
    elegir(/^Utilidad/);
    entender();
    await waitFor(() => expect(enviarBtn().disabled).toBe(false));
    fireEvent.click(enviarBtn());
    await within(await screen.findByRole("dialog")).findByText("Límite de creación");
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: "Cerrar" }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(within(fila(2)).getByText("Límite de creación")).toBeTruthy();
    expect(within(fila(2)).getByRole("button", { name: /Reintentar/ })).toBeTruthy();
    expect(within(fila(2)).getByText(/La versión sigue publicada como mensaje interactivo/)).toBeTruthy();
  });
});

describe("accesibilidad", () => {
  it("la sección con un estado de cada tipo no tiene violaciones graves", async () => {
    const { container } = render(
      <FeedbackProviders>
        <VersionesYMeta plantilla={demo()} conexiones={CONEXIONES} puedeEscribir onActualizar={vi.fn()} />
      </FeedbackProviders>,
    );
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("el diálogo abierto (formulario completo y resultado) no tiene violaciones graves", async () => {
    pintarDialogo();
    abrir();
    await screen.findByText("Hola Ana, tu cita en Mi negocio es mañana.");
    expect(await violacionesGraves(screen.getByRole("dialog"))).toEqual([]);
    elegir(/Conectada con Facebook/);
    elegir(/^Utilidad/);
    entender();
    await waitFor(() => expect(enviarBtn().disabled).toBe(false));
    fireEvent.click(enviarBtn());
    await screen.findByText("Enviada a Meta");
    expect(await violacionesGraves(screen.getByRole("dialog"))).toEqual([]);
  });
});

describe("el resultado sobrevive a la recarga de la plantilla", () => {
  it("al recargar con la plantilla ya en Meta, la fila cambia pero el diálogo con el resultado sigue abierto hasta cerrarlo", async () => {
    simular({ status: 200, cuerpo: RESULTADO() });
    function Pantalla() {
      const [p, setP] = useState(plantilla());
      const recargar = () =>
        setP((prev) => ({ ...prev, versiones: prev.versiones.map((v) => (v.version_n === 2 ? { ...v, meta: metaDeVersion("confirmar_cita_v2", "PENDING") } : v)) }) as OpcionesPlantilla);
      return <VersionesYMeta plantilla={p} conexiones={CONEXIONES} puedeEscribir onActualizar={recargar} />;
    }
    render(
      <FeedbackProviders>
        <Pantalla />
      </FeedbackProviders>,
    );
    // Con el diálogo abierto el resto de la página queda `aria-hidden`: se busca con `hidden`.
    const fila2 = () => screen.getByRole("heading", { name: "Versión 2", hidden: true }).closest("li") as HTMLElement;
    fireEvent.click(within(fila2()).getByRole("button", { name: /Publicar en Meta/ }));
    elegir(/Conectada con Facebook/);
    elegir(/^Utilidad/);
    entender();
    await waitFor(() => expect(enviarBtn().disabled).toBe(false));
    fireEvent.click(enviarBtn());
    await within(await screen.findByRole("dialog")).findByText("Enviada a Meta");
    await waitFor(() => expect(within(fila2()).getByText("En revisión")).toBeTruthy());
    expect(within(fila2()).queryByRole("button", { name: /Publicar en Meta/, hidden: true })).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: "Cerrar" }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("integrado en el editor", () => {
  const editor = (p: OpcionesPlantilla) =>
    render(
      <FeedbackProviders>
        <EditorDePlantilla
          inicial={p}
          acciones={accionesDeOpciones.acciones as never}
          variables={variablesDeOpciones.variables as never}
          conexiones={CONEXIONES}
          puedeEscribir
        />
      </FeedbackProviders>,
    );

  it("muestra la sección y cambia a «no activada» si la bandera se apaga al publicar", async () => {
    simular({ status: 404, cuerpo: { error: "No habilitadas.", code: "opciones_directas_no_habilitadas" } });
    editor(plantilla());
    expect(screen.getByRole("heading", { name: "Versiones y plantilla de Meta" })).toBeTruthy();
    expect(screen.queryByText(/llegará en una próxima actualización/)).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /Publicar en Meta/ })[0]);
    elegir(/Conectada con Facebook/);
    elegir(/^Utilidad/);
    entender();
    await waitFor(() => expect(enviarBtn().disabled).toBe(false));
    fireEvent.click(enviarBtn());
    await screen.findByText(/no están activadas en tu negocio/);
  });
});
