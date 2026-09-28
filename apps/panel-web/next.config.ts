import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida para desplegar en contenedor (Coolify).
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
