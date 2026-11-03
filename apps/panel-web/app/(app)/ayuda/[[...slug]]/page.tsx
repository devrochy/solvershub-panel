import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import "../ayuda.css";

import { PaginaDeAyuda } from "@/components/ayuda/pagina-de-ayuda";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { nivelDeSesion } from "@/lib/ayuda/acceso";
import { PAGINAS_DE_AYUDA } from "@/lib/ayuda/contenido";
import { buscarPagina, hrefDeAyuda, indiceVisible, slugDeSegmentos } from "@/lib/ayuda/paginas";
import { rutaDeLogin } from "@/lib/ruta-segura";

// La Wiki solo se muestra con sesión y cada lector ve lo de su nivel: nunca se genera ni se cachea
// de forma estática. Un slug que no existe o que su nivel no alcanza responde 404, no 403, para no
// revelar que la página existe.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug?: string[] }> };

// Una sola consulta a `/admin/me` por petición, aunque la usen la página y sus metadatos.
const leerSesion = cache(() => apiFetch<Me>("/admin/me"));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await leerSesion();
  // El título de una página que la sesión no puede ver no sale en la pestaña.
  const pagina = res.ok ? buscarPagina(PAGINAS_DE_AYUDA, slug, nivelDeSesion(res.data)) : null;
  return { title: pagina && pagina.slug ? `${pagina.titulo} · Ayuda` : "Ayuda", robots: { index: false, follow: false } };
}

export default async function PaginaAyuda({ params }: Props) {
  const { slug } = await params;
  const res = await leerSesion();
  if (!res.ok) {
    // Sin sesión se vuelve a esta misma página tras iniciarla (el layout hace lo propio con otros fallos).
    redirect(res.status === 401 ? rutaDeLogin(hrefDeAyuda(slugDeSegmentos(slug) ?? "")) : "/login");
  }
  const nivel = nivelDeSesion(res.data);
  const pagina = buscarPagina(PAGINAS_DE_AYUDA, slug, nivel);
  if (!pagina) notFound();
  return <PaginaDeAyuda pagina={pagina} indice={indiceVisible(PAGINAS_DE_AYUDA, nivel)} />;
}
