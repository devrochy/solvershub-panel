"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";
import type { Map, Marker } from "leaflet";

import { cn } from "@/lib/utils";

const CENTRO_POR_DEFECTO: [number, number] = [4.65, -74.1];

/**
 * Mapa de la ficha con pin editable (Leaflet + OpenStreetMap). En lectura solo
 * muestra la ubicación; con `onCambio` permite arrastrar el pin o tocar el mapa.
 * La carga de Leaflet es dinámica para no romper el render del servidor.
 */
export function MapaDireccion({
  latitud,
  longitud,
  nombre,
  onCambio,
  soloLectura = false,
  alto = 220,
  className,
}: {
  latitud?: number | null;
  longitud?: number | null;
  nombre: string;
  onCambio?: (latitud: number, longitud: number) => void;
  soloLectura?: boolean;
  alto?: number;
  className?: string;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<Map | null>(null);
  const marcador = useRef<Marker | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(false);
  const cambio = useRef(onCambio);
  useEffect(() => {
    cambio.current = onCambio;
  }, [onCambio]);

  const centro: [number, number] =
    typeof latitud === "number" && typeof longitud === "number" ? [latitud, longitud] : CENTRO_POR_DEFECTO;

  useEffect(() => {
    let cancelado = false;
    let mapaLocal: Map | null = null;
    async function iniciar() {
      try {
        const modulo = await import("leaflet");
        const L = (modulo.default ?? modulo) as typeof import("leaflet");
        if (cancelado || !contenedor.current) return;
        const mapaNuevo = L.map(contenedor.current, { zoomControl: true }).setView(centro, 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(mapaNuevo);
        const icono = L.divIcon({
          className: "",
          html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#0ea5e9;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const marcadorNuevo = L.marker(centro, { draggable: !soloLectura, icon: icono }).addTo(mapaNuevo);
        marcadorNuevo.on("dragend", () => {
          const posicion = marcadorNuevo.getLatLng();
          cambio.current?.(posicion.lat, posicion.lng);
        });
        if (!soloLectura) {
          mapaNuevo.on("click", (evento) => {
            marcadorNuevo.setLatLng(evento.latlng);
            cambio.current?.(evento.latlng.lat, evento.latlng.lng);
          });
        }
        mapa.current = mapaNuevo;
        marcador.current = marcadorNuevo;
        mapaLocal = mapaNuevo;
        setListo(true);
      } catch {
        if (!cancelado) setError(true);
      }
    }
    void iniciar();
    return () => {
      cancelado = true;
      mapa.current = null;
      marcador.current = null;
      mapaLocal?.remove();
    };
    // `centro` se usa solo al montar: los cambios posteriores mueven el marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloLectura]);

  useEffect(() => {
    if (!mapa.current || !marcador.current || typeof latitud !== "number" || typeof longitud !== "number") return;
    marcador.current.setLatLng([latitud, longitud]);
    if (!mapa.current.getBounds().contains([latitud, longitud])) {
      mapa.current.setView([latitud, longitud], mapa.current.getZoom());
    }
  }, [latitud, longitud]);

  if (error) {
    return (
      <div className={cn("rounded-md border border-border-soft bg-surface-2 p-4 text-sm text-text-soft", className)}>
        No se pudo cargar el mapa.{" "}
        {typeof latitud === "number" && typeof longitud === "number" ? (
          <a
            className="text-link hover:underline"
            href={`https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=16/${latitud}/${longitud}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en OpenStreetMap
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-md border border-border-soft", className)}>
      <div
        ref={contenedor}
        role="application"
        aria-label={`Mapa de la ubicación de ${nombre}`}
        style={{ height: alto }}
      />
      {!listo && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-2 text-sm text-text-soft">
          Cargando mapa…
        </div>
      )}
    </div>
  );
}
