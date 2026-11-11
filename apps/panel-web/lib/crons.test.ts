import { describe, expect, it } from "vitest";

import type { Cron } from "@/lib/api/types";
import {
  agruparPorModulo,
  confirmacionDeCron,
  confirmacionDeHorario,
  consultaCrons,
  describirCron,
  distanciaRelativa,
  formatDuracion,
  motivoDeOmision,
  normalizarCron,
  puedeOperarCrons,
  resumenDeGrupo,
  validarCron,
} from "@/lib/crons";

function cron(parcial: Partial<Cron>): Cron {
  return {
    name: "core.x",
    module: "Plataforma",
    label: "Un cron",
    description: "",
    default_schedule: "0 13 * * *",
    interval_s: null,
    schedule: "0 13 * * *",
    overridden: false,
    paused: false,
    critical: false,
    sensitive: false,
    reprogramable: true,
    record_success: true,
    estado: "ok",
    next_run_at: null,
    last_run: null,
    last_success_at: null,
    runs_24h: 0,
    failures_24h: 0,
    acciones: ["run", "pause", "schedule"],
    updated_at: null,
    ...parcial,
  };
}

describe("permisos", () => {
  it("solo el master opera crons, no el tester ni el dueño", () => {
    expect(puedeOperarCrons({ role: "master" })).toBe(true);
    expect(puedeOperarCrons({ role: "tester" })).toBe(false);
    expect(puedeOperarCrons({ role: "owner" })).toBe(false);
    expect(puedeOperarCrons(null)).toBe(false);
  });
});

describe("consultaCrons", () => {
  it("arma la query y descarta lo vacío o inválido", () => {
    expect(consultaCrons({})).toBe("");
    expect(consultaCrons({ module: "Cobranza", estado: "failing", q: "  mora " })).toBe(
      "?module=Cobranza&estado=failing&q=mora",
    );
    expect(consultaCrons({ estado: "inventado" })).toBe("");
  });
});

describe("agruparPorModulo", () => {
  it("respeta el orden de la API, no deja grupos vacíos y pone al final un módulo desconocido", () => {
    const crons = [
      cron({ name: "a", module: "Cobranza" }),
      cron({ name: "b", module: "Canales y Meta" }),
      cron({ name: "c", module: "Cobranza" }),
      cron({ name: "d", module: "Nuevo" }),
    ];
    const grupos = agruparPorModulo(crons, ["Canales y Meta", "Suscripciones", "Cobranza"]);
    expect(grupos.map((g) => g.module)).toEqual(["Canales y Meta", "Cobranza", "Nuevo"]);
    expect(grupos[1].crons.map((c) => c.name)).toEqual(["a", "c"]);
  });

  it("resume fallos y pausas del grupo", () => {
    const r = resumenDeGrupo([cron({ estado: "failing" }), cron({ paused: true, estado: "paused" }), cron({})]);
    expect(r).toEqual({ conFallo: 1, pausados: 1 });
  });
});

describe("validarCron", () => {
  it.each(["* * * * *", "*/15 * * * *", "30 9,15,20 * * *", "0 4 * * 1-5", "5 3 1 */2 *", "  0   5 * * *  "])(
    "acepta %s",
    (e) => expect(validarCron(e)).toBeNull(),
  );

  it.each([
    ["", "Escribe"],
    ["* * * *", "5 campos"],
    ["* * * * * *", "5 campos"],
    ["61 * * * *", "minuto"],
    ["* 24 * * *", "hora"],
    ["* * 0 * *", "día del mes"],
    ["* * * 13 *", "mes"],
    ["* * * * 8", "día de la semana"],
    ["0 4 * * MON", "día de la semana"],
    ["*/0 * * * *", "minuto"],
    ["5-1 * * * *", "minuto"],
    ["@daily x y z w", "minuto"],
  ])("rechaza %j", (e, fragmento) => expect(validarCron(e)).toContain(fragmento));

  it("normaliza espacios", () => expect(normalizarCron("  0   4 * *  * ")).toBe("0 4 * * *"));
});

describe("describirCron", () => {
  it.each([
    ["* * * * *", "Cada minuto"],
    ["*/1 * * * *", "Cada minuto"],
    ["*/5 * * * *", "Cada 5 minutos"],
    ["0 * * * *", "Cada hora, al minuto 0"],
    ["30 * * * *", "Cada hora, al minuto 30"],
    ["0 13 * * *", "Todos los días a las 08:00 en Colombia (13:00 UTC)"],
    ["55 23 * * *", "Todos los días a las 18:55 en Colombia (23:55 UTC)"],
    ["0 2 * * *", "Todos los días a las 21:00 en Colombia (02:00 UTC)"],
    ["30 9,15,20 * * *", "Todos los días a las 04:30 en Colombia (09:30 UTC), 10:30 en Colombia (15:30 UTC) y 15:30 en Colombia (20:30 UTC)"],
    ["0 13 * * 1-5", "De lunes a viernes a las 08:00 en Colombia (13:00 UTC)"],
    ["0 13 * * 0,6", "Los fines de semana a las 08:00 en Colombia (13:00 UTC)"],
    ["0 13 * * 1,3", "Los lunes y miércoles a las 08:00 en Colombia (13:00 UTC)"],
    ["0 13 * * 7", "Los domingos a las 08:00 en Colombia (13:00 UTC)"],
  ])("%s → %s", (expresion, texto) => expect(describirCron(expresion)).toBe(texto));

  it("lo que no reconoce lo muestra tal cual", () => {
    expect(describirCron("0 13 1 * *")).toBe("Personalizado: 0 13 1 * *");
    expect(describirCron("nada")).toBe("Personalizado: nada");
  });

  it("intervalo fijo y vacío", () => {
    expect(describirCron(null, 30)).toBe("Cada 30 segundos (intervalo fijo)");
    expect(describirCron(null)).toBe("—");
  });
});

describe("confirmaciones", () => {
  it("un cron sensible advierte y usa el tono de peligro", () => {
    const c = confirmacionDeCron("run", { label: "Renovación del plan", sensitive: true, paused: false });
    expect(c.title).toContain("Renovación del plan");
    expect(c.destructive).toBe(true);
    expect(c.description).toMatch(/cobra o escribe a clientes/);
  });

  it("uno normal no es destructivo y reanudar nunca lo es", () => {
    expect(confirmacionDeCron("run", { label: "x", sensitive: false, paused: false }).destructive).toBe(false);
    expect(confirmacionDeCron("resume", { label: "x", sensitive: true, paused: true }).destructive).toBe(false);
    expect(confirmacionDeCron("pause", { label: "x", sensitive: true, paused: false }).destructive).toBe(true);
  });

  it("reprogramar solo pide confirmación en los sensibles", () => {
    expect(confirmacionDeHorario({ label: "x", sensitive: false }, "0 5 * * *")).toBeNull();
    const c = confirmacionDeHorario({ label: "Cobro", sensitive: true }, "0 5 * * *");
    expect(c?.description).toContain("Todos los días a las 00:00 en Colombia (05:00 UTC)");
  });
});

describe("tiempos", () => {
  it.each([
    [null, "—"],
    [12, "12 ms"],
    [999, "999 ms"],
    [1500, "1,5 s"],
    [59_000, "59 s"],
    [185_000, "3 min 5 s"],
  ])("formatDuracion(%s) = %s", (ms, texto) => expect(formatDuracion(ms)).toBe(texto));

  it("distanciaRelativa", () => {
    const ahora = new Date("2026-11-02T12:00:00Z");
    expect(distanciaRelativa("2026-11-02T12:05:00Z", ahora)).toBe("en 5 min");
    expect(distanciaRelativa("2026-11-02T10:00:00Z", ahora)).toBe("hace 2 h");
    expect(distanciaRelativa("2026-11-02T12:00:20Z", ahora)).toBe("en unos segundos");
    expect(distanciaRelativa("2026-10-30T12:00:00Z", ahora)).toBe("hace 3 d");
    expect(distanciaRelativa(null, ahora)).toBe("—");
  });

  it("motivoDeOmision", () => {
    expect(motivoDeOmision("plugin_inactivo")).toMatch(/pack/);
    expect(motivoDeOmision("en_ejecucion")).toMatch(/en curso/);
    expect(motivoDeOmision(null)).toBe("—");
    expect(motivoDeOmision("otro")).toBe("otro");
  });
});
