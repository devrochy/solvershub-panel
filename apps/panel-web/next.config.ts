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

// Solo en el wizard de WhatsApp (HU-SH-05): el SDK de Facebook para Embedded Signup. El
// script sale de connect.facebook.net y el SDK usa iframes y llamadas a *.facebook.com.
// El resto del panel no carga nada de Facebook.
const FACEBOOK = "https://*.facebook.com https://facebook.com";
const CSP_EMBEDDED_SIGNUP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${FACEBOOK} https://*.fbcdn.net`,
  "font-src 'self' data:",
  `connect-src 'self' ${FACEBOOK} https://connect.facebook.net`,
  `frame-src ${FACEBOOK}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Solo en el catálogo (HU-CRM-01): la foto del producto es un link https que carga el dueño
// (su tienda, un CDN). Una imagen no ejecuta código; el resto del panel sigue en 'self'.
const CSP_FOTOS_DE_PRODUCTOS = CSP.replace("img-src 'self' data: blob:", "img-src 'self' data: blob: https:");

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
      // Va después: con la misma cabecera, la última regla que coincide gana.
      {
        source: "/conexiones/whatsapp",
        headers: [{ key: "Content-Security-Policy", value: CSP_EMBEDDED_SIGNUP }],
      },
      {
        source: "/comercio/productos",
        headers: [{ key: "Content-Security-Policy", value: CSP_FOTOS_DE_PRODUCTOS }],
      },
    ];
  },
};

export default nextConfig;
