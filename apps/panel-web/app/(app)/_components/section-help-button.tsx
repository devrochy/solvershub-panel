"use client";

import { HelpCircle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sectionHelp } from "@/lib/copy";

/** La misma ayuda para una cabecera compacta: un ícono que abre la descripción de la página. */
export function SectionHelpPopover({
  section,
  description,
  className,
}: {
  section?: string;
  description?: string;
  className?: string;
}) {
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

/**
 * "¿Qué es esto?" (HU-UX-03): explica para qué sirve la sección y qué hacer
 * primero, en lenguaje de negocio. Se monta en el `PageHeader`.
 */
export function SectionHelpButton({ section }: { section: string }) {
  const help = sectionHelp(section);
  if (!help) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-text-soft">
          <HelpCircle className="h-4 w-4" aria-hidden />
          ¿Qué es esto?
        </Button>
      </DialogTrigger>
      <DialogContent title={help.question}>
        <div className="flex flex-col gap-3 text-sm text-body">
          <p>{help.what}</p>
          <div>
            <p className="mb-1 font-medium text-headline">Para empezar:</p>
            <ul className="list-disc space-y-1 pl-5">
              {help.first.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
