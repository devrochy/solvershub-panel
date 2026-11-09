// API falsa para los recorridos E2E: solo responde lo que necesita el acceso al panel.
// Lo demás da 404, y el panel lo trata igual que una consulta fallida.
import { createServer } from "node:http";

export const USUARIO = "duena@prueba.test";
export const CLAVE = "clave-de-prueba-e2e";
const TOKEN = "token-de-prueba-e2e";

// Cuenta sin negocio: el resumen no pide más datos para pintarse.
const ME = {
  admin_id: "00000000-0000-0000-0000-000000000001",
  email: USUARIO,
  username: null,
  role: "master",
  tenant: null,
  tenant_count: 0,
  permissions: { dashboard: "read" },
  invitaciones_pendientes: 0,
};

function responder(res, status, cuerpo) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(cuerpo));
}

async function leerJson(req) {
  let texto = "";
  for await (const parte of req) texto += parte;
  return JSON.parse(texto || "{}");
}

const servidor = createServer(async (req, res) => {
  if (req.url === "/salud") return responder(res, 200, { ok: true });

  if (req.method === "POST" && req.url === "/api/v1/auth/login") {
    const { identifier, password } = await leerJson(req);
    if (identifier === USUARIO && password === CLAVE) {
      return responder(res, 200, { token: TOKEN, expires_in: 3600 });
    }
    return responder(res, 401, { error: { message: "Correo o contraseña incorrectos." } });
  }

  if (req.method === "GET" && req.url === "/api/v1/admin/me") {
    if (req.headers.authorization === `Bearer ${TOKEN}`) return responder(res, 200, ME);
    return responder(res, 401, { error: { message: "Sesión no válida." } });
  }

  return responder(res, 404, { error: { message: "No existe en la API falsa." } });
});

if (process.env.PUERTO_API) servidor.listen(Number(process.env.PUERTO_API), "127.0.0.1");
