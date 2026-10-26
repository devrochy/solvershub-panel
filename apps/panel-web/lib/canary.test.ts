import { describe, expect, it } from "vitest";

import type { CanaryLane, CanaryState } from "@/lib/api/types";
import {
  advertenciasDePrueba,
  estadoDePrueba,
  filasDeComparacion,
  motivoNoPublicar,
  muestraDePrueba,
  porcentajeValido,
  textoSenalDura,
} from "@/lib/canary";

// Prueba con una parte de los clientes (HU-AOS-32): estado, muestra, comparación y por qué no se publica.

const carril = (extra: Partial<CanaryLane> = {}): CanaryLane => ({
  conversaciones: 0, escalamiento: null, completitud: null, tareas_terminadas: 0, costo_por_conversacion_usd: null,
  p95_ms: null, ...extra,
});

function estado(extra: Partial<CanaryState> = {}): CanaryState {
  return {
    release_id: "00000000-0000-4000-8000-000000000002", release_number: 2,
    base_release_id: "00000000-0000-4000-8000-000000000001", base_release_number: 1, percent: 10,
    started_at: "2026-10-26T12:00:00Z", horas: 41.6, umbral_conversaciones: 200, umbral_horas: 72, dias_manual: 7,
    publicable_desde: "2026-11-02T12:00:00Z", veredicto: "sin_muestra", motivos: [], advertencias: [],
    costos_visibles: true, veredicto_guardado: false,
    senal_dura: { activa: false, evaluadas: 0, llegaron_mal: 0, tasa: null, tasa_estable: null, sin_resultado: 0 },
    puede_publicar: false, motivo_no_publicar: "sin_muestra", estable: carril({ conversaciones: 700 }),
    canary: carril({ conversaciones: 86 }), ...extra,
  };
}

describe("estado de la prueba", () => {
  it("sin muestra: juntando conversaciones, y a los días publicable a mano", () => {
    expect(estadoDePrueba(estado()).titulo).toBe("Juntando conversaciones");
    expect(estadoDePrueba(estado({ puede_publicar: true, motivo_no_publicar: null })).detalle).toMatch(/7 días/);
  });

  it("peor dice por qué; listo deja publicar; la señal dura manda", () => {
    const peor = estadoDePrueba(estado({ veredicto: "peor", motivos: ["escalamiento", "completitud"] }));
    expect(peor.tono).toBe("danger");
    expect(peor.detalle).toMatch(/pasa más conversaciones a una persona y termina menos tareas/);
    expect(estadoDePrueba(estado({ veredicto: "listo" })).tono).toBe("success");
    const dura = estado({ veredicto: "listo", senal_dura: { activa: true, evaluadas: 20, llegaron_mal: 8, tasa: 0.4, tasa_estable: 0.05, sin_resultado: 0 } });
    expect(estadoDePrueba(dura).titulo).toMatch(/mal/);
    expect(textoSenalDura(dura)).toMatch(/8 de 20/);
  });

  it("advertencias de costo y lentitud", () => {
    expect(advertenciasDePrueba(estado({ advertencias: ["costo", "lentitud"] }))).toHaveLength(2);
  });
});

describe("muestra y publicar", () => {
  it("la muestra se cuenta contra los umbrales y no se pasa del tope", () => {
    expect(muestraDePrueba(estado()).texto).toBe("86 de 200 conversaciones · 41 de 72 horas");
    expect(muestraDePrueba(estado({ horas: 90, canary: carril({ conversaciones: 300 }) })).texto).toBe(
      "200 de 200 conversaciones · 72 de 72 horas",
    );
  });

  it("sin muestra dice desde cuándo se puede; se puede publicar = sin motivo", () => {
    expect(motivoNoPublicar(estado())).toMatch(/200 conversaciones y 72 horas/);
    expect(motivoNoPublicar(estado({ puede_publicar: true, motivo_no_publicar: null }))).toBeNull();
    expect(motivoNoPublicar(estado({ motivo_no_publicar: "peor" }))).toMatch(/peor/);
  });

  it("el porcentaje va de 1 a 50, entero", () => {
    expect(porcentajeValido(10)).toBe(true);
    expect([0, 51, 2.5].some(porcentajeValido)).toBe(false);
  });
});

describe("comparación", () => {
  it("diferencias en puntos y relativas, con el lado peor; el costo solo si se ve", () => {
    const e = estado({
      estable: carril({ conversaciones: 700, escalamiento: 0.1, completitud: 0.8, costo_por_conversacion_usd: 0.01, p95_ms: 1000 }),
      canary: carril({ conversaciones: 210, escalamiento: 0.13, completitud: 0.85, costo_por_conversacion_usd: 0.013, p95_ms: 900 }),
    });
    const filas = Object.fromEntries(filasDeComparacion(e).map((f) => [f.metrica, f]));
    expect(filas["Pasan a una persona"]).toMatchObject({ diferencia: "+3 pp", peor: true });
    expect(filas["Tareas terminadas"]).toMatchObject({ diferencia: "+5 pp", peor: false });
    expect(filas["Costo por conversación"]).toMatchObject({ diferencia: "+30 %", peor: true });
    expect(filas["Tiempo de respuesta (95 % de las veces)"]).toMatchObject({ diferencia: "-10 %", peor: false });
    expect(filasDeComparacion({ ...e, costos_visibles: false }).map((f) => f.metrica)).not.toContain("Costo por conversación");
  });

  it("sin datos no inventa diferencias", () => {
    const filas = filasDeComparacion(estado());
    expect(filas.find((f) => f.metrica === "Pasan a una persona")).toMatchObject({ actual: "—", diferencia: null });
  });
});
