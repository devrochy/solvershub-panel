"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Copy, ExternalLink, KeyRound, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import type { QaDatos, QaDatosAgentOS, QaDatosCuenta, QaItem, QaMisDatos } from "@/lib/api/types";
import { toast } from "@/lib/toast-store";

import { llamarQa } from "./api";

function copiar(texto: string, que: string) {
  void navigator.clipboard.writeText(texto).then(
    () => toast.success(`${que} copiado.`),
    () => toast.error("No se pudo copiar: selecciónalo y cópialo a mano."),
  );
}

/**
 * Datos de prueba (HU-QA-07): «Preparar mis datos» crea el negocio de prueba del tester con sus
 * cuentas; las contraseñas viven solo en el estado de esta vista (se muestran una vez y no se
 * guardan en ningún lado). Debajo, la guía de los datos externos agrupada como en el catálogo.
 * Con los datos listos, «Actualizar mis datos» vuelve a pulsar «Preparar» (HU-QA-09): el backend
 * responde 200 sin contraseñas y pone al día el Agent OS (agentes y chat web).
 */
export function DatosDePrueba({ inicial, guia }: { inicial: QaMisDatos; guia: QaItem[] }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [datos, setDatos] = useState<QaDatos | null>(inicial.datos ?? null);
  const [contrasenas, setContrasenas] = useState<Record<string, string> | null>(null);
  const [trabajando, setTrabajando] = useState<"preparar" | "contrasenas" | "negocio" | null>(null);

  useEffect(() => {
    // Los enlaces de cada prueba llegan con `#<ficha>`: el panel hace scroll dentro de su propio
    // contenedor, así que se lleva la ficha a la vista a mano (al cargar y al cambiar el `#`).
    function irALaFicha() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
    }
    irALaFicha();
    window.addEventListener("hashchange", irALaFicha);
    return () => window.removeEventListener("hashchange", irALaFicha);
  }, []);

  async function preparar() {
    setTrabajando("preparar");
    const r = await llamarQa<QaDatos>("datos", { method: "POST" });
    setTrabajando(null);
    if (!r.ok) {
      toast.error(r.error);
      router.refresh();
      return;
    }
    setDatos(r.data);
    // Al volver a preparar no llegan contraseñas: se conservan las que ya estuvieran a la vista.
    if (r.data.contrasenas) {
      setContrasenas(r.data.contrasenas);
      toast.success("Tus datos de prueba están listos.");
    } else {
      toast.success("Tus datos de prueba están al día.");
    }
  }

  async function actualizar() {
    const ok = await confirmar({
      title: "¿Actualizar tus datos de prueba?",
      description:
        "Se agrega lo nuevo (agentes y chat web) sin borrar lo que ya creaste. Tus contraseñas siguen igual y no se vuelven a mostrar.",
      confirmLabel: "Actualizar mis datos",
      destructive: false,
    });
    if (ok) await preparar();
  }

  async function contrasenasNuevas() {
    const ok = await confirmar({
      title: "¿Generar contraseñas nuevas?",
      description:
        "Las contraseñas actuales de tu dueño, gestor y colaborador de prueba dejan de servir y se cierran sus sesiones del panel.",
      confirmLabel: "Generar contraseñas nuevas",
    });
    if (!ok) return;
    setTrabajando("contrasenas");
    const r = await llamarQa<QaDatos>("datos/contrasenas", { method: "POST" });
    setTrabajando(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setDatos(r.data);
    setContrasenas(r.data.contrasenas ?? null);
    toast.success("Contraseñas nuevas generadas.");
  }

  async function irAMiNegocio(tenantId: string) {
    setTrabajando("negocio");
    try {
      await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      router.refresh();
      toast.success("Ahora estás en tu negocio de prueba.");
    } catch {
      toast.error("No se pudo cambiar de negocio. Elígelo en el selector de arriba.");
    } finally {
      setTrabajando(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Tu negocio de prueba</CardTitle>
          <CardDescription>
            Un negocio propio con Comercio, Agenda y Cobranza y tres cuentas: dueño, gestor y colaborador. Las pruebas
            que dicen «tu dueño de prueba» o «tu negocio de prueba» usan estos datos, y nadie más los toca.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {!inicial.disponible ? (
            <p className="rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm text-headline" role="status">
              Los datos de prueba solo existen en el entorno de test. Aquí puedes leer la guía de datos.
            </p>
          ) : (
            <EstadoDeMisDatos
              datos={datos}
              contrasenas={contrasenas}
              trabajando={trabajando}
              onPreparar={preparar}
              onActualizarDatos={actualizar}
              onContrasenas={contrasenasNuevas}
              onIrAMiNegocio={irAMiNegocio}
              onActualizar={() => router.refresh()}
            />
          )}
          <Contenido contenido={datos?.contenido ?? inicial.contenido} />
        </CardContent>
      </Card>

      <GuiaDeDatos guia={guia} />
    </div>
  );
}

function EstadoDeMisDatos({
  datos,
  contrasenas,
  trabajando,
  onPreparar,
  onActualizarDatos,
  onContrasenas,
  onIrAMiNegocio,
  onActualizar,
}: {
  datos: QaDatos | null;
  contrasenas: Record<string, string> | null;
  trabajando: string | null;
  onPreparar: () => void;
  onActualizarDatos: () => void;
  onContrasenas: () => void;
  onIrAMiNegocio: (tenantId: string) => void;
  onActualizar: () => void;
}) {
  const botonPreparar = (texto: string) => (
    <Button variant="accent" className="self-start" loading={trabajando === "preparar"} onClick={onPreparar}>
      <Sparkles aria-hidden className="h-4 w-4" />
      {trabajando === "preparar" ? "Preparando tus datos…" : texto}
    </Button>
  );

  if (!datos) {
    return (
      <div className="flex flex-col gap-3">
        <p className="max-w-prose text-sm text-body">
          Todavía no tienes datos de prueba. Al prepararlos verás las contraseñas de tus tres cuentas{" "}
          <strong className="font-semibold text-headline">una sola vez</strong>: tenlas a mano para copiarlas.
        </p>
        {botonPreparar("Preparar mis datos")}
      </div>
    );
  }
  if (datos.estado === "creando") {
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="text-sm text-body">Tus datos de prueba se están preparando. Tarda unos segundos.</p>
        <Button variant="outline" className="self-start" onClick={onActualizar}>
          <RefreshCw aria-hidden className="h-4 w-4" /> Actualizar
        </Button>
      </div>
    );
  }
  if (datos.estado === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-md border border-status-danger-border bg-status-danger-bg p-3 text-sm text-headline" role="alert">
          No se terminaron de preparar tus datos: {datos.error ?? "vuelve a intentarlo."}
        </p>
        {botonPreparar("Reintentar")}
      </div>
    );
  }
  if (datos.estado === "purgado") {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-md border border-status-info-border bg-status-info-bg p-3 text-sm text-headline" role="status">
          Tu negocio de prueba fue eliminado. Prepáralo de nuevo: se crea otra vez con tus mismas cuentas.
        </p>
        {botonPreparar("Preparar de nuevo")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sh-label text-headline">{datos.negocio.nombre ?? datos.negocio.slug}</span>
          <span className="font-mono text-xs text-text-soft">{datos.negocio.slug}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" loading={trabajando === "negocio"} onClick={() => onIrAMiNegocio(datos.negocio.id)}>
            <ArrowRightLeft aria-hidden className="h-4 w-4" /> Ir a mi negocio de prueba
          </Button>
          <Button variant="outline" loading={trabajando === "contrasenas"} onClick={onContrasenas}>
            <KeyRound aria-hidden className="h-4 w-4" /> Contraseñas nuevas
          </Button>
          <Button variant="outline" loading={trabajando === "preparar"} onClick={onActualizarDatos}>
            <RefreshCw aria-hidden className="h-4 w-4" />
            {trabajando === "preparar" ? "Actualizando…" : "Actualizar mis datos"}
          </Button>
        </div>
      </div>
      {contrasenas && (
        <p className="rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm text-headline" role="status">
          Copia las contraseñas ahora: no se vuelven a mostrar. Si las pierdes, pide contraseñas nuevas.
        </p>
      )}
      <TablaDeCuentas cuentas={datos.cuentas} contrasenas={contrasenas} />
      <p className="text-xs text-text-soft">
        Las cuentas usan el dominio pruebas.solvershub.test y no reciben correo. Para las pruebas de correo, crea un
        colaborador con tu correo con alias.
      </p>
      {datos.agent_os && (
        <AgentOs agentOs={datos.agent_os} reintentando={trabajando === "preparar"} onReintentar={onPreparar} />
      )}
    </div>
  );
}

/** Agent OS del negocio de prueba (HU-QA-09): chat web para conversar como cliente y sus agentes. */
function AgentOs({
  agentOs,
  reintentando,
  onReintentar,
}: {
  agentOs: QaDatosAgentOS;
  reintentando: boolean;
  onReintentar: () => void;
}) {
  const chat = agentOs.chat_web;
  const enlace = chat?.enlace;
  const agentes = agentOs.agentes ?? [];
  return (
    <section aria-labelledby="datos-agent-os" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="datos-agent-os" className="text-sh-label text-headline">
          Agent OS
        </h3>
        {agentOs.estado === "listo" ? (
          <Badge variant="success">Listo</Badge>
        ) : agentOs.estado === "pendiente" ? (
          <Badge variant="warning">Pendiente</Badge>
        ) : (
          <Badge variant="danger">Con error</Badge>
        )}
      </div>
      {agentOs.estado !== "listo" && (
        <div
          className={
            agentOs.estado === "error"
              ? "flex flex-col gap-3 rounded-md border border-status-danger-border bg-status-danger-bg p-3"
              : "flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-3"
          }
          role={agentOs.estado === "error" ? "alert" : "status"}
        >
          <p className="text-sm text-headline">
            {agentOs.estado === "error" ? "El Agent OS no quedó listo" : "El Agent OS todavía no está listo"}
            {agentOs.motivo ? `: ${agentOs.motivo}` : "."}
          </p>
          <Button variant="outline" className="self-start" loading={reintentando} onClick={onReintentar}>
            <RefreshCw aria-hidden className="h-4 w-4" /> {reintentando ? "Reintentando…" : "Reintentar"}
          </Button>
        </div>
      )}
      {chat && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-soft">Chat web (conversa como cliente)</span>
          {enlace ? (
            <div className="flex items-center gap-1">
              <a
                href={enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1 break-all font-mono text-xs text-link underline-offset-2 hover:underline"
              >
                {enlace}
                <ExternalLink aria-hidden className="h-3.5 w-3.5 shrink-0" />
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </a>
              <Button size="icon" variant="ghost" aria-label="Copiar el enlace del chat web" onClick={() => copiar(enlace, "Enlace")}>
                <Copy aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span className="font-mono text-xs text-headline">Clave {chat.clave}</span>
          )}
          {!chat.activo && <span className="text-xs text-text-soft">El chat web está desactivado.</span>}
        </div>
      )}
      {agentes.length > 0 && (
        <ul aria-label="Agentes del chat web" className="flex flex-col gap-1.5 text-sm">
          {agentes.map((a) => (
            <li key={a.key} className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-headline">{a.nombre}</span>
              <span className="text-xs text-text-soft">{a.rol}</span>
              {a.por_defecto && <Badge variant="accent">Por defecto</Badge>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TablaDeCuentas({ cuentas, contrasenas }: { cuentas: QaDatosCuenta[]; contrasenas: Record<string, string> | null }) {
  // Tarjetas y no tabla: en el celular el correo y la contraseña quedan a la vista sin scroll lateral.
  return (
    <ul aria-label="Cuentas de prueba" className="grid gap-3 md:grid-cols-3">
      {cuentas.map((c) => {
        const clave = contrasenas?.[c.rol];
        return (
          <li key={c.rol}>
            <section aria-label={c.titulo} className="flex h-full flex-col gap-3 rounded-md border border-border bg-surface-2 p-3">
              <div className="flex flex-col gap-0.5">
                <h4 className="font-medium text-headline">{c.titulo}</h4>
                <p className="text-xs text-body">{c.uso}</p>
              </div>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-text-soft">Correo</dt>
                  <dd className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 break-all font-mono text-xs text-headline">{c.email}</span>
                    <Button size="icon" variant="ghost" aria-label={`Copiar el correo de ${c.titulo}`} onClick={() => copiar(c.email, "Correo")}>
                      <Copy aria-hidden className="h-4 w-4" />
                    </Button>
                  </dd>
                </div>
                {contrasenas && (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs text-text-soft">Contraseña</dt>
                    <dd className="flex items-center gap-1">
                      {clave ? (
                        <>
                          <code className="min-w-0 flex-1 break-all rounded-sm bg-surface px-1.5 py-0.5 font-mono text-xs text-headline">
                            {clave}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Copiar la contraseña de ${c.titulo}`}
                            onClick={() => copiar(clave, "Contraseña")}
                          >
                            <Copy aria-hidden className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-text-soft">Sin cambio</span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          </li>
        );
      })}
    </ul>
  );
}

function Contenido({ contenido }: { contenido: QaMisDatos["contenido"] }) {
  if (contenido.length === 0) return null;
  return (
    <section aria-labelledby="datos-contenido" className="flex flex-col gap-3">
      <h3 id="datos-contenido" className="text-sh-label text-headline">
        Qué trae tu negocio de prueba
      </h3>
      <div className="grid gap-4 md:grid-cols-3">
        {contenido.map((c) => (
          <div key={c.habilidad} className="flex flex-col gap-1.5">
            <Badge className="self-start">{c.habilidad}</Badge>
            <ul className="list-disc space-y-0.5 pl-4 text-sm text-body">
              {c.detalle.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function GuiaDeDatos({ guia }: { guia: QaItem[] }) {
  if (guia.length === 0) return null;
  const grupos = new Map<string, QaItem[]>();
  for (const item of guia) grupos.set(item.grupo, [...(grupos.get(item.grupo) ?? []), item]);
  return (
    <section aria-labelledby="guia-de-datos" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="guia-de-datos" className="font-display text-sh-block text-headline">
          Guía de datos
        </h2>
        <p className="max-w-prose text-sm text-body">
          Lo que no se prepara con un botón: qué es cada dato, para qué sirve y cómo conseguirlo. Cada prueba enlaza aquí
          los datos que necesita.
        </p>
      </div>
      {[...grupos.entries()].map(([grupo, items]) => (
        <div key={grupo} className="flex flex-col gap-3">
          <h3 className="text-sh-label text-text-soft">{grupo}</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.slug}
                id={item.slug}
                className="flex scroll-mt-24 flex-col gap-2 rounded-lg border border-border bg-surface p-4 target:border-focus target:ring-2 target:ring-focus/30"
              >
                <h4 className="font-medium text-headline">{item.titulo}</h4>
                {item.resumen && <p className="text-sm text-body">{item.resumen}</p>}
                <dl className="flex flex-col gap-2 text-sm">
                  {item.porque && (
                    <div>
                      <dt className="text-xs font-medium text-text-soft">Para qué sirve</dt>
                      <dd className="text-body">{item.porque}</dd>
                    </div>
                  )}
                  {item.como && (
                    <div>
                      <dt className="text-xs font-medium text-text-soft">Cómo conseguirlo</dt>
                      <dd className="text-body">{item.como}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
