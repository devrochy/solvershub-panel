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
  return id;
}
