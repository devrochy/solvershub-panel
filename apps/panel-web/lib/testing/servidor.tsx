import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/**
 * Resuelve los server components asíncronos de un árbol para poder renderizarlo con
 * Testing Library en jsdom (HU-UI-04).
 *
 * React en el cliente no renderiza componentes `async`. En las pruebas se llama la
 * página (que es `async`), y este helper recorre lo que devuelve: cada elemento cuyo
 * tipo es una función `async` se ejecuta y se reemplaza por su resultado. Recorre
 * `children` y las props que traen elementos (slots como `actions`). Los componentes
 * síncronos no se llaman: los renderiza React, con sus hooks.
 */
const esAsync = (tipo: unknown): tipo is (props: unknown) => Promise<ReactNode> =>
  typeof tipo === "function" && tipo.constructor?.name === "AsyncFunction";

export async function resolverServidor(nodo: ReactNode): Promise<ReactNode> {
  if (Array.isArray(nodo)) return Promise.all(nodo.map(resolverServidor));
  if (!isValidElement(nodo)) return nodo;

  const elemento = nodo as ReactElement<Record<string, unknown>>;
  if (esAsync(elemento.type)) {
    return resolverServidor(await elemento.type(elemento.props));
  }

  const props: Record<string, unknown> = {};
  let cambio = false;
  for (const [clave, valor] of Object.entries(elemento.props)) {
    if (clave === "children" || isValidElement(valor) || Array.isArray(valor)) {
      props[clave] = await resolverServidor(valor as ReactNode);
      cambio = true;
    }
  }
  return cambio ? cloneElement(elemento, props) : elemento;
}
