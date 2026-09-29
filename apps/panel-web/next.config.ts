import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida para desplegar en contenedor (Coolify).
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  // En desarrollo se entra también por la IP de la LAN (móvil/otro equipo).
  // Next 16 bloquea por defecto los recursos de dev de orígenes no listados
  // (HMR, cliente de dev) y sin ellos la página no hidrata: el login caía a un
  // submit nativo. No aplica en producción.
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.40.15"],
};

export default nextConfig;
