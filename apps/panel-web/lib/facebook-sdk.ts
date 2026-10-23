import { useEffect, useState } from "react";

/**
 * SDK de Facebook (JavaScript) para los popups de alta de Meta: WhatsApp (Embedded Signup) y
 * Messenger (Facebook Login for Business). Se carga una sola vez por página.
 */

export type FbLoginResponse = { authResponse?: { code?: string } | null; status?: string };
export type FbSdk = {
  init(opts: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }): void;
  login(cb: (response: FbLoginResponse) => void, opts: Record<string, unknown>): void;
};

declare global {
  interface Window {
    FB?: FbSdk;
    fbAsyncInit?: () => void;
  }
}

const SDK_ID = "facebook-jssdk";
const SDK_URL = "https://connect.facebook.net/en_US/sdk.js";

/** Carga el SDK de Facebook una sola vez y lo inicializa con la app de la plataforma. */
export function useFacebookSdk(appId: string, version: string, activo: boolean): boolean {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    if (!activo || !appId) return;
    if (window.FB) {
      // Ya cargado (navegación dentro del panel): se marca en un callback, no en el efecto.
      void Promise.resolve().then(() => setListo(true));
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, autoLogAppEvents: true, xfbml: false, version: version || "v21.0" });
      setListo(true);
    };
    if (!document.getElementById(SDK_ID)) {
      const script = document.createElement("script");
      script.id = SDK_ID;
      script.src = SDK_URL;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);
    }
  }, [activo, appId, version]);
  return listo;
}
