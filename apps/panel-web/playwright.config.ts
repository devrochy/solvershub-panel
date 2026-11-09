import { defineConfig, devices } from "@playwright/test";

// Recorridos del panel contra una API falsa (e2e/api-falsa.mjs), sin backend ni base de datos.
// Requiere `npm run build` antes: se prueba la build de producción.
const PUERTO_PANEL = 3210;
const PUERTO_API = 8799;
const URL_PANEL = `http://localhost:${PUERTO_PANEL}`;
const URL_API = `http://127.0.0.1:${PUERTO_API}`;
const EN_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: EN_CI,
  retries: EN_CI ? 1 : 0,
  reporter: EN_CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: URL_PANEL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/api-falsa.mjs",
      url: `${URL_API}/salud`,
      env: { PUERTO_API: String(PUERTO_API) },
      reuseExistingServer: !EN_CI,
    },
    {
      command: `npx next start -p ${PUERTO_PANEL}`,
      url: `${URL_PANEL}/login`,
      env: { AGENT_CORE_API_URL: URL_API },
      reuseExistingServer: !EN_CI,
    },
  ],
});
