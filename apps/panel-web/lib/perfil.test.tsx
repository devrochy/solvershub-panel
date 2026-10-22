// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PerfilForm } from "@/app/(app)/perfil/_components/perfil-form";
import type { Me } from "@/lib/api/types";
import { me as meBase } from "@/lib/testing/fixtures";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/perfil",
}));

const fetchMock = vi.fn();

beforeEach(() => {
  refresh.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(cleanup);

const ME: Me = {
  ...meBase,
  email: "ana@demo.local",
  username: "ana.perez",
  nombre: "Ana Pérez",
  telefono: "+57 300 123 4567",
  avatar_url: null,
};

describe("perfil propio", () => {
  it("muestra los datos actuales y guarda el perfil", async () => {
    render(<PerfilForm me={ME} />);
    expect((screen.getByLabelText("Nombre completo") as HTMLInputElement).value).toBe("Ana Pérez");
    expect((screen.getByLabelText("Usuario") as HTMLInputElement).value).toBe("ana.perez");
    expect((screen.getByLabelText("Correo") as HTMLInputElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana María Pérez" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes("/api/perfil") && init?.method === "PATCH",
      );
      expect(llamada).toBeTruthy();
      const body = JSON.parse(String(llamada?.[1]?.body));
      expect(body.nombre).toBe("Ana María Pérez");
      expect(body.telefono).toBe("+57 300 123 4567");
      expect(body.username).toBe("ana.perez");
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("valida y cambia la contraseña", async () => {
    render(<PerfilForm me={ME} />);
    fireEvent.change(screen.getByLabelText(/Contraseña actual/), { target: { value: "clave-vieja" } });
    fireEvent.change(screen.getByLabelText(/Contraseña nueva/), { target: { value: "clave-nueva-1" } });
    fireEvent.change(screen.getByLabelText(/Repite la contraseña nueva/), { target: { value: "otra-distinta" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(await screen.findByText(/no coinciden/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Repite la contraseña nueva/), { target: { value: "clave-nueva-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes("/api/perfil/password") && init?.method === "POST",
      );
      expect(llamada).toBeTruthy();
      const body = JSON.parse(String(llamada?.[1]?.body));
      expect(body).toEqual({ actual: "clave-vieja", nueva: "clave-nueva-1" });
    });
  });
});
