// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { etiquetaDeControl, mensajeDeRango, mensajeDeValidacion } from "@/lib/validacion-nativa";

afterEach(cleanup);

function control(html: string, valor?: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const { container } = render(<div dangerouslySetInnerHTML={{ __html: html }} />);
  const el = container.querySelector("input,select,textarea") as HTMLInputElement;
  if (valor !== undefined) el.value = valor;
  return el;
}

describe("mensajeDeRango", () => {
  it("elige la frase según los límites", () => {
    expect(mensajeDeRango("«X»", -1, 0, 30)).toBe("«X» debe estar entre 0 y 30.");
    expect(mensajeDeRango("«X»", -1, 0, null)).toBe("«X» debe ser mayor o igual a 0.");
    expect(mensajeDeRango("«X»", 9, undefined, 5)).toBe("«X» debe ser menor o igual a 5.");
    expect(mensajeDeRango("«X»", 3, 0, 5)).toBeNull();
  });
});

describe("etiquetaDeControl", () => {
  it("quita el « *(obligatorio)» que agrega Field", () => {
    const el = control('<label for="a">Correo <span> *<span>(obligatorio)</span></span></label><input id="a" required>');
    expect(etiquetaDeControl(el)).toBe("«Correo»");
  });

  it("cae al aria-label y luego al nombre", () => {
    expect(etiquetaDeControl(control('<input aria-label="Buscar cliente" required>'))).toBe("«Buscar cliente»");
    expect(etiquetaDeControl(control('<input name="dias_de_gracia" required>'))).toBe("«Dias de gracia»");
  });
});

describe("mensajeDeValidacion", () => {
  it.each([
    ['<label for="a">Nombre</label><input id="a" required>', "", "«Nombre» es obligatorio."],
    ['<label for="a">Correo</label><input id="a" type="email">', "ana@", "Escribe un correo válido, por ejemplo ana@correo.com."],
    ['<label for="a">Sitio</label><input id="a" type="url">', "x", "«Sitio» debe ser una dirección web completa, por ejemplo https://ejemplo.com."],
    ['<label for="a">Días</label><input id="a" type="number" min="0">', "-1", "«Días» debe ser mayor o igual a 0."],
    ['<label for="a">Días</label><input id="a" type="number" min="1" max="9">', "12", "«Días» debe estar entre 1 y 9."],
    ['<label for="a">Cuotas</label><input id="a" type="number" min="0">', "2.5", "«Cuotas» debe ser un número entero."],
    ['<label for="a">Cuotas</label><input id="a" type="number" min="0" step="0.5">', "2.2", "«Cuotas» no es un valor válido."],
    ['<label for="a">Código</label><input id="a" pattern="[0-9]+">', "ab", "«Código» no tiene el formato esperado."],
    ['<label for="a">Código</label><input id="a" pattern="[0-9]+" title="Solo números.">', "ab", "Solo números."],
    ['<label for="a">Canal</label><select id="a" required><option value="">—</option><option>a</option></select>', "", "Elige una opción en «Canal»."],
    ['<label for="a">Acepto</label><input id="a" type="checkbox" required>', undefined, "Marca «Acepto» para continuar."],
    ['<label for="a">Notas</label><textarea id="a" required></textarea>', "", "«Notas» es obligatorio."],
  ])("%s → %s", (html, valor, esperado) => {
    const el = control(html as string, valor as string | undefined);
    expect(el.validity.valid).toBe(false);
    expect(mensajeDeValidacion(el)).toBe(esperado);
  });
});
