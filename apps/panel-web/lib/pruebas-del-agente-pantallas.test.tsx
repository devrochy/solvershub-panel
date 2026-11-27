// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import { CorridaDePruebas } from "@/components/domain/agentes/pruebas/corrida-de-pruebas";
import { ListaDeEscenarios } from "@/components/domain/agentes/pruebas/lista-de-escenarios";
import { ProbarDialog } from "@/components/domain/agentes/pruebas/probar-dialog";
import { FeedbackProviders } from "@/components/ui/providers";
import type {
  EscenarioDePrueba,
  PruebasEstimado,
  PruebasInforme,
} from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

// Pantallas de la pestaña «Pruebas» (SPEC-53, HU-AOS-105): los cinco Gherkin de la HU contra un BFF simulado.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

const AGENTE = "11111111-1111-4111-8111-111111111111";
const ids = ["a1", "a2", "a3"].map(
  (n) => `${n}000000-0000-4000-8000-000000000000`,
);

const esc = (
  n: number,
  estado: EscenarioDePrueba["estado"],
  origen: EscenarioDePrueba["origen"] = "ia",
): EscenarioDePrueba => ({
  id: ids[n],
  agent_id: AGENTE,
  titulo: [
    "Cliente pregunta el precio",
    "Cliente pide agendar el sábado",
    "Cliente envía el comprobante",
  ][n],
  objetivo_cliente: "Quiere algo.",
  datos_cliente: {},
  criterios: ["Responde bien"],
  tools_esperadas: [],
  tools_prohibidas: [],
  origen,
  estado,
  created_at: "2026-11-26T10:00:00Z",
  updated_at: "2026-11-26T10:00:00Z",
});

const ESTIMADO: PruebasEstimado = {
  escenarios: 2,
  nivel_ia: "estandar",
  k_por_defecto: 1,
  k_maximo: 4,
  saldo: 2450,
  cuota_gratis_restante: 180,
  por_k: [1, 2, 3, 4].map((k) => ({
    k,
    estimado: 380 * k,
    de_la_cuota: Math.min(180, 380 * k),
    del_saldo: 380 * k - Math.min(180, 380 * k),
    saldo_despues: 2450 - (380 * k - Math.min(180, 380 * k)),
    alcanza: true,
    costo_usd: 0.42 * k,
  })),
};

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status });

describe("pestaña Pruebas", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const lista = (
    escenarios: EscenarioDePrueba[],
    onProponer = vi.fn(),
    onProbar = vi.fn(),
  ) =>
    render(
      <FeedbackProviders>
        <ListaDeEscenarios
          agenteId={AGENTE}
          escenarios={escenarios}
          tope={50}
          ultimoInforme={null}
          puedeEditar
          proponiendo={false}
          onProponer={onProponer}
          onProbar={onProbar}
        />
      </FeedbackProviders>,
    );

  it("vacío: invita a proponer o escribir una", async () => {
    const proponer = vi.fn();
    const { container } = lista([], proponer);
    expect(screen.getByText("Pon a prueba a tu agente")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Proponer pruebas" }));
    expect(proponer).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Escribir una" }));
    expect(
      await screen.findByRole("dialog", { name: "Escribir un escenario" }),
    ).toBeTruthy();
    expect((await violacionesGraves(container)).join("\n")).toBe("");
  });

  it("la lista traduce estado y origen, y «Probar» cuenta solo los aprobados", () => {
    const probar = vi.fn();
    lista(
      [esc(0, "aprobado"), esc(1, "aprobado", "manual"), esc(2, "borrador")],
      vi.fn(),
      probar,
    );
    expect(screen.getAllByText("Aprobado")).toHaveLength(2);
    expect(screen.getByText("Borrador")).toBeTruthy();
    expect(screen.getByText("Manual")).toBeTruthy();
    expect(screen.queryByText("aprobado")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Probar 2 aprobados" }));
    expect(probar).toHaveBeenCalledWith([ids[0], ids[1]]);
  });

  const dialogo = (
    extra: Partial<React.ComponentProps<typeof ProbarDialog>> = {},
  ) =>
    render(
      <FeedbackProviders>
        <ProbarDialog
          agenteId={AGENTE}
          que={{ tipo: "escenarios", caseIds: [ids[0], ids[1]] }}
          open
          onOpenChange={vi.fn()}
          verCosto={false}
          puedeComprar
          onLanzada={vi.fn()}
          {...extra}
        />
      </FeedbackProviders>,
    );

  it("aprobar el costo y elegir k: cambia al instante con `por_k`, sin otra llamada, y confirma con el estimado de ese k", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/estimado")
        ? json(ESTIMADO)
        : json({ id: "run", estado: "en_cola" }, 202),
    );
    const onLanzada = vi.fn();
    const { container } = dialogo({ onLanzada });
    expect(await screen.findByText("Repeticiones por escenario")).toBeTruthy();
    // Con k = 1: 380 de estimado, 180 de la cuota, 200 del saldo.
    expect(screen.getByText("200 créditos")).toBeTruthy();
    expect(screen.getByText("Quedarían 2.250")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByText(/Recomendado/)).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: /3 veces/ }));
    expect(screen.getByText("1.140 créditos")).toBeTruthy(); // estimado
    expect(screen.getByText("960 créditos")).toBeTruthy(); // del saldo: 1140 − 180
    expect(screen.getByText("Quedarían 1.490")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1); // solo el estimado inicial
    expect((await violacionesGraves(container)).join("\n")).toBe("");

    fireEvent.click(
      screen.getByRole("button", { name: "Aprobar y probar · 960 créditos" }),
    );
    await waitFor(() => expect(onLanzada).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      case_ids: [ids[0], ids[1]],
      k: 3,
      confirmo_creditos: 1140,
    });
  });

  it("el selector llega hasta el tope del negocio", async () => {
    fetchMock.mockResolvedValue(
      json({ ...ESTIMADO, k_maximo: 2, por_k: ESTIMADO.por_k.slice(0, 2) }),
    );
    dialogo();
    await screen.findByText("Repeticiones por escenario");
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByText(/Tu límite actual es 2/)).toBeTruthy();
  });

  it("el costo en dólares solo se ve si es el master", async () => {
    fetchMock.mockResolvedValue(json(ESTIMADO));
    dialogo({ verCosto: true });
    expect(await screen.findByText("Solo lo ve el master")).toBeTruthy();
    expect(screen.getByText(/0,42/)).toBeTruthy();
    cleanup();
    fetchMock.mockResolvedValue(
      json({
        ...ESTIMADO,
        por_k: ESTIMADO.por_k.map((p) => ({ ...p, costo_usd: null })),
      }),
    );
    dialogo({ verCosto: false });
    await screen.findByText("Repeticiones por escenario");
    expect(screen.queryByText("Solo lo ve el master")).toBeNull();
  });

  it("sin saldo: avisa con «Comprar créditos» y no deja confirmar", async () => {
    fetchMock.mockResolvedValue(
      json({
        ...ESTIMADO,
        saldo: 100,
        por_k: ESTIMADO.por_k.map((p) => ({
          ...p,
          del_saldo: p.estimado - 0,
          de_la_cuota: 0,
          saldo_despues: null,
          alcanza: false,
        })),
      }),
    );
    dialogo();
    const aviso = await screen.findByRole("alert");
    expect(within(aviso).getByText(/Te faltan 280 créditos/)).toBeTruthy();
    expect(
      within(aviso)
        .getByRole("link", { name: "Comprar créditos" })
        .getAttribute("href"),
    ).toBe("/plan");
    expect(
      (
        screen.getByRole("button", {
          name: /Aprobar y probar/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("si el costo cambió (409), muestra el estimado nuevo y pide confirmar otra vez", async () => {
    let estimados = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith("/estimado")) {
        estimados += 1;
        return json(
          estimados === 1
            ? ESTIMADO
            : {
                ...ESTIMADO,
                por_k: ESTIMADO.por_k.map((p) => ({
                  ...p,
                  estimado: p.estimado + 10,
                  del_saldo: p.del_saldo + 10,
                })),
              },
        );
      }
      return json(
        {
          error: "Cambió el estimado.",
          code: "estimado_cambio",
          details: { estimado: 390 },
        },
        409,
      );
    });
    dialogo();
    await screen.findByText("Repeticiones por escenario");
    fireEvent.click(screen.getByRole("button", { name: /Aprobar y probar/ }));
    expect(
      await screen.findByText(/El costo cambió mientras mirabas/),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Aprobar y probar · 210 créditos" }),
      ).toBeTruthy(),
    );
  });

  const informe = (extra: Partial<PruebasInforme> = {}): PruebasInforme => ({
    id: "22222222-2222-4222-8222-222222222222",
    agent_id: AGENTE,
    estado: "terminada",
    k: 1,
    reintento_de: null,
    version_probada: "borrador",
    iniciada_en: "2026-11-26T10:00:00Z",
    terminada_en: "2026-11-26T10:05:00Z",
    creditos_estimados: 380,
    creditos_reales: 352,
    creditos_reales_de_cuota: 180,
    creditos_reales_del_saldo: 172,
    tope_creditos: 570,
    progreso: { hechos: 2, total: 2 },
    resumen: {
      pasan: 1,
      fallan: 1,
      no_se_pudo_probar: 0,
      juez_equivocado: 0,
      porcentaje: 50,
    },
    borrador_lock_version: 7,
    escenarios: [
      {
        case_id: ids[0],
        titulo: "Cliente pregunta el precio",
        intentos: [
          {
            result_id: "p1",
            intento: 1,
            estado: "pasa",
            fin: "objetivo",
            criterio_incumplido: null,
            razon: null,
            transcripcion: [],
            tools_llamadas: [],
            arreglo: null,
            arreglo_aplicado_en: null,
            juez_equivocado: false,
          },
        ],
      },
      {
        case_id: ids[1],
        titulo: "Cliente pide agendar el sábado",
        intentos: [
          {
            result_id: "f1",
            intento: 1,
            estado: "falla",
            fin: "objetivo",
            criterio_incumplido:
              "Ofrece solo horarios dentro del horario de atención",
            razon:
              "Ofreció las 7:00 p. m. y el negocio cierra a las 5:00 p. m.",
            transcripcion: [
              {
                quien: "cliente",
                texto: "Quiero una cita el sábado en la tarde.",
              },
              {
                quien: "agente",
                texto: "Claro. El sábado tengo disponible a las 7:00 p. m.",
              },
            ],
            tools_llamadas: [],
            arreglo: {
              tipo: "regla",
              porque: "Falta una regla de horario.",
              regla: {
                name: "horario_sabado",
                kind: "fraseo",
                action: "responder",
                phrases: [
                  "Los sábados solo ofrezco citas entre 9:00 a. m. y 5:00 p. m.",
                ],
              },
              aplicable: true,
              diff: [
                {
                  ruta: "guardrails[2]",
                  antes: null,
                  despues:
                    "Los sábados solo ofrezco citas entre 9:00 a. m. y 5:00 p. m.",
                },
              ],
            },
            arreglo_aplicado_en: null,
            juez_equivocado: false,
          },
        ],
      },
    ],
    ...extra,
  });

  const corrida = (
    i: PruebasInforme,
    extra: Partial<React.ComponentProps<typeof CorridaDePruebas>> = {},
  ) =>
    render(
      <FeedbackProviders>
        <CorridaDePruebas
          agenteId={AGENTE}
          nombre="Ventas"
          inicial={i}
          puedeEditar
          onVolver={vi.fn()}
          onVolverAProbar={vi.fn()}
          {...extra}
        />
      </FeedbackProviders>,
    );

  it("resultado: un escenario que falló muestra la conversación, el criterio, la razón y «Aplicar al borrador»", async () => {
    const volverAProbar = vi.fn();
    const { container } = corrida(informe(), {
      onVolverAProbar: volverAProbar,
    });
    // La falla va primero y queda abierta.
    expect(
      await screen.findByText(
        /el criterio «Ofrece solo horarios dentro del horario de atención» no se cumplió/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Ofreció las 7:00 p. m./)).toBeTruthy();
    expect(
      screen.getByText("Claro. El sábado tengo disponible a las 7:00 p. m."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Aplicar al borrador" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Esto no es una falla" }),
    ).toBeTruthy();
    expect(screen.queryByText("falla")).toBeNull();
    expect(screen.queryByText("terminada")).toBeNull();
    expect((await violacionesGraves(container)).join("\n")).toBe("");
    fireEvent.click(
      screen.getByRole("button", { name: "Volver a probar la que falló" }),
    );
    expect(volverAProbar).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      1,
    );
  });

  it("aplicar pide confirmación, manda el lock_version del informe y nunca publica", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("/aplicar")
        ? json({ result_id: "f1", publicado: false, cambios: [] })
        : json(informe()),
    );
    corrida(informe());
    fireEvent.click(
      await screen.findByRole("button", { name: "Aplicar al borrador" }),
    );
    // La confirmación es un diálogo con su propio «Aplicar al borrador».
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(dialogo).getByRole("button", { name: "Aplicar al borrador" }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([u]) =>
          String(u).includes("/resultados/f1/aplicar"),
        ),
      ).toBe(true),
    );
    const [, init] = fetchMock.mock.calls.find(([u]) =>
      String(u).includes("/aplicar"),
    ) as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      confirmo: true,
      lock_version: 7,
    });
  });

  it("corrida en curso: avance, gastado y estados en palabras", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const viva = informe({
      estado: "corriendo",
      terminada_en: null,
      progreso: { hechos: 1, total: 2 },
      resumen: {
        pasan: 1,
        fallan: 0,
        no_se_pudo_probar: 0,
        juez_equivocado: 0,
        porcentaje: null,
      },
      escenarios: [
        informe().escenarios[0],
        {
          case_id: ids[1],
          titulo: "Cliente pide agendar el sábado",
          intentos: [],
        },
      ],
    });
    fetchMock.mockResolvedValue(json(informe()));
    const { container } = corrida(viva);
    expect(screen.getByText("1 de 2")).toBeTruthy();
    expect(screen.getByText("Terminado")).toBeTruthy();
    expect(screen.getByText("En cola")).toBeTruthy();
    expect(
      screen.getByRole("progressbar", { name: "Avance de la corrida" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Cancelar corrida" }),
    ).toBeTruthy();
    expect((await violacionesGraves(container)).join("\n")).toBe("");
    // El sondeo trae el informe terminado y la pantalla cambia sola.
    await vi.advanceTimersByTimeAsync(3100);
    expect(await screen.findByText("Resultado de la corrida")).toBeTruthy();
    vi.useRealTimers();
  });
});
