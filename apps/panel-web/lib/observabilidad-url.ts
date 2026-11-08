/**
 * Enlaces de observabilidad del menú del avatar: «Observabilidad (Grafana)» y «Logs (Kibana)».
 *
 * Los fijan las variables de servidor `GRAFANA_URL` y `KIBANA_URL` (se leen en runtime, como
 * `WIKI_URL`). Solo se acepta una URL absoluta `https://`: son herramientas externas, detrás de
 * su propio acceso (Grafana Cloud, Kibana tras Cloudflare Access), así que no hay rutas del panel.
 * Sin variable, o con otro valor (`http:`, `javascript:`, `//otro-sitio`, una ruta), el ítem no se
 * muestra.
 */
export function resolverObservabilidadUrl(valor: string | null | undefined): string | null {
  const url = valor?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export type EnlacesObservabilidad = {
  grafanaUrl: string | null;
  kibanaUrl: string | null;
};

export const SIN_OBSERVABILIDAD: EnlacesObservabilidad = { grafanaUrl: null, kibanaUrl: null };

/**
 * Solo el master ve los enlaces (el tester no, como en Crons, ADR-0183). Para cualquier otro rol
 * llegan `null` desde el servidor, así que la URL ni siquiera viaja en el HTML.
 */
export function enlacesDeObservabilidad(
  me: { role?: string | null } | null | undefined,
  env: { GRAFANA_URL?: string; KIBANA_URL?: string },
): EnlacesObservabilidad {
  if (me?.role !== "master") return SIN_OBSERVABILIDAD;
  return {
    grafanaUrl: resolverObservabilidadUrl(env.GRAFANA_URL),
    kibanaUrl: resolverObservabilidadUrl(env.KIBANA_URL),
  };
}
