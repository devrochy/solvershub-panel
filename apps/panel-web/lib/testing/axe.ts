import axe from "axe-core";

/**
 * Violaciones de accesibilidad graves (`serious` o `critical`) de un fragmento del DOM,
 * en un formato legible para el mensaje del test (HU-UI-04).
 *
 * `color-contrast` va apagado: jsdom no calcula estilos ni layout, así que axe no puede
 * medirlo. El contraste de los temas lo verifica `brand/tokens/contrast.mjs` en el CI.
 * `region` también va apagado porque se prueban páginas sin el shell (sin landmarks).
 *
 * Acepta un contexto de axe (`include`/`exclude`) para revisar una página grande por partes.
 */
export async function violacionesGraves(contenedor: Element | axe.ElementContext): Promise<string[]> {
  const resultado = await axe.run(contenedor, {
    resultTypes: ["violations"],
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
    },
  });
  return resultado.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}, ${v.nodes.length}): ${v.help} → ${v.nodes[0]?.target.join(" ")}`);
}
