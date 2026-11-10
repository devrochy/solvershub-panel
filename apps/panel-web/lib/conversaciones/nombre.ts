/** Celular colombiano como lo manda WhatsApp, con o sin «+»: 573000000002. */
const CELULAR_COLOMBIA = /^\+?57(\d{3})(\d{3})(\d{4})$/;

/** «+57 300 000 0002» si es un celular colombiano; cualquier otro identificador queda igual. */
export function formatearIdentificador(id: string): string {
  const partes = CELULAR_COLOMBIA.exec(id);
  return partes ? `+57 ${partes[1]} ${partes[2]} ${partes[3]}` : id;
}

/**
 * Cómo se llama un cliente en una lista de chats: su nombre; si no lo dio, su identificador, y a
 * un visitante del chat web (`web:<hash>`) como «Visitante web · cf78». Una sola fuente para la
 * bandeja de Conversaciones y para el Resumen, así los dos dicen lo mismo.
 */
export function nombreDelChat(chat: { customer_name?: string | null; external_id?: string | null }): string {
  if (chat.customer_name) return chat.customer_name;
  const id = chat.external_id;
  if (!id) return "Cliente";
  if (id.startsWith("web:") && id.length > 4) return `Visitante web · ${id.slice(4, 8)}`;
  return formatearIdentificador(id);
}
