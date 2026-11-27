// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import {
  DemoChatSimulado,
  DemoNombreSugerido,
  DemoOpcionesRecomendadas,
  DemoRecorridoEnRuta,
  DemoRutaDeEstaciones,
} from "@/app/(dev)/catalogo/_components/ruta-de-lanzamiento";
import {
  DemoBurbuja,
  DemoCelular,
  DemoListaDePreguntas,
  DemoNivelDeIa,
  DemoOpcionesAvanzadas,
  DemoUltimaPrueba,
} from "@/app/(dev)/catalogo/_components/una-pregunta-a-la-vez";
import { violacionesGraves } from "@/lib/testing/axe";

afterEach(cleanup);

/**
 * Las piezas de la ruta de lanzamiento en `/catalogo` (HU-UX-24, HU-UX-26, HU-UX-31). El catálogo pinta cada pieza dos
 * veces (tema claro y oscuro), así que se prueban así: dos copias en la misma página, sin `id`
 * repetidos ni radios que se pisen, y sin violaciones graves de axe.
 */
const DEMOS = [
  ["ruta de estaciones", DemoRutaDeEstaciones],
  ["opciones recomendadas", DemoOpcionesRecomendadas],
  ["nombre sugerido", DemoNombreSugerido],
  ["chat simulado", DemoChatSimulado],
  ["recorrido en ruta", DemoRecorridoEnRuta],
  ["una pregunta a la vez", DemoListaDePreguntas],
  ["opciones avanzadas", DemoOpcionesAvanzadas],
  ["celular con canales", DemoCelular],
  ["burbuja «Probar el chat»", DemoBurbuja],
  ["última prueba en el celular", DemoUltimaPrueba],
  ["nivel de IA de la estación 5", DemoNivelDeIa],
] as const;

describe("catálogo · ruta de lanzamiento", () => {
  it.each(DEMOS)("%s en claro y oscuro no tiene violaciones graves de axe", async (_, Demo) => {
    const { container } = render(
      <>
        <div data-theme="sh-light">
          <Demo />
        </div>
        <div data-theme="sh-dark">
          <Demo />
        </div>
      </>,
    );
    expect(await violacionesGraves(container)).toEqual([]);
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
