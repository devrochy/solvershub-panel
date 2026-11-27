import { describe, expect, it } from "vitest";

import type { MediaSettings } from "@/lib/api/types";
import { formatUsd } from "@/lib/format";
import {
  costoVisible,
  etiquetaCalidad,
  opcionesDeMedia,
  resolverSeleccion,
} from "@/lib/media-opciones";

const media: MediaSettings = {
  audio: {
    enabled: true,
    provider: "groq",
    model: "whisper-large-v3-turbo",
    has_api_key: false,
    using_platform_key: true,
  },
  vision: {
    enabled: true,
    mode: "describir",
    provider: "deepseek",
    model: "deepseek-flash",
    has_api_key: false,
    using_platform_key: true,
  },
  catalog: {
    audio: [
      {
        key: "groq",
        label: "Groq · Whisper",
        default_model: "whisper-large-v3-turbo",
        models: [
          {
            id: "whisper-large-v3-turbo",
            label: "Turbo",
            quality: 4,
            tier: "rapido",
            legacy: false,
            offered: true,
            cost_usd: 0.04 / 60,
            cost_unit: "minute",
          },
          {
            id: "whisper-large-v3",
            label: "Large",
            quality: 4,
            tier: "precision",
            legacy: false,
            offered: true,
            cost_usd: 0.111 / 60,
            cost_unit: "minute",
          },
        ],
      },
      {
        key: "openai",
        label: "OpenAI · Whisper",
        default_model: "gpt-4o-mini-transcribe",
        models: [
          {
            id: "gpt-4o-mini-transcribe",
            label: "Mini",
            quality: 3,
            tier: "basico",
            legacy: false,
            offered: false,
            cost_usd: 0.003,
            cost_unit: "minute",
          },
          {
            id: "gpt-4o-transcribe",
            label: "Transcribe",
            quality: 5,
            tier: "maxima",
            legacy: false,
            offered: true,
            cost_usd: 0.006,
            cost_unit: "minute",
          },
          {
            id: "whisper-1",
            label: "Whisper-1",
            quality: 2,
            tier: "legado",
            legacy: true,
            offered: false,
            cost_usd: 0.006,
            cost_unit: "minute",
          },
        ],
      },
    ],
    vision: [
      {
        key: "deepseek",
        label: "DeepSeek · visión",
        default_model: "deepseek-flash",
        models: [
          {
            id: "deepseek-flash",
            label: "Flash",
            quality: 2,
            tier: "economico",
            legacy: false,
            offered: true,
            cost_usd: 0.000252,
            cost_unit: "image",
          },
        ],
      },
      {
        key: "openai",
        label: "OpenAI · visión",
        default_model: "gpt-4o-mini",
        models: [
          {
            id: "gpt-4o-mini",
            label: "Mini",
            quality: 3,
            tier: "equilibrado",
            legacy: false,
            offered: true,
            cost_usd: 0.00036,
            cost_unit: "image",
          },
          {
            id: "gpt-4.1-mini",
            label: "4.1 mini",
            quality: 4,
            tier: "preciso",
            legacy: false,
            offered: true,
            cost_usd: 0.00096,
            cost_unit: "image",
          },
          {
            id: "gpt-4o",
            label: "4o",
            quality: 4,
            tier: "detallado",
            legacy: true,
            offered: false,
            cost_usd: 0.006,
            cost_unit: "image",
          },
        ],
      },
      {
        key: "anthropic",
        label: "Claude · visión",
        default_model: "claude-haiku-4-5",
        models: [
          {
            id: "claude-haiku-4-5",
            label: "Haiku",
            quality: 4,
            tier: "detallado",
            legacy: false,
            offered: true,
            cost_usd: 0.0027,
            cost_unit: "image",
          },
          {
            id: "claude-sonnet-4-5",
            label: "Sonnet",
            quality: 5,
            tier: "maxima",
            legacy: false,
            offered: true,
            cost_usd: 0.0081,
            cost_unit: "image",
          },
        ],
      },
    ],
  },
};

describe("opciones de multimedia", () => {
  it("arma la frontera de voz y esconde las opciones dominadas", () => {
    const opciones = opcionesDeMedia(media, "audio");

    expect(opciones.map((opcion) => opcion.nombre)).toEqual(["Rápido", "Precisión", "Máxima"]);
    expect(opciones.map((opcion) => opcion.model)).toEqual([
      "whisper-large-v3-turbo",
      "whisper-large-v3",
      "gpt-4o-transcribe",
    ]);
    expect(opciones.find((opcion) => opcion.recomendada)?.nombre).toBe("Precisión");
    expect(opciones.some((opcion) => opcion.model === "gpt-4o-mini-transcribe")).toBe(false);
    expect(opciones.some((opcion) => opcion.model === "whisper-1")).toBe(false);
  });

  it("ordena las imágenes por costo y deja fuera el legado", () => {
    const opciones = opcionesDeMedia(media, "vision");

    expect(opciones.map((opcion) => opcion.nombre)).toEqual([
      "Económico",
      "Equilibrado",
      "Preciso",
      "Detallado",
      "Máxima",
    ]);
    expect(opciones.find((opcion) => opcion.recomendada)?.nombre).toBe("Preciso");
    expect(opciones.some((opcion) => opcion.model === "gpt-4o")).toBe(false);
  });

  it("muestra el costo por 10 minutos de audio y por 100 imágenes", () => {
    const rapido = opcionesDeMedia(media, "audio").find(
      (opcion) => opcion.model === "whisper-large-v3-turbo",
    );
    const preciso = opcionesDeMedia(media, "vision").find(
      (opcion) => opcion.model === "gpt-4.1-mini",
    );

    expect(rapido).toBeDefined();
    expect(preciso).toBeDefined();
    expect(costoVisible(rapido!)).toEqual({
      monto: formatUsd((0.04 / 60) * 10, 2),
      unidad: "/ 10 min",
    });
    expect(costoVisible(preciso!)).toEqual({
      monto: formatUsd(0.00096 * 100, 2),
      unidad: "/ 100 imágenes",
    });
  });

  it("resuelve un modelo guardado que dejó de ofrecerse, sin cambiar de proveedor si puede", () => {
    const resultado = resolverSeleccion(
      { provider: "openai", model: "gpt-4o-mini-transcribe" },
      media,
      "audio",
    );

    expect(resultado.seleccion).toEqual({ provider: "openai", model: "gpt-4o-transcribe" });
    expect(resultado.retirada).toBe(true);
    expect(resultado.nota).toContain("Máxima");
  });

  it("un legado de visión cae en la mejor opción de su proveedor", () => {
    const resultado = resolverSeleccion(
      { provider: "openai", model: "gpt-4o" },
      media,
      "vision",
    );

    expect(resultado.seleccion).toEqual({ provider: "openai", model: "gpt-4.1-mini" });
    expect(resultado.retirada).toBe(true);
    expect(resultado.nota).toContain("Preciso");
  });

  it("una selección vigente no se toca", () => {
    const resultado = resolverSeleccion(
      { provider: "groq", model: "whisper-large-v3-turbo" },
      media,
      "audio",
    );

    expect(resultado).toEqual({
      seleccion: { provider: "groq", model: "whisper-large-v3-turbo" },
      retirada: false,
      hayOpciones: true,
    });
  });

  it("sin catálogo devuelve la configuración y avisa que no hay opciones", () => {
    const vacio: MediaSettings = {
      ...media,
      catalog: { audio: [], vision: [] },
    };
    const resultado = resolverSeleccion(
      { provider: "groq", model: "whisper-large-v3-turbo" },
      vacio,
      "audio",
    );

    expect(resultado.hayOpciones).toBe(false);
    expect(resultado.retirada).toBe(false);
  });

  it("traduce la calidad a una palabra estable", () => {
    expect([1, 2, 3, 4, 5].map(etiquetaCalidad)).toEqual([
      "Básica",
      "Buena",
      "Muy buena",
      "Excelente",
      "Máxima",
    ]);
    expect(etiquetaCalidad(0)).toBe("Básica");
    expect(etiquetaCalidad(9)).toBe("Máxima");
  });
});
