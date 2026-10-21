/** Foto del producto por URL (HU-CRM-01): mismas reglas que la API (`ProductSave.image_url`). */
export const FOTO_URL_MAX = 2048;

/** `true` si la URL se puede guardar como foto: https, sin espacios y hasta 2048 caracteres. */
export function esFotoValida(url: string): boolean {
  const valor = url.trim();
  return (
    valor.length > "https://".length &&
    valor.length <= FOTO_URL_MAX &&
    valor.toLowerCase().startsWith("https://") &&
    !/\s/.test(valor)
  );
}
