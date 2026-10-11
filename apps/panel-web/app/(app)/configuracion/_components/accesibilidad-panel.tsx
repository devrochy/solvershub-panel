"use client";

import { useAtajos } from "@/components/shell/atajos-context";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";

/**
 * Preferencias de accesibilidad de quien usa el panel (HU-DS-05). No son del negocio:
 * se guardan en este navegador y no afectan a los demás colaboradores.
 */
export function AccesibilidadPanel() {
  const atajos = useAtajos();
  if (!atajos) return null;

  return (
    <section className="flex max-w-2xl flex-col gap-4 rounded-lg border border-border-soft bg-surface p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-headline">Accesibilidad</h2>
        <p className="mt-1 text-sh-dense text-body">Solo para ti y en este navegador.</p>
      </div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <label htmlFor="pref-atajos" className="text-sh-dense font-medium text-headline">
            Atajos de una tecla
          </label>
          <p className="mt-1 text-sh-caption text-text-soft">
            <Kbd keys={["/"]} />, <Kbd keys={["["]} />, <Kbd keys={["?"]} /> y <Kbd keys={["g"]} /> seguida de una letra.
            Apágalos si usas un lector de pantalla o dictado por voz y se te disparan sin querer. Ctrl K sigue abriendo
            la paleta.
          </p>
        </div>
        <Switch id="pref-atajos" checked={atajos.atajosActivos} onCheckedChange={atajos.cambiarAtajos} />
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={atajos.abrirAyuda}>
          Ver todos los atajos
        </Button>
      </div>
    </section>
  );
}
