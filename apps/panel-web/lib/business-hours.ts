/** Parseo/serialización del horario de atención del pack calendario (HU-UI-01).
 * Formato del backend: `{"mon": "08:00-18:00", ...}`; "" = cerrado.
 */

export type BusinessHours = Record<string, string>;

export const WEEKDAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

/** Parsea el JSON (o string JSON) del backend a un mapa día→rango. */
export function parseBusinessHours(raw: unknown): BusinessHours {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw || "{}");
    } catch {
      data = {};
    }
  }
  const out: BusinessHours = {};
  if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
  }
  return out;
}

/** Serializa el mapa día→rango al JSON del backend (omite vacíos). */
export function serializeBusinessHours(h: BusinessHours): string {
  const clean: BusinessHours = {};
  for (const [k, v] of Object.entries(h)) {
    if (v && v.trim()) clean[k] = v.trim();
  }
  return JSON.stringify(clean);
}
