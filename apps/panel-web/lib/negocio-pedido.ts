const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Negocio que pide un enlace externo (la app abre `/calendario?tenant=<id>`) cuando no es
 * el activo del panel. El panel usa el negocio de su propia sesión (cookie), que puede ser
 * otro: la página avisa y ofrece cambiar antes de acciones que se guardan en el negocio
 * activo, como conectar Google. Devuelve `null` si coincide o si el valor no es un UUID.
 */
export function negocioPedidoDistinto(
  param: string | undefined,
  activoId: string | null | undefined,
): string | null {
  if (!param || !UUID.test(param)) return null;
  const pedido = param.toLowerCase();
  return pedido === activoId?.toLowerCase() ? null : pedido;
}
