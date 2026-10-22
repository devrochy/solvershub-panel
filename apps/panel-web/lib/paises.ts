/** Indicativos telefónicos para el campo de teléfono de la sección Equipo. */

export type Pais = {
  /** Código ISO 3166-1 alfa-2, también la clave de la bandera emoji. */
  codigo: string;
  nombre: string;
  indicativo: string;
  bandera: string;
};

/** De una clave ISO (p. ej. "CO") a su bandera emoji (regional indicators). */
function banderaDe(codigo: string): string {
  return codigo
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const DATOS: [string, string, string][] = [
  ["CO", "Colombia", "+57"],
  ["MX", "México", "+52"],
  ["AR", "Argentina", "+54"],
  ["CL", "Chile", "+56"],
  ["PE", "Perú", "+51"],
  ["EC", "Ecuador", "+593"],
  ["BR", "Brasil", "+55"],
  ["ES", "España", "+34"],
  ["US", "Estados Unidos", "+1"],
  ["PA", "Panamá", "+507"],
  ["GT", "Guatemala", "+502"],
  ["CR", "Costa Rica", "+506"],
  ["DO", "República Dominicana", "+1"],
  ["UY", "Uruguay", "+598"],
  ["PY", "Paraguay", "+595"],
  ["BO", "Bolivia", "+591"],
  ["VE", "Venezuela", "+58"],
  ["HN", "Honduras", "+504"],
  ["SV", "El Salvador", "+503"],
  ["NI", "Nicaragua", "+505"],
];

export const PAISES: Pais[] = DATOS.map(([codigo, nombre, indicativo]) => ({
  codigo,
  nombre,
  indicativo,
  bandera: banderaDe(codigo),
}));

export const PAIS_POR_DEFECTO = "CO";

/** Indicativo numérico (sin «+») de un código de país, o «» si no se conoce. */
export function indicativoNumerico(codigo: string): string {
  return PAISES.find((p) => p.codigo === codigo)?.indicativo.replace("+", "") ?? "";
}

/** Separa un teléfono guardado («+57 300…») en país e indicativo para el formulario. */
export function parsearTelefono(valor: string | null | undefined): { indicativo: string; numero: string } {
  const texto = (valor ?? "").trim();
  if (!texto) return { indicativo: PAIS_POR_DEFECTO, numero: "" };
  const pais = PAISES.find((p) => texto.startsWith(p.indicativo));
  if (!pais) return { indicativo: PAIS_POR_DEFECTO, numero: texto.replace(/^\+\d+\s*/, "") };
  return { indicativo: pais.codigo, numero: texto.slice(pais.indicativo.length).trim() };
}
