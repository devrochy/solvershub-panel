"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sectionHelp } from "@/lib/copy";

/**
 * Ayuda en contexto (HU-UX-03): un ícono junto al título que abre la descripción
 * de la página y sus primeros pasos. Es el mismo patrón en todas las secciones.
 */
export function SectionHelp({ section, description, className }: { section?: string; description?: string; className?: string }) {
  const help = section ? sectionHelp(section) : null;
  if (!help && !description) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="¿Qué es esto?" className={className}>
          <Info className="h-4 w-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent label="¿Qué es esto?" className="flex w-80 flex-col gap-3 text-body">
        {description && <p className="font-medium text-headline">{description}</p>}
        {help && <p>{help.what}</p>}
        {help && (
          <div>
            <p className="mb-1 font-medium text-headline">Para empezar:</p>
            <ul className="list-disc space-y-1 pl-5">
              {help.first.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
