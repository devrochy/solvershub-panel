"use client";

import { useEffect } from "react";

import { toast } from "@/lib/toast-store";
import { mensajeDeValidacion } from "@/lib/validacion-nativa";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const MARCA = "data-validacion-nativa";

const esControl = (t: EventTarget | null): t is Control =>
  t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;

/**
 * Validación nativa del navegador, en español (HU-UX-13). Los formularios que no llevan `noValidate`
 * (`required`, `min`, `type=email`…) hacían salir la burbuja del navegador, en su idioma (inglés en un
 * Chrome en-US). Este gestor global la reemplaza por el aviso rojo del kit, en español, con foco y
 * borde rojo en el primer campo con error.
 *
 * El navegador sigue bloqueando el envío (solo se cancela su burbuja), así que ningún formulario manda
 * datos inválidos al backend. Los formularios con `noValidate` no lanzan el evento: no les cambia nada.
 * `invalid` no burbujea, por eso se escucha en la fase de captura sobre `document`.
 */
export function ValidacionEnEspanol() {
  useEffect(() => {
    let pendientes: Control[] = [];
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    const avisar = () => {
      temporizador = undefined;
      const controles = pendientes.filter((c) => c.isConnected);
      pendientes = [];
      if (controles.length === 0) return;
      const [primero, ...resto] = controles;
      const extra = resto.length > 0 ? ` Revisa también ${resto.length === 1 ? "otro campo" : `otros ${resto.length} campos`}.` : "";
      toast.error(`${mensajeDeValidacion(primero)}${extra}`);
      primero.focus();
    };

    const alInvalido = (event: Event) => {
      const control = event.target;
      if (!esControl(control)) return;
      // Cancela la burbuja nativa; el envío sigue bloqueado por el navegador.
      event.preventDefault();
      control.setAttribute("aria-invalid", "true");
      control.setAttribute(MARCA, "");
      // Los `invalid` de un mismo envío llegan seguidos: un solo aviso, sobre el primero en el orden del documento.
      pendientes.push(control);
      temporizador ??= setTimeout(avisar, 0);
    };

    const alEditar = (event: Event) => {
      const control = event.target;
      if (esControl(control) && control.hasAttribute(MARCA)) {
        control.removeAttribute(MARCA);
        control.removeAttribute("aria-invalid");
      }
    };

    document.addEventListener("invalid", alInvalido, true);
    document.addEventListener("input", alEditar, true);
    document.addEventListener("change", alEditar, true);
    return () => {
      document.removeEventListener("invalid", alInvalido, true);
      document.removeEventListener("input", alEditar, true);
      document.removeEventListener("change", alEditar, true);
      if (temporizador) clearTimeout(temporizador);
    };
  }, []);

  return null;
}
