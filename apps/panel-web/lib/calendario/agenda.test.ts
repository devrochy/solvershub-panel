import { describe, expect, it } from "vitest";

import {
  agendasVisibles,
  aliasesDeTexto,
  aEventoDeGrilla,
  inicialDeAgenda,
  borradorDeSeleccion,
  codigoPorDefecto,
  COLORES_TIPO,
  esColorTipo,
  FONDO_DE_COLOR,
  normalizarCodigo,
  serieDeColor,
  horarioAGrilla,
  hoyEn,
  type EventoAgenda,
} from "./agenda";
import { desfaseDeHoraDePared, desfaseEn, horaDePared } from "./zona-horaria";

const CITA: EventoAgenda = {
  id: "appt-1",
  title: "Ana",
  start: "2026-10-20T15:00:00+00:00",
  end: "2026-10-20T15:30:00+00:00",
  kind: "appointment",
  status: "scheduled",
  source: "local",
  color: "#198754",
  can_cancel: true,
  attendee_email: "",
  notes: "",
  appointment_type_id: "t-1",
  tipo_color: "cat-2",
  tipo_codigo: "VAL",
};

describe("colores de tipo (HU-UX-08)", () => {
  it("solo la paleta categórica, en orden fijo", () => {
    expect(COLORES_TIPO.map((c) => c.valor)).toEqual(["cat-1", "cat-2", "cat-3", "cat-4"]);
    expect(esColorTipo("cat-3")).toBe(true);
    expect(esColorTipo("#ff0000")).toBe(false);
    expect(serieDeColor("cat-4")).toBe(4);
    expect(serieDeColor("")).toBeNull();
    expect(FONDO_DE_COLOR["cat-1"]).toBe("bg-data-1");
  });

  it("código: por defecto del nombre y normalizado como el backend", () => {
    expect(codigoPorDefecto("Valoración")).toBe("VAL");
    expect(codigoPorDefecto("1ª consulta")).toBe("1ªC");
    expect(normalizarCodigo("  ctl ")).toBe("CTL");
    expect(normalizarCodigo("demasiado")).toBe("DEMASI");
  });
});

describe("eventos de la grilla", () => {
  it("la cita se titula con el cliente y lleva el tipo en palabras, sin sigla (AGE-03)", () => {
    const ev = aEventoDeGrilla(CITA, { "t-1": "Valoración" });
    expect(ev.title).toBe("Ana");
    expect(ev.extendedProps).toMatchObject({ tipoNombre: "Valoración" });
    expect(ev.classNames).toEqual(["evt-cat-2"]);
    expect(ev.editable).toBe(true);
  });

  it("sin tipo, neutra; cancelada, apagada y fija", () => {
    const sinTipo = aEventoDeGrilla({ ...CITA, tipo_color: "", tipo_codigo: "" });
    expect(sinTipo.title).toBe("Ana");
    expect(sinTipo.classNames).toEqual(["evt-sin-tipo"]);
    const cancelada = aEventoDeGrilla({ ...CITA, status: "cancelled" });
    expect(cancelada.classNames).toContain("evt-cancelada");
    expect(cancelada.editable).toBe(false);
  });

  it("el bloqueo es rayado y arrastrable (no es un evento de fondo de FullCalendar)", () => {
    const ev = aEventoDeGrilla({ ...CITA, id: "block-1", kind: "block", title: "", tipo_color: "", tipo_codigo: "" });
    expect(ev.title).toBe("Bloqueo");
    expect(ev.classNames).toEqual(["evt-bloqueo"]);
    expect(ev).not.toHaveProperty("editable");
    expect(ev.display).toBe("block");
  });

  it("el hueco de la semana se respeta; el del mes propone de 9 a 10", () => {
    expect(borradorDeSeleccion({ startStr: "2026-10-20T10:00:00", endStr: "2026-10-20T11:30:00", allDay: false })).toEqual({
      start: "2026-10-20T10:00:00",
      end: "2026-10-20T11:30:00",
    });
    expect(borradorDeSeleccion({ startStr: "2026-10-20", endStr: "2026-10-21", allDay: true })).toEqual({
      start: "2026-10-20T09:00:00",
      end: "2026-10-20T10:00:00",
    });
  });
});

describe("zona horaria con Intl", () => {
  it("Bogotá va 5 horas detrás de UTC", () => {
    const ms = Date.UTC(2026, 9, 20, 15, 0);
    expect(horaDePared("America/Bogota", ms).slice(0, 5)).toEqual([2026, 9, 20, 10, 0]);
    expect(desfaseEn("America/Bogota", ms)).toBe(-300);
    expect(desfaseDeHoraDePared("America/Bogota", [2026, 9, 20, 10, 0, 0, 0])).toBe(-300);
  });

  it("respeta el horario de verano (Madrid)", () => {
    expect(desfaseDeHoraDePared("Europe/Madrid", [2026, 6, 1, 12, 0, 0, 0])).toBe(120);
    expect(desfaseDeHoraDePared("Europe/Madrid", [2026, 0, 15, 12, 0, 0, 0])).toBe(60);
  });
});

describe("varias agendas (HU-CAL-08)", () => {
  it("el color es siempre el de la agenda; sin agenda, el del tipo (AGE-04)", () => {
    const cita = { ...CITA, calendar_id: "a-1", calendar_color: "cat-3" };
    expect(aEventoDeGrilla(cita).classNames).toEqual(["evt-cat-3"]);
    expect(aEventoDeGrilla(CITA).classNames).toEqual(["evt-cat-2"]);
  });

  it("la inicial distingue agendas con el mismo color", () => {
    expect(inicialDeAgenda("Dra. Ana")).toBe("D");
    expect(inicialDeAgenda("  Álvaro")).toBe("A");
    expect(inicialDeAgenda("3ra sede")).toBe("3");
    expect(inicialDeAgenda("···")).toBe("?");
  });

  it("agendas visibles: lo guardado que sigue existiendo, o todas", () => {
    const todas = ["a", "b", "c"];
    expect(agendasVisibles(null, todas)).toEqual(todas);
    expect(agendasVisibles(["b", "z"], todas)).toEqual(["b"]);
    expect(agendasVisibles(["z"], todas)).toEqual(todas);
    expect(agendasVisibles([], todas)).toEqual(todas);
  });
});

describe("alias de una agenda", () => {
  it("separa por coma, recorta y quita repetidos", () => {
    expect(aliasesDeTexto("doctora, sede norte ,, doctora")).toEqual(["doctora", "sede norte"]);
    expect(aliasesDeTexto("")).toEqual([]);
  });
});

describe("horario en la grilla (AGE-01)", () => {
  it("de una hora antes de abrir a una después de cerrar, con lo cerrado sombreado", () => {
    const g = horarioAGrilla({ mon: "08:00-18:00", fri: "08:00-17:00", sat: "09:00-13:00", sun: "" });
    expect(g.slotMinTime).toBe("07:00:00");
    expect(g.slotMaxTime).toBe("19:00:00");
    expect(g.scrollTime).toBe("08:00:00");
    expect(g.businessHours).toEqual([
      { daysOfWeek: [1], startTime: "08:00", endTime: "18:00" },
      { daysOfWeek: [5], startTime: "08:00", endTime: "17:00" },
      { daysOfWeek: [6], startTime: "09:00", endTime: "13:00" },
    ]);
  });

  it("sin horario que se entienda, de 6 a 22 y sin sombra", () => {
    expect(horarioAGrilla({})).toMatchObject({ businessHours: false, slotMinTime: "06:00:00", slotMaxTime: "22:00:00" });
    expect(horarioAGrilla({ mon: "tarde" }).businessHours).toBe(false);
  });

  it("media hora se redondea a la hora entera", () => {
    expect(horarioAGrilla({ tue: "08:30-17:30" })).toMatchObject({ slotMinTime: "07:00:00", slotMaxTime: "19:00:00" });
  });

  it("hoy en la zona del negocio, no en la del navegador", () => {
    expect(hoyEn("America/Bogota", new Date(Date.UTC(2026, 10, 11, 3, 0)))).toBe("2026-11-10");
  });
});
