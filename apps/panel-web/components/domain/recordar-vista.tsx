"use client";

import { useEffect } from "react";

import { cookieDeVista, type ListaConVista } from "@/lib/vista-guardada";

/** Guarda en este navegador la vista que se está viendo, para abrir la próxima vez en ella. */
export function RecordarVista({ lista, vista }: { lista: ListaConVista; vista: string }) {
  useEffect(() => {
    document.cookie = cookieDeVista(lista, vista);
  }, [lista, vista]);
  return null;
}
