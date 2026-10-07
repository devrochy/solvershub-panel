import type { NextConfig } from "next";

// CSP de referencia (HU-ARCH-04): presencia sobre estrictez — el panel de
// Next inyecta scripts y estilos inline, por eso `'unsafe-inline'` en ambos.
// frame-ancestors 'none' replica X-Frame-Options DENY.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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
  // Cabeceras de seguridad (HU-ARCH-04): HSTS, CSP, X-Frame-Options,
  // Referrer-Policy y refuerzos afines.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
