"use client";

import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { sectionHelp } from "@/lib/copy";

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
