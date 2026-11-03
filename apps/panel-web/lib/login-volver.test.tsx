// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LoginForm } from "@/app/login/_components/login-form";

// «Volver» tras el login (la Wiki manda aquí a quien no tiene sesión): va a la ruta que el
// servidor validó, y al Resumen si no hay ninguna.

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
  vi.unstubAllGlobals();
});

async function entrar(destino?: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
  render(destino ? <LoginForm destino={destino} /> : <LoginForm />);
  fireEvent.change(screen.getByLabelText(/Correo o usuario/), { target: { value: "ana@ejemplo.com" } });
  fireEvent.change(document.getElementById("password")!, { target: { value: "cambia-esto-1" } });
  fireEvent.submit(screen.getByRole("button", { name: /Iniciar sesión|Entrar|Ingresar/ }).closest("form")!);
  await waitFor(() => expect(replace).toHaveBeenCalled());
}

describe("LoginForm: a dónde se va al entrar", () => {
  it("vuelve a la página de la Wiki que se pedía", async () => {
    await entrar("/ayuda/02-guia-de-usuario/01-interfaz-y-navegacion");
    expect(replace).toHaveBeenCalledWith("/ayuda/02-guia-de-usuario/01-interfaz-y-navegacion");
  });

  it("sin destino va al Resumen", async () => {
    await entrar();
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });
});
