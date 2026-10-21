"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { QaAdjunto, QaCatalogo, QaEjecucion, QaResultadoPrueba } from "@/lib/api/types";
import { estadoDePrueba, type EstadoPaso } from "@/lib/qa/estados";
import { FILTROS_INICIALES, enOrdenDeLista, filtrar, siguientePendiente, vecina, type Filtros } from "@/lib/qa/lista";
import { toast } from "@/lib/toast-store";

import { llamarQa, type Respuesta } from "./api";
import { CabeceraDeAvance, type EstadoGuardado } from "./cabecera-de-avance";
import { Ejecutor } from "./ejecutor";
import { InformePrevio } from "./informe-previo";
import { ListaDePruebas } from "./lista-de-pruebas";

const VACIO: QaResultadoPrueba = { estado: "sin_correr", nota: null, pasos: {}, adjuntos: [] };
// Los filtros de la lista (menos el texto) se recuerdan en este navegador, con el mismo patrón
// que los grupos del menú lateral: `useSyncExternalStore` sobre localStorage.
const CLAVE_FILTROS = "qa:filtros";
type FiltrosGuardados = Omit<Filtros, "texto">;
const GUARDADOS_INICIALES: FiltrosGuardados = {
  estado: FILTROS_INICIALES.estado,
  entorno: FILTROS_INICIALES.entorno,
  area: FILTROS_INICIALES.area,
  subseccion: FILTROS_INICIALES.subseccion,
  soloHumo: FILTROS_INICIALES.soloHumo,
};
let filtrosCache: FiltrosGuardados | null = null;
const oyentes = new Set<() => void>();

function leerFiltros(): FiltrosGuardados {
  if (filtrosCache) return filtrosCache;
  try {
    const crudo = window.localStorage.getItem(CLAVE_FILTROS);
    filtrosCache = { ...GUARDADOS_INICIALES, ...(crudo ? (JSON.parse(crudo) as Partial<FiltrosGuardados>) : {}) };
  } catch {
    filtrosCache = GUARDADOS_INICIALES;
  }
  return filtrosCache;
}

function escribirFiltros(next: FiltrosGuardados) {
  filtrosCache = next;
  try {
    window.localStorage.setItem(CLAVE_FILTROS, JSON.stringify(next));
  } catch {
    // Sin almacenamiento (ventana privada): el filtro vale solo para esta visita.
  }
  oyentes.forEach((notificar) => notificar());
}

function suscribir(notificar: () => void) {
  oyentes.add(notificar);
  return () => {
    oyentes.delete(notificar);
  };
}

/**
 * Ejecución de pruebas de un tester (HU-QA-03). Todo se guarda al instante: cada acción
 * actualiza la vista primero (optimista) y la respuesta de la API reemplaza el estado; si
 * falla, se revierte y se avisa.
 */
export function EjecucionDePruebas({
  catalogo,
  inicial,
  guia,
}: {
  catalogo: QaCatalogo;
  inicial: QaEjecucion | null;
  /** Títulos de la guía de datos por slug, para los enlaces de «Necesitas». */
  guia: Record<string, string>;
}) {
  const items = useMemo(() => enOrdenDeLista(catalogo.items), [catalogo.items]);
  const [run, setRun] = useState<QaEjecucion | null>(inicial);
  const guardados = useSyncExternalStore(suscribir, leerFiltros, () => GUARDADOS_INICIALES);
  const [texto, setTexto] = useState("");
  const filtros = useMemo<Filtros>(() => ({ ...guardados, texto }), [guardados, texto]);
  const setFiltros = useCallback((f: Filtros) => {
    const { texto: nuevoTexto, ...resto } = f;
    setTexto(nuevoTexto);
    escribirFiltros(resto);
  }, []);
  const [guardado, setGuardado] = useState<EstadoGuardado>({ estado: "idle" });
  const [empezando, setEmpezando] = useState(false);
  const [informeAbierto, setInformeAbierto] = useState(false);
  const [listaAbierta, setListaAbierta] = useState(false);

  const resultados = useMemo(() => run?.resultados ?? {}, [run]);
  const estadoDe = useCallback((slug: string) => resultados[slug]?.estado ?? "sin_correr", [resultados]);
  const visibles = useMemo(() => filtrar(items, filtros, estadoDe), [items, filtros, estadoDe]);
  const [seleccion, setSeleccion] = useState<string | null>(
    () => siguientePendiente(items, null, (s) => inicial?.resultados?.[s]?.estado ?? "sin_correr") ?? items[0]?.slug ?? null,
  );
  const item = items.find((i) => i.slug === seleccion) ?? null;
  const editable = !!run?.editable;

  function elegir(slug: string) {
    setSeleccion(slug);
    setListaAbierta(false);
  }

  async function guardar(accion: () => Promise<Respuesta<QaEjecucion>>, anterior: QaEjecucion | null): Promise<boolean> {
    setGuardado({ estado: "guardando" });
    const r = await accion();
    if (r.ok) {
      setRun(r.data);
      setGuardado({ estado: "ok", en: new Date() });
      return true;
    }
    setRun(anterior);
    setGuardado({ estado: "error" });
    toast.error(r.error);
    return false;
  }

  function aplicarLocal(slug: string, mutar: (res: QaResultadoPrueba) => QaResultadoPrueba) {
    setRun((prev) =>
      prev ? { ...prev, resultados: { ...(prev.resultados ?? {}), [slug]: mutar(prev.resultados?.[slug] ?? VACIO) } } : prev,
    );
  }

  async function marcarPaso(slug: string, n: number, estado: EstadoPaso | null): Promise<boolean> {
    if (!editable) return false;
    const total = items.find((i) => i.slug === slug)?.pasos?.length ?? 0;
    const anterior = run;
    aplicarLocal(slug, (res) => {
      const pasos = { ...res.pasos, [String(n)]: { ...res.pasos?.[String(n)], estado } };
      const marcas = Object.fromEntries(Object.entries(pasos).map(([k, v]) => [k, v?.estado ?? null]));
      return { ...res, pasos, estado: estadoDePrueba(total, marcas) };
    });
    return guardar(() => llamarQa<QaEjecucion>(`runs/me/items/${slug}/steps/${n}`, { method: "PUT", json: { estado } }), anterior);
  }

  async function notaDePaso(slug: string, n: number, nota: string): Promise<boolean> {
    if (!editable) return false;
    const actual = resultados[slug]?.pasos?.[String(n)];
    if ((actual?.nota ?? "") === nota.trim()) return true;
    const anterior = run;
    aplicarLocal(slug, (res) => ({ ...res, pasos: { ...res.pasos, [String(n)]: { ...actual, nota: nota.trim() || null } } }));
    // El PUT del paso reemplaza el estado: se manda el que ya tiene para no desmarcarlo.
    return guardar(
      () =>
        llamarQa<QaEjecucion>(`runs/me/items/${slug}/steps/${n}`, {
          method: "PUT",
          json: { estado: actual?.estado ?? null, nota: nota.trim() || null },
        }),
      anterior,
    );
  }

  async function notaDePrueba(slug: string, nota: string): Promise<boolean> {
    if (!editable || (resultados[slug]?.nota ?? "") === nota.trim()) return true;
    const anterior = run;
    aplicarLocal(slug, (res) => ({ ...res, nota: nota.trim() || null }));
    return guardar(() => llamarQa<QaEjecucion>(`runs/me/items/${slug}`, { method: "PUT", json: { nota: nota.trim() || null } }), anterior);
  }

  async function subirCapturas(slug: string, n: number, archivos: File[]) {
    if (!editable) return;
    setGuardado({ estado: "guardando" });
    for (const archivo of archivos) {
      const form = new FormData();
      form.set("item_slug", slug);
      form.set("paso", String(n));
      form.set("archivo", archivo, archivo.name || `captura-${Date.now()}.png`);
      const r = await llamarQa<QaAdjunto>("runs/me/attachments", { method: "POST", form });
      if (!r.ok) {
        setGuardado({ estado: "error" });
        toast.error(r.error);
        return;
      }
      aplicarLocal(slug, (res) => ({ ...res, adjuntos: [...(res.adjuntos ?? []), r.data] }));
    }
    setGuardado({ estado: "ok", en: new Date() });
  }

  async function quitarCaptura(slug: string, id: string) {
    if (!editable) return;
    const anterior = run;
    aplicarLocal(slug, (res) => ({ ...res, adjuntos: (res.adjuntos ?? []).filter((a) => a.id !== id) }));
    setGuardado({ estado: "guardando" });
    const r = await llamarQa<void>(`attachments/${id}`, { method: "DELETE" });
    if (r.ok) setGuardado({ estado: "ok", en: new Date() });
    else {
      setRun(anterior);
      setGuardado({ estado: "error" });
      toast.error(r.error);
    }
  }

  async function empezar() {
    setEmpezando(true);
    const r = await llamarQa<QaEjecucion>("runs/me/start", { method: "POST" });
    setEmpezando(false);
    if (r.ok) {
      setRun(r.data);
      toast.success("Empezaste tu ejecución. Todo lo que marques se guarda al instante.");
    } else toast.error(r.error);
  }

  const lista = (
    <ListaDePruebas
      items={items}
      visibles={visibles}
      filtros={filtros}
      onFiltros={setFiltros}
      seleccion={seleccion}
      onElegir={elegir}
      estadoDe={estadoDe}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <CabeceraDeAvance
        catalogo={catalogo}
        run={run}
        guardado={guardado}
        empezando={empezando}
        onEmpezar={empezar}
        onEnviar={() => setInformeAbierto(true)}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside aria-label="Lista de pruebas" className="hidden lg:block">
          <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col">{lista}</div>
        </aside>
        <div className="lg:hidden">
          <Sheet open={listaAbierta} onOpenChange={setListaAbierta}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="inline-flex items-center gap-2">
                  <ListChecks aria-hidden className="h-4 w-4" />
                  Lista de pruebas
                </span>
                <span className="tabular-nums text-text-soft">
                  {run?.progreso.terminadas ?? 0}/{items.length}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent title="Lista de pruebas" description="Elige la prueba que quieres ejecutar.">
              <div className="flex min-h-0 flex-1 flex-col">{lista}</div>
            </SheetContent>
          </Sheet>
        </div>

        {item ? (
          <Ejecutor
            key={item.slug}
            item={item}
            guia={guia}
            resultado={resultados[item.slug]}
            empezada={!!run}
            editable={editable}
            onMarcar={(n, estado) => marcarPaso(item.slug, n, estado)}
            onNotaDePaso={(n, nota) => notaDePaso(item.slug, n, nota)}
            onNotaDePrueba={(nota) => notaDePrueba(item.slug, nota)}
            onCapturas={(n, archivos) => subirCapturas(item.slug, n, archivos)}
            onQuitarCaptura={(id) => quitarCaptura(item.slug, id)}
            onSiguiente={() => {
              const sig = siguientePendiente(visibles.length ? visibles : items, item.slug, estadoDe);
              if (sig) setSeleccion(sig);
              else toast.success("No quedan pruebas sin terminar en esta lista. Ya puedes enviar tu informe.");
            }}
            onVecina={(paso) => {
              const v = vecina(visibles, item.slug, paso);
              if (v) setSeleccion(v);
            }}
          />
        ) : (
          <p className="text-sm text-body">Elige una prueba de la lista.</p>
        )}
      </div>

      {run && (
        <InformePrevio
          abierto={informeAbierto}
          onAbierto={setInformeAbierto}
          run={run}
          items={items}
        />
      )}
    </div>
  );
}
