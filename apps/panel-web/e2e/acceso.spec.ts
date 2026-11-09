import { expect, test, type Page } from "@playwright/test";

import { CLAVE, USUARIO } from "./api-falsa.mjs";

type ResultadoAxe = { violations: { id: string; impact: string | null; help: string }[] };

async function entrar(page: Page, usuario: string, clave: string) {
  await page.goto("/login");
  await page.getByLabel("Correo o usuario").fill(usuario);
  await page.locator("#password").fill(clave);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("sin sesión, la wiki manda al login y recuerda a dónde volver", async ({ page }) => {
  await page.goto("/ayuda");
  await expect(page).toHaveURL(/\/login\?volver=%2Fayuda/);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("el login no tiene problemas graves de accesibilidad", async ({ page }) => {
  await page.goto("/login");
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  const resultado = await page.evaluate(
    () => (window as unknown as { axe: { run: () => Promise<ResultadoAxe> } }).axe.run(),
  );
  const graves = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(graves.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("con credenciales erróneas muestra el motivo y no entra", async ({ page, context }) => {
  await entrar(page, USUARIO, "clave-equivocada");
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  expect((await context.cookies()).some((c) => c.name === "panel_session")).toBe(false);
});

test("con credenciales válidas entra al resumen con la sesión protegida", async ({ page, context }) => {
  await entrar(page, USUARIO, CLAVE);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();
  const sesion = (await context.cookies()).find((c) => c.name === "panel_session");
  expect(sesion?.httpOnly).toBe(true);
});

test("el BFF rechaza una petición que cambia estado desde otro origen", async ({ request }) => {
  const res = await request.post("/api/session", {
    headers: { Origin: "https://sitio-ajeno.example" },
    data: { identifier: USUARIO, password: CLAVE },
  });
  expect(res.status()).toBe(403);
});
