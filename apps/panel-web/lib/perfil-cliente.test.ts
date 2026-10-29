import { describe, expect, it } from "vitest";

import type { LeadCampoPerfil } from "@/lib/api/types";
import { campoVisible, placeholderDe, validarCampoPerfil, validarPerfilCliente } from "./perfil-cliente";

const campo = (key: string, extra: Partial<LeadCampoPerfil> = {}): LeadCampoPerfil => ({
  group: "identidad",
  key,
  label: key,
  tipo: "texto",
  max_length: 120,
  options: [],
  required: false,
  ...extra,
});

describe("perfil del cliente: validación y placeholders", () => {
  it("exige el nombre y respeta el máximo", () => {
    expect(validarCampoPerfil(campo("name", { required: true }), " ", {})).toBe("El nombre no puede quedar vacío.");
    expect(validarCampoPerfil(campo("alias", { max_length: 3 }), "Ana María", {})).toBe("Máximo 3 caracteres.");
  });

  it("valida correo, teléfono y opciones", () => {
    expect(validarCampoPerfil(campo("email", { tipo: "email" }), "no-es-correo", {})).toContain("correo válido");
    expect(validarCampoPerfil(campo("phone", { tipo: "telefono" }), "+57 300", {})).toContain("7 a 15");
    expect(validarCampoPerfil(campo("phone", { tipo: "telefono" }), "+57 300 123 4567", {})).toBeNull();
    expect(
      validarCampoPerfil(
        campo("clasificacion", { tipo: "opciones", options: [{ value: "nuevo", label: "Nuevo" }] }),
        "inventada",
        {},
      ),
    ).toBe("Elige una opción de la lista.");
  });

  it("exige latitud y longitud juntas", () => {
    expect(validarCampoPerfil(campo("latitud", { tipo: "numero" }), "4.6", { latitud: "4.6" })).toBe(
      "Latitud y longitud van juntas.",
    );
    expect(
      validarCampoPerfil(campo("latitud", { tipo: "numero" }), "120", { latitud: "120", longitud: "-74" }),
    ).toContain("entre -90 y 90");
  });

  it("oculta foto, país y coordenadas del formulario", () => {
    expect(campoVisible(campo("avatar_url"))).toBe(false);
    expect(campoVisible(campo("latitud"))).toBe(false);
    expect(campoVisible(campo("name"))).toBe(true);
    expect(placeholderDe(campo("name"))).toBe("Ej. Ana María");
  });

  it("acumula los errores", () => {
    const errores = validarPerfilCliente(
      [campo("name", { required: true }), campo("email", { tipo: "email" })],
      { name: "", email: "mal" },
    );
    expect(Object.keys(errores).sort()).toEqual(["email", "name"]);
  });
});
