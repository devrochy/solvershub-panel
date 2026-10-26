import { describe, expect, it } from "vitest";

import type { Evaluation, ReleaseDiff, ReleaseSummary } from "@/lib/api/types";
import { estadoDe, gruposDelDiff, mensajeDeError, publicacion, puedeOperarVersiones, recorridosAMedir, textoVolverAtras } from "@/lib/versiones";

// Versiones de una conexión (HU-AOS-27): estados, publicar según el gate y el diff en lenguaje claro.

function version(n: number, extra: Partial<ReleaseSummary> = {}): ReleaseSummary {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, number: n, origin: "owner", manifest_hash: "a".repeat(64),
    created_at: "2026-10-25T12:00:00Z", active: false, canary: false, last_event: null, last_event_at: null,
    lifecycle: null, detenida: false, ...extra,
  };
}

const evaluacion = (extra: Partial<Evaluation>): Evaluation => ({
  gate_cerrado: true, base_release_id: null, es_la_activa: false, veredicto: null, medicion: null, ...extra,
});

describe("estado de cada versión", () => {
  it("activa, candidata (más nueva que la activa), anterior y detenida", () => {
    expect(estadoDe(version(3, { active: true }), 3)).toBe("activa");
    expect(estadoDe(version(4), 3)).toBe("candidata");
    expect(estadoDe(version(2, { lifecycle: "rolled_back" }), 3)).toBe("anterior");
    expect(estadoDe(version(5, { detenida: true, lifecycle: "invalid" }), 3)).toBe("detenida");
    expect(estadoDe(version(1), null)).toBe("candidata");
  });

  it("la prueba retirada por el sistema bloquea; la que detuvo el dueño se puede volver a probar", () => {
    expect(estadoDe(version(4, { detenida: true, lifecycle: "canary_stopped" }), 3)).toBe("retirada");
    expect(estadoDe(version(4, { lifecycle: "canary_stopped" }), 3)).toBe("candidata");
    expect(estadoDe(version(2, { lifecycle: "canary_stopped" }), 3)).toBe("anterior");
    expect(estadoDe(version(4, { lifecycle: "invalid" }), 3)).toBe("detenida");
  });
});

describe("publicar según el gate", () => {
  it("con el gate apagado se puede, con el aviso de probarla", () => {
    const p = publicacion(evaluacion({ gate_cerrado: false }));
    expect(p.puede).toBe(true);
    expect(p.motivo).toMatch(/Probar asistente/);
    expect(publicacion(null).puede).toBe(true);
  });

  it("con el gate cerrado: aprobada sí, rechazada no, sin medir ofrece medir", () => {
    const aprobado = { aprobado: true, motivo: "", k: 4, umbral: 0.85, por_procedimiento: {}, sin_medir: [] };
    expect(publicacion(evaluacion({ veredicto: aprobado })).puede).toBe(true);
    const rechazada = publicacion(evaluacion({ veredicto: { ...aprobado, aprobado: false } }));
    expect(rechazada.puede || rechazada.medir).toBe(false);
    const sinMedir = publicacion(evaluacion({}));
    expect(sinMedir).toMatchObject({ puede: false, medir: true });
    const enCurso = publicacion(evaluacion({ medicion: { estado: "en_curso", codigo: null, creado: null, sin_escenarios: [] } }));
    expect(enCurso).toMatchObject({ puede: false, medir: false });
    const sinEscenarios = publicacion(evaluacion({ medicion: { estado: "sin_escenarios", codigo: null, creado: null, sin_escenarios: ["x"] } }));
    expect(sinEscenarios.puede).toBe(true);
  });
});

describe("diferencias en lenguaje claro", () => {
  const diff: ReleaseDiff = {
    candidata: 4, base: 3, sin_linea_base: false,
    agentes: [
      {
        key: "agenda", nombre: "Agenda", rol: "specialist", cambio: "actualizado", version_antes: 1, version_ahora: 2,
        secciones: ["tools", "rara"], herramientas_agregadas: ["check_availability"], herramientas_quitadas: [],
        procedimientos_agregados: [], procedimientos_quitados: [],
      },
      {
        key: "soporte", nombre: "Soporte", rol: "specialist", cambio: "nuevo", version_antes: null, version_ahora: 1,
        secciones: [], herramientas_agregadas: [], herramientas_quitadas: [], procedimientos_agregados: [], procedimientos_quitados: [],
      },
    ],
    superpoderes: {
      habilidades: [{ pack_id: "pack_calendar", nombre: "Agenda y citas", cambio: "nueva_version", antes: "2.1.0", ahora: "2.2.0" }],
      plugins_agregados: [], plugins_quitados: [],
    },
    permisos: [{ desde: "Ventas", hacia: "Agenda", cambio: "agregado", modos_antes: [], modos_ahora: ["handoff", "query"] }],
    otros: { ajustes: ["assistant_name"], playbooks: [], flujo: false },
    medira: [{ procedure_id: "pack_calendar.agendar_cita", titulo: "Agendar una cita", motivo: "agente:agenda" }],
  };

  it("agrupa agentes, superpoderes, permisos y otros con nombres legibles", () => {
    const grupos = Object.fromEntries(gruposDelDiff(diff).map((g) => [g.titulo, g.lineas]));
    expect(grupos.Agentes).toEqual([
      "Agenda: cambia superpoderes del agente, otros ajustes; suma check_availability.",
      "Soporte: agente nuevo.",
    ]);
    expect(grupos.Superpoderes).toEqual(["Agenda y citas pasa de la versión 2.1.0 a la 2.2.0."]);
    expect(grupos["Permisos entre agentes"]).toEqual(["Ventas podrá pasar la conversación, consultar a Agenda."]);
    expect(grupos.Otros).toEqual(["Ajustes del asistente: nombre del asistente."]);
    expect(recorridosAMedir(diff)).toEqual(["Agendar una cita"]);
  });
});

describe("textos y permisos", () => {
  it("volver atrás explica qué pasa con las conversaciones abiertas", () => {
    expect(textoVolverAtras(3)).toMatch(/versión 3/);
    expect(textoVolverAtras(3)).toMatch(/conversaciones en curso cambian/);
  });

  it("opera el master, o el propietario con el Agent OS activo", () => {
    expect(puedeOperarVersiones({ role: "master" }, "legacy")).toBe(true);
    expect(puedeOperarVersiones({ role: "colaborador", tenant: { role: "owner" }, permissions: { connections: "write" } }, "v3")).toBe(true);
    expect(puedeOperarVersiones({ role: "colaborador", tenant: { role: "member" }, permissions: { connections: "write" } }, "v3")).toBe(false);
    expect(puedeOperarVersiones({ role: "colaborador", tenant: { role: "owner" }, permissions: { connections: "write" } }, "legacy")).toBe(false);
  });

  it("los códigos de la API tienen un mensaje claro", () => {
    expect(mensajeDeError("gate_pendiente")).toMatch(/medirla/);
    expect(mensajeDeError("habilidad_retirada")).toMatch(/seguridad/);
    expect(mensajeDeError("canary_en_curso")).toMatch(/en prueba/);
    expect(mensajeDeError("canary_sin_muestra")).toMatch(/suficientes conversaciones/);
    expect(mensajeDeError("porcentaje_invalido")).toMatch(/1 y 50/);
  });
});
