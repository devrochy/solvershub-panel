"use client";

/**
 * «Pruébalo» del asistente de Agentes (SPEC-45, HU-AOS-72): probar el borrador recién creado sin publicarlo, con las
 * acciones simuladas. Mientras el backend no permite fijar el playground a un borrador, el paso explica cómo
 * probarlo después de publicar y deja a mano las frases armadas con lo cargado.
 */
export function PasoProbarBorrador({ sugerencias }: { sugerencias: string[] }) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="text-body">
        Muy pronto podrás conversar aquí con tu agente antes de publicarlo. Por ahora, publícalo en una conexión y pruébalo
        desde su ficha con «Probar»: los clientes no lo ven hasta que lo actives.
      </p>
      {sugerencias.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-headline">Para probarlo, pregúntale por ejemplo:</p>
          <ul className="list-disc pl-5 text-sm text-body">
            {sugerencias.map((f) => (
              <li key={f}>«{f}»</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
