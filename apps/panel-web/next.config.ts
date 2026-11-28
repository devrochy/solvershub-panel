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

// La ficha del cliente muestra el avatar subido (URL firmada del backend) y el mapa
// (tiles de OpenStreetMap). Son imágenes: no ejecutan código.
const CSP_FICHA_CLIENTE = CSP.replace("img-src 'self' data: blob:", "img-src 'self' data: blob: https: http:");

// Adjunto de un reporte de cliente servido por el BFF (SPEC-54, HU-FB-06): la bandeja lo muestra en un
// iframe del mismo origen (vista previa del PDF). El archivo no ejecuta nada: sin scripts ni recursos.
const CSP_ADJUNTO_DE_REPORTE = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'";

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
  // El middleware cubre `/api/*` y guarda una copia del cuerpo hasta este tope (10 MB por defecto); lo que
  // pasa de ahí llega cortado al BFF. Un reporte de problema admite 25 MB de adjuntos (SPEC-54).
  experimental: {
    proxyClientMaxBodySize: "26mb",
  },
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
      // SPEC-45: la precarga del asistente muestra la miniatura de cada foto subida (URL firmada del backend).
      {
        source: "/agentes/nuevo",
        headers: [{ key: "Content-Security-Policy", value: CSP_FOTOS_DE_PRODUCTOS }],
      },
      {
        source: "/leads",
        headers: [{ key: "Content-Security-Policy", value: CSP_FICHA_CLIENTE }],
      },
      {
        source: "/conversaciones",
        headers: [{ key: "Content-Security-Policy", value: CSP_FICHA_CLIENTE }],
      },
      {
        source: "/api/platform/feedback/reports/:id/adjuntos/:adjunto",
        headers: [
          { key: "Content-Security-Policy", value: CSP_ADJUNTO_DE_REPORTE },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      // SPEC-54: el detalle de un reporte muestra la miniatura de cada captura (URL firmada del backend).
      {
        source: "/reportes/:id",
        headers: [{ key: "Content-Security-Policy", value: CSP_FICHA_CLIENTE }],
      },
    ];
  },
};

export default nextConfig;
