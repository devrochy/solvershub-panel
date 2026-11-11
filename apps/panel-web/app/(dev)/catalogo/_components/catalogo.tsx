"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Bell, Globe, MoreHorizontal, Pencil, Plus, Store, Trash2 } from "lucide-react";

import { BarChart, LineChart, ProgressRing, Sparkline, resumenSerie, type ChartDatum, type ChartSeries } from "@/components/dataviz";
import { FilaNotificacion } from "@/components/notificaciones/fila-notificacion";
import { AvisoDeOnboarding } from "@/components/domain/aviso-de-onboarding";
import { AvisoDeRequisitos } from "@/components/domain/aviso-de-requisitos";
import { CargandoLista } from "@/components/domain/cargando-lista";
import { ChannelBadge, ChannelIcon } from "@/components/domain/channel-icon";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { CONVERSATION_STATUS, PAYMENT_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { TarjetaDelAgente } from "@/app/(onboarding)/bienvenida/_components/tarjeta-del-agente";
import { SelectorDeHorario } from "@/app/(onboarding)/bienvenida/_components/selector-de-horario";
import { TarjetaElegible } from "@/app/(onboarding)/bienvenida/_components/elegibles";
import { Marca } from "@/components/ui/marca";
import { ESTADO_INICIAL, HORARIO_INICIAL, type HorarioElegido } from "@/lib/onboarding";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { CampoTelefono } from "@/components/ui/campo-telefono";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmProvider, useConfirm } from "@/components/ui/confirm";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dropzone } from "@/components/ui/dropzone";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificacionItem } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { InputNumero } from "@/components/ui/input-numero";
import { InputPassword } from "@/components/ui/input-password";
import { Kbd } from "@/components/ui/kbd";
import { KpiTile } from "@/components/ui/kpi-tile";
import { ListaDeFrases } from "@/components/ui/lista-de-frases";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup } from "@/components/ui/radio-group";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { SelectConIcono } from "@/components/ui/select-con-icono";
import { Contador } from "@/components/ui/contador";
import { EstadoDeError } from "@/components/ui/estado-de-error";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TabLinks } from "@/components/ui/tab-links";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Stepper } from "@/components/ui/stepper";
import type { Requirement } from "@/lib/api/types";
import { textoDeAvance } from "@/lib/agente-asistente";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

type Fila = { id: string; cliente: string; estado: "al_dia" | "mora"; saldo: string };

const FILAS: Fila[] = [
  { id: "1", cliente: "Ana Prueba", estado: "al_dia", saldo: "$ 120.000" },
  { id: "2", cliente: "Luis Prueba", estado: "mora", saldo: "$ 480.500" },
  { id: "3", cliente: "Marta Prueba", estado: "al_dia", saldo: "$ 75.000" },
];

const REQUISITOS_EJEMPLO = [
  { skill: "pack_commerce", kind: "sin_contenido", content: "catalogo", title: "Catálogo", explanation: "" },
] as unknown as Requirement[];

const COLUMNAS: Column<Fila>[] = [
  { key: "cliente", header: "Cliente", cell: (f) => f.cliente },
  {
    key: "estado",
    header: "Estado",
    cell: (f) =>
      f.estado === "mora" ? <Badge variant="danger">En mora</Badge> : <Badge variant="success">Al día</Badge>,
  },
  { key: "saldo", header: "Saldo", cell: (f) => f.saldo, align: "right", info: "Saldo pendiente con intereses." },
];

// Datos de prueba de los gráficos (HU-DS-06): 14 días de conversaciones por canal.
const CANALES: ChartSeries[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "web", label: "Chat web" },
  { key: "instagram", label: "Instagram" },
];
const BASE = [
  [118, 42, 20], [132, 47, 18], [127, 51, 25], [141, 49, 27], [156, 58, 24], [98, 33, 15], [84, 29, 12],
  [137, 52, 28], [149, 55, 31], [162, 61, 29], [158, 64, 34], [171, 66, 33], [112, 40, 21], [95, 35, 17],
];
const CONVERSACIONES: ChartDatum[] = BASE.map(([whatsapp, web, instagram], i) => ({
  x: new Date(Date.UTC(2026, 8, 28 + i)).toISOString().slice(0, 10),
  values: { whatsapp, web, instagram },
}));
const TOTAL: ChartDatum[] = CONVERSACIONES.map((d) => ({
  x: d.x,
  values: { total: (d.values.whatsapp ?? 0) + (d.values.web ?? 0) + (d.values.instagram ?? 0) },
}));
const RECAUDO: ChartDatum[] = [
  { x: "Lun", values: { recaudo: 1_850_000, meta: 2_000_000 } },
  { x: "Mar", values: { recaudo: 2_240_000, meta: 2_000_000 } },
  { x: "Mié", values: { recaudo: 1_420_000, meta: 2_000_000 } },
  { x: "Jue", values: { recaudo: 2_610_000, meta: 2_500_000 } },
  { x: "Vie", values: { recaudo: 3_080_000, meta: 2_500_000 } },
];
const SPARK = TOTAL.slice(-7).map((d) => d.values.total ?? null);

/** El tema que se ve en el celular, donde no caben los dos lado a lado. */
const TemaEnCelular = createContext<"sh-light" | "sh-dark">("sh-dark");

/**
 * Una pieza del catálogo: cuándo usarla, cuándo no, de dónde sale, y su vista en claro y oscuro
 * lado a lado (en el celular, el tema elegido arriba).
 */
function Seccion({
  id,
  titulo,
  cuando,
  no,
  piezas,
  children,
}: {
  id: string;
  titulo: string;
  cuando: string;
  no?: string;
  piezas: string;
  children: ReactNode;
}) {
  const temaCelular = useContext(TemaEnCelular);
  return (
    <section id={id} aria-labelledby={`sec-${id}`} className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id={`sec-${id}`} className="font-display text-sh-block text-headline">
          {titulo}
        </h3>
        <p className="max-w-3xl text-sm text-body">
          <span className="font-medium text-headline">Úsalo cuando</span> {cuando}
        </p>
        {no && <p className="max-w-3xl text-sm text-text-soft">No lo uses para {no}</p>}
        <p className="font-mono text-sh-caption text-text-soft">{piezas}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["sh-light", "sh-dark"] as const).map((tema) => (
          <div
            key={tema}
            data-theme={tema}
            className={cn(
              "flex min-w-0 flex-col gap-4 rounded-lg border border-border-soft bg-bg p-5 text-headline",
              tema !== temaCelular && "hidden lg:flex",
            )}
          >
            <p className="text-xs text-text-soft">{tema === "sh-light" ? "Claro" : "Oscuro"}</p>
            {children}
          </div>
        ))}
      </div>
    </section>
  );
}

type Grupo = { id: string; titulo: string; piezas: { id: string; titulo: string }[] };

/** El índice: las piezas agrupadas por lo que hace quien usa el panel. */
const GRUPOS: Grupo[] = [
  {
    id: "mostrar",
    titulo: "Mostrar",
    piezas: [
      { id: "tabla", titulo: "Tabla" },
      { id: "cifras", titulo: "Cifras" },
      { id: "graficos", titulo: "Gráficos" },
      { id: "etiquetas", titulo: "Etiquetas y contadores" },
      { id: "canales", titulo: "Canales" },
      { id: "avatares", titulo: "Avatares y atajos" },
    ],
  },
  {
    id: "pedir",
    titulo: "Pedir y actuar",
    piezas: [
      { id: "botones", titulo: "Botones" },
      { id: "formularios", titulo: "Campos" },
      { id: "selectores", titulo: "Selectores e interruptores" },
      { id: "numeros", titulo: "Número, teléfono y contraseña" },
      { id: "frases", titulo: "Frases" },
      { id: "avance", titulo: "Avance, pasos y archivos" },
    ],
  },
  {
    id: "avisar",
    titulo: "Avisar",
    piezas: [
      { id: "errores", titulo: "Errores" },
      { id: "vacios", titulo: "Vacíos y carga" },
      { id: "confirmar", titulo: "Confirmar y avisos" },
      { id: "notificaciones", titulo: "Notificaciones" },
    ],
  },
  {
    id: "navegar",
    titulo: "Navegar",
    piezas: [
      { id: "cabecera", titulo: "Cabecera de página" },
      { id: "vistas", titulo: "Elegir una vista" },
      { id: "menu-de-fila", titulo: "Menú de fila" },
      { id: "paginacion", titulo: "Paginación" },
      { id: "capas", titulo: "Menús, paneles y diálogos" },
    ],
  },
  {
    id: "marca",
    titulo: "Marca y recorridos",
    piezas: [
      { id: "primer-uso", titulo: "Asistente de primer uso" },
      { id: "creacion-de-agentes", titulo: "Asistente de creación de agentes" },
    ],
  },
];

/** Título de un grupo del índice. */
function TituloDeGrupo({ grupo }: { grupo: Grupo }) {
  return (
    <h2 id={grupo.id} className="scroll-mt-6 border-b border-border-soft pb-2 font-display text-sh-h1 text-headline">
      {grupo.titulo}
    </h2>
  );
}

/** Demostración de la confirmación: necesita su propio proveedor para vivir en el catálogo. */
function DemoConfirmar() {
  const confirmar = useConfirm();
  const [resultado, setResultado] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            const ok = await confirmar({
              title: "¿Eliminar este cliente?",
              description: "Se borra su historial y no se puede deshacer.",
              confirmLabel: "Eliminar cliente",
              destructive: true,
            });
            setResultado(ok ? "Cliente eliminado." : null);
          }}
        >
          Eliminar cliente
        </Button>
        <Button variant="outline" onClick={() => toast.success("Cambios guardados.")}>
          Aviso de éxito
        </Button>
        <Button variant="outline" onClick={() => toast.error("No se pudo guardar. Inténtalo de nuevo.")}>
          Aviso de error
        </Button>
      </div>
      <FormFeedback success={resultado} />
    </div>
  );
}

/** Tarjeta de demostración: título, período y el gráfico (el `ChartCard` real es de HU-DS-07). */
function TarjetaDeGrafico({ titulo, periodo, children }: { titulo: string; periodo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface p-5">
      <div>
        <h3 className="font-display text-sh-block text-headline">{titulo}</h3>
        <p className="text-sh-caption text-text-soft">{periodo}</p>
      </div>
      {children}
    </div>
  );
}

const AHORA_DE_MUESTRA = new Date("2026-10-25T15:00:00Z");
const NOTIFICACIONES_DE_MUESTRA: NotificacionItem[] = [
  { id: "n1", event_key: "core.escalation", category: "conversaciones", severity: "critical", title: "Nueva escalación", body: "Un cliente pidió atención humana y la conversación quedó escalada.", target: { entity: "conversacion", id: "c1", section: "escalations" }, data: {}, created_at: "2026-10-25T14:55:00Z", read: false },
  { id: "n2", event_key: "commerce.pedido_nuevo", category: "ventas", severity: "success", title: "Pedido nuevo", body: "El asistente tomó el pedido P-1042.", target: { entity: "pedido", id: "p1", section: "pack_commerce" }, data: {}, created_at: "2026-10-25T13:00:00Z", read: false },
  { id: "n3", event_key: "subs.pago_sin_aplicar", category: "cobros", severity: "warning", title: "Pago sin aplicar", body: "Llegó un pago que no se pudo asociar a una suscripción.", target: { entity: "cobro", id: "k1", section: "pack_subscriptions" }, data: {}, created_at: "2026-10-24T20:00:00Z", read: true },
  { id: "n4", event_key: "calendar.cita_nueva", category: "agenda", severity: "info", title: "Cita nueva", body: "Se agendó una cita para mañana a las 9:00.", target: { entity: "cita", id: "a1", section: "pack_calendar" }, data: {}, created_at: "2026-10-23T12:00:00Z", read: true },
  { id: "n5", event_key: "core.connection_token_expiring", category: "sistema", severity: "warning", title: "El acceso de tu conexión vence pronto", body: "Reconéctala en Conexiones antes de esa fecha.", target: { entity: "conexion", id: "x1", section: "connections" }, data: {}, created_at: "2026-10-20T12:00:00Z", read: true },
];

export function Catalogo() {
  const [casilla, setCasilla] = useState<boolean | "indeterminate">("indeterminate");
  const [plan, setPlan] = useState("basico");
  const [segmento, setSegmento] = useState("");
  const [vende, setVende] = useState("productos");
  const [horario, setHorario] = useState<HorarioElegido | null>(HORARIO_INICIAL);
  const [tipoNegocio, setTipoNegocio] = useState("ventas");
  const [busqueda, setBusqueda] = useState("");
  const [pestana, setPestana] = useState("identidad");
  const [canales, setCanales] = useState<string[]>(CANALES.map((c) => c.key));
  const [canal, setCanal] = useState("tienda");
  const [aviso, setAviso] = useState(true);
  const [cupo, setCupo] = useState(500);
  const [indicativo, setIndicativo] = useState("+57");
  const [telefono, setTelefono] = useState("300 123 4567");
  const [frasesDemo, setFrasesDemo] = useState(["quiero hablar con alguien", "precio del plan"]);
  const [temaCelular, setTemaCelular] = useState<"sh-light" | "sh-dark">("sh-dark");

  return (
    <TemaEnCelular.Provider value={temaCelular}>
      <div className="mx-auto flex w-full max-w-[1440px] gap-10 px-4 py-8 md:px-6">
        <nav aria-label="Piezas del kit" className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] w-56 shrink-0 self-start overflow-y-auto lg:block">
          {GRUPOS.map((g) => (
            <div key={g.id} className="mb-4">
              <a href={`#${g.id}`} className="block px-3 pb-1 text-xs font-medium uppercase tracking-[0.06em] text-text-soft hover:text-headline">
                {g.titulo}
              </a>
              <ul>
                {g.piezas.map((pz) => (
                  <li key={pz.id}>
                    <a href={`#${pz.id}`} className="block rounded-md px-3 py-1.5 text-sm text-body hover:bg-hover hover:text-headline">
                      {pz.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <main className="flex min-w-0 flex-1 flex-col gap-10">
          <header className="flex flex-col gap-2">
            <Breadcrumbs items={[{ label: "Desarrollo" }, { label: "Catálogo de componentes" }]} />
            <h1 className="font-display text-sh-h1 text-headline">Catálogo de componentes</h1>
            <p className="max-w-2xl text-sm text-body">
              El kit del panel ordenado por lo que haces con cada pieza, con cuándo usarla y su vista en claro y oscuro.
              Solo existe con PANEL_CATALOGO=1. Reglas en DESIGN.md.
            </p>
            <div className="mt-2 flex flex-col gap-3 lg:hidden">
              <Field label="Ir a" htmlFor="cat-ir-a">
                <Select
                  id="cat-ir-a"
                  defaultValue=""
                  onChange={(e) => document.getElementById(e.target.value)?.scrollIntoView({ block: "start" })}
                >
                  <option value="" disabled>
                    Elige una pieza
                  </option>
                  {GRUPOS.map((g) => (
                    <optgroup key={g.id} label={g.titulo}>
                      {g.piezas.map((pz) => (
                        <option key={pz.id} value={pz.id}>
                          {pz.titulo}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              <SegmentedControl
                label="Tema de las vistas"
                value={temaCelular}
                onChange={(v) => setTemaCelular(v as "sh-light" | "sh-dark")}
                options={[
                  { value: "sh-dark", label: "Oscuro" },
                  { value: "sh-light", label: "Claro" },
                ]}
              />
            </div>
          </header>

          <TituloDeGrupo grupo={GRUPOS[0]} />
          <Seccion
            id="tabla"
            titulo="Tabla"
            cuando="comparas filas del mismo tipo. En el celular cada fila pasa a una tarjeta y nada se parte."
            no="una sola cosa con sus datos: eso es una ficha."
            piezas="TablaResponsiva · DataTable"
          >
            <TablaResponsiva
              etiqueta="Clientes de prueba"
              columns={COLUMNAS}
              rows={FILAS}
              getRowKey={(f) => f.id}
              getRowHref={() => "#"}
              getRowLabel={(f) => `Abrir la ficha de ${f.cliente}`}
              caption="Clientes de prueba"
              filaCelular={(f) => ({
                titulo: f.cliente,
                detalle: f.estado === "mora" ? <Badge variant="danger">En mora</Badge> : <Badge variant="success">Al día</Badge>,
                fin: f.saldo,
                href: "#",
              })}
            />
            <DataTable columns={COLUMNAS} rows={[]} getRowKey={(f) => f.id} loading loadingRows={2} />
            <DataTable
              columns={COLUMNAS}
              rows={[]}
              getRowKey={(f) => f.id}
              emptyTitle="Todavía no hay clientes"
              emptyDescription="Cuando registres el primero, aparece aquí."
              emptyAction={<Button size="sm">Registrar cliente</Button>}
            />
            <DataTable
              columns={COLUMNAS}
              rows={[]}
              getRowKey={(f) => f.id}
              error="El servidor no respondió. Revisa tu conexión e inténtalo de nuevo."
              errorAction={<Button size="sm" variant="outline">Reintentar</Button>}
            />
          </Seccion>
          <Seccion
            id="cifras"
            titulo="Cifras"
            cuando="una cifra resume cómo va algo; el delta dice contra qué compara. La «hero» es una por pantalla."
            no="listas de números: eso es una tabla."
            piezas="KpiTile"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiTile label="Conversaciones (7 días)" value="1.284" delta={{ value: 12, versus: "los 7 días anteriores" }} />
              <KpiTile
                label="Clientes en mora"
                value="8"
                delta={{ value: 14.5, versus: "la semana pasada" }}
                polarity="up-bad"
              />
              <KpiTile
                className="sm:col-span-2"
                size="hero"
                label="Conversaciones (7 días) · hero"
                value="1.284"
                delta={{ value: 12, versus: "los 7 días anteriores" }}
                sparkline={<Sparkline values={SPARK} height={56} area label={`Conversaciones: ${resumenSerie(SPARK)}`} />}
              />
              <KpiTile label="Recaudo de hoy" loading />
              <KpiTile label="Consumo del plan" error="No se pudo calcular el consumo." />
            </div>
          </Seccion>
          <Seccion
            id="graficos"
            titulo="Gráficos"
            cuando="importa la forma en el tiempo o la comparación, con «Ver tabla» para leer los datos."
            no="un solo valor: eso es una cifra."
            piezas="components/dataviz"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiTile
                label="Conversaciones (7 días)"
                value="1.284"
                delta={{ value: 12, versus: "los 7 días anteriores" }}
                sparkline={<Sparkline values={SPARK} />}
              />
              <KpiTile
                label="Escalaciones (7 días)"
                value="31"
                delta={{ value: -8, versus: "los 7 días anteriores" }}
                polarity="up-bad"
                sparkline={<Sparkline values={[9, 7, 8, 5, 4, 6, 3]} area />}
              />
            </div>
            {/* Filtro de la página, arriba de lo que afecta (nunca dentro de la tarjeta del gráfico). */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Canales visibles">
              {CANALES.map((c) => {
                const activo = canales.includes(c.key);
                return (
                  <Button
                    key={c.key}
                    size="sm"
                    variant="outline"
                    aria-pressed={activo}
                    className={activo ? "bg-hover" : "text-text-soft"}
                    onClick={() =>
                      setCanales((v) => (activo ? (v.length > 1 ? v.filter((k) => k !== c.key) : v) : [...v, c.key]))
                    }
                  >
                    {c.label}
                  </Button>
                );
              })}
            </div>
            <TarjetaDeGrafico titulo="Conversaciones por canal" periodo="Últimos 14 días">
              <LineChart title="Conversaciones por canal" series={CANALES} data={CONVERSACIONES} visibleKeys={canales} />
            </TarjetaDeGrafico>
            <TarjetaDeGrafico titulo="Tendencia de atención" periodo="Últimos 14 días · una serie con área">
              <LineChart title="Conversaciones totales" series={[{ key: "total", label: "Conversaciones" }]} data={TOTAL} area height={200} />
            </TarjetaDeGrafico>
            <TarjetaDeGrafico titulo="Recaudo vs meta" periodo="Esta semana">
              <BarChart
                title="Recaudo vs meta por día"
                series={[
                  { key: "recaudo", label: "Recaudo" },
                  { key: "meta", label: "Meta" },
                ]}
                data={RECAUDO}
                yFormat="currency"
                xHeader="Día"
              />
            </TarjetaDeGrafico>
            <TarjetaDeGrafico titulo="Recaudo por día" periodo="Esta semana · una serie">
              <BarChart
                title="Recaudo por día"
                series={[{ key: "recaudo", label: "Recaudo" }]}
                data={RECAUDO}
                yFormat="currency"
                xHeader="Día"
                height={200}
              />
            </TarjetaDeGrafico>
            <div className="flex flex-wrap items-start gap-6 rounded-lg border border-border-soft bg-surface p-5">
              <ProgressRing label="Conversaciones del plan" value={900} max={2000} caption="900 de 2.000" />
              <ProgressRing label="Mensajes de plantilla" value={1700} max={2000} caption="1.700 de 2.000 · aviso" />
              <ProgressRing label="Colaboradores" value={7} max={6} caption="7 de 6 · excedido" />
              <ProgressRing label="Consumo del mes" value={62} size={96} caption="Tamaño grande" />
              <div className="flex min-w-40 flex-1 flex-col gap-1">
                <p className="text-sh-caption text-body">Sparkline sola (se anuncia con su resumen)</p>
                <Sparkline values={SPARK} label={`Conversaciones de la semana: ${resumenSerie(SPARK)}`} height={40} />
              </div>
            </div>
          </Seccion>
          <Seccion
            id="etiquetas"
            titulo="Etiquetas y contadores"
            cuando="dices en qué estado está algo, con ícono y palabra; el contador dice cuántos esperan."
            no="acciones: una etiqueta no se pulsa."
            piezas="Badge · StatusBadge · Contador"
          >
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge variant="accent">Nuevo</Badge>
              <Badge variant="info">Programado</Badge>
              <Badge variant="success">Al día</Badge>
              <Badge variant="warning">Por vencer</Badge>
              <Badge variant="danger">En mora</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value="escalated" map={CONVERSATION_STATUS} />
              <StatusBadge value="approved" map={PAYMENT_STATUS} />
              <StatusBadge value="declined" map={PAYMENT_STATUS} />
            </div>
            <div className="flex items-center gap-4">
              <Contador valor={2} etiqueta="2 mensajes sin leer" />
              <Contador valor={120} etiqueta="Más de 99 mensajes sin leer" />
              <Contador valor={1} tamano="sm" etiqueta="1 nota" />
              <Contador valor={3} tono="alerta" etiqueta="3 avisos" />
            </div>
          </Seccion>
          <Seccion
            id="canales"
            titulo="Canales"
            cuando="dices por dónde llega o sale una conversación: logo oficial, enmarcado y en el tono de la marca."
            piezas="ChannelIcon · ChannelBadge"
          >
            <div className="flex flex-wrap items-center gap-3">
              <ChannelIcon id="whatsapp" size="lg" />
              <ChannelIcon id="instagram" size="lg" />
              <ChannelIcon id="messenger" size="lg" />
              <ChannelIcon id="webchat" size="lg" />
              <ChannelIcon id="whatsapp" size="sm" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ChannelBadge id="whatsapp" />
              <ChannelBadge id="instagram" />
              <ChannelBadge id="webchat" label="Chat web" />
            </div>
          </Seccion>
          <Seccion
            id="avatares"
            titulo="Avatares y atajos"
            cuando="muestras quién es (persona o negocio) o un atajo de teclado."
            piezas="Avatar · Kbd"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name="Ana Prueba" size="xs" />
              <Avatar name="Luis Prueba" size="sm" status="online" />
              <Avatar name="Marta" size="md" status="offline" />
              <Avatar name="Negocio de prueba" size="lg" />
              <Kbd keys={["Ctrl", "K"]} />
              <Kbd keys={["/"]} />
            </div>
          </Seccion>
          <TituloDeGrupo grupo={GRUPOS[1]} />
          <Seccion
            id="botones"
            titulo="Botones"
            cuando="alguien hace algo. El botón dice lo que pasa y el principal (accent) va uno por pantalla."
            no="ir a otra página: eso es un enlace."
            piezas="Button"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="accent">
                <Plus className="h-4 w-4" aria-hidden />
                Crear cartera
              </Button>
              <Button>Guardar</Button>
              <Button variant="outline">Cancelar</Button>
              <Button variant="ghost">Ver detalle</Button>
              <Button variant="danger">Eliminar</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Pequeño</Button>
              <Button size="lg">Grande</Button>
              <Button loading>Guardando</Button>
              <Button disabled>Deshabilitado</Button>
              <Button variant="outline" size="icon" aria-label="Notificaciones">
                <Bell className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </Seccion>
          <Seccion
            id="formularios"
            titulo="Campos"
            cuando="pides un dato escrito: etiqueta, ayuda y error van unidos al control."
            no="mostrar un dato que no se cambia: escríbelo como texto."
            piezas="Field · Input · SearchInput · Checkbox · RadioGroup"
          >
            <Field label="Nombre del negocio" htmlFor="cat-nombre" help="Así te ven tus clientes." required>
              <Input id="cat-nombre" defaultValue="Tienda de prueba" />
            </Field>
            <Field label="Correo" htmlFor="cat-correo" error="Escribe un correo válido, por ejemplo ana@correo.com.">
              <Input id="cat-correo" defaultValue="ana@" aria-invalid />
            </Field>
            <Field label="Deshabilitado" htmlFor="cat-off">
              <Input id="cat-off" disabled defaultValue="No se puede editar" />
            </Field>
            <SearchInput label="Buscar clientes" value={busqueda} onChange={setBusqueda} placeholder="Buscar" shortcut="/" />
            <Checkbox id="cat-casilla" label="Seleccionar todos" checked={casilla} onCheckedChange={setCasilla} />
            <Checkbox id="cat-casilla-off" label="Opción deshabilitada" checked={false} disabled />
            <RadioGroup
              label="Plan"
              name="cat-plan"
              value={plan}
              onValueChange={setPlan}
              options={[
                { value: "free", label: "Free", description: "Para probar." },
                { value: "basico", label: "Básico", description: "Hasta 500 conversaciones al mes." },
              ]}
            />
          </Seccion>
          <Seccion
            id="selectores"
            titulo="Selectores e interruptores"
            cuando="se elige entre opciones conocidas; el interruptor prende o apaga algo que aplica de inmediato."
            no="2 a 5 filtros de una lista: eso es un control segmentado."
            piezas="Select · SelectConIcono · Switch"
          >
            <Field label="Tipo de documento" htmlFor="cat-doc">
              <Select id="cat-doc" defaultValue="cc">
                <option value="cc">Cédula de ciudadanía</option>
                <option value="nit">NIT</option>
                <option value="ce">Cédula de extranjería</option>
              </Select>
            </Field>
            <SelectConIcono
              label="Dónde atiende"
              value={canal}
              onChange={setCanal}
              options={[
                { value: "tienda", label: "En la tienda", icono: <Store className="h-4 w-4" aria-hidden />, descripcion: "El cliente va al local." },
                { value: "web", label: "En línea", icono: <Globe className="h-4 w-4" aria-hidden />, descripcion: "Por chat o videollamada." },
              ]}
            />
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-body">Avisar al cliente un día antes</span>
              <Switch checked={aviso} onCheckedChange={setAviso} aria-label="Avisar al cliente un día antes" />
            </div>
          </Seccion>
          <Seccion
            id="numeros"
            titulo="Número, teléfono y contraseña"
            cuando="pides un número con límites, un teléfono con su país o una contraseña que se puede ver."
            no="dinero ya calculado: muéstralo con formatCop."
            piezas="InputNumero · CampoTelefono · InputPassword"
          >
            <Field label="Cupo de conversaciones" htmlFor="cat-cupo" help="De 0 a 5.000.">
              <InputNumero id="cat-cupo" value={cupo} onValueChange={setCupo} min={0} max={5000} step={100} />
            </Field>
            <CampoTelefono indicativo={indicativo} numero={telefono} onIndicativo={setIndicativo} onNumero={setTelefono} id="cat-telefono" />
            <Field label="Contraseña" htmlFor="cat-clave" help="Al menos 10 caracteres.">
              <InputPassword id="cat-clave" defaultValue="una-clave-larga" autoComplete="new-password" />
            </Field>
          </Seccion>
          <Seccion
            id="frases"
            titulo="Frases"
            cuando="pides varias frases cortas (palabras clave, frases que pasan a una persona)."
            no="un texto largo: eso es un área de texto."
            piezas="ListaDeFrases"
          >
            <ListaDeFrases
              id="cat-frases"
              frases={frasesDemo}
              onChange={setFrasesDemo}
              placeholder="Escribe una frase y pulsa Enter"
              agregarLabel="Agregar frase"
            />
          </Seccion>
          <Seccion
            id="avance"
            titulo="Avance, pasos y archivos"
            cuando="muestras cuánto falta, un recorrido por pasos o pides un archivo."
            piezas="Progress · Stepper · Dropzone"
          >
            <div className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface p-5">
              <Progress label="Avance simple" value={42} max={100} />
              <Progress
                label="Avance por estado"
                value={24}
                max={40}
                segments={[
                  { key: "ok", value: 18, label: "OK", tone: "success" },
                  { key: "falla", value: 3, label: "Falla", tone: "danger" },
                  { key: "bloqueada", value: 2, label: "Bloqueada", tone: "warning" },
                  { key: "en_curso", value: 1, label: "En curso", tone: "info" },
                ]}
              />
              <Progress size="sm" label="Barra fina" value={7} max={10} />
            </div>
            <div className="rounded-lg border border-border-soft bg-surface p-5">
              <Stepper
                label="Pasos de ejemplo"
                onSelect={() => {}}
                steps={[
                  { id: "1", title: "Pulsar Ctrl+K", description: "Esperado: se abre la paleta", state: "complete", stateLabel: "Aprobado" },
                  { id: "2", title: "Escribir «prom»", state: "current", content: <p className="text-sm text-body">Contenido del paso activo.</p> },
                  { id: "3", title: "Pulsar Enter", state: "upcoming" },
                  { id: "4", title: "Revisar el foco", state: "error", stateLabel: "Falla" },
                  { id: "5", title: "Paso omitido", state: "skipped", stateLabel: "Omitido" },
                ]}
              />
            </div>
            <Dropzone accept={["image/png", "image/jpeg"]} maxBytes={5 * 1024 * 1024} hint="PNG o JPG de hasta 5 MB." onFiles={() => {}} />
          </Seccion>
          <TituloDeGrupo grupo={GRUPOS[2]} />
          <Seccion
            id="errores"
            titulo="Errores"
            cuando="algo falló. Si no cargó una página o un bloque: ErrorDeCarga, con «Reintentar». Dentro de un formulario: FormFeedback, junto a lo que hay que corregir."
            no="una línea roja suelta: el color nunca va solo."
            piezas="ErrorDeCarga · EstadoDeError · FormFeedback"
          >
            <ErrorDeCarga titulo="No pudimos cargar las conversaciones" detalle="502 · upstream timeout" />
            <EstadoDeError
              forma="en-linea"
              titulo="No pudimos cargar las conversaciones"
              descripcion="Revisa tu conexión y vuelve a intentarlo."
              accion={<Button size="sm">Reintentar</Button>}
            />
            <FormFeedback error="Escribe un correo válido, por ejemplo ana@correo.com." />
            <FormFeedback success="Cambios guardados." />
          </Seccion>
          <Seccion
            id="vacios"
            titulo="Vacíos y carga"
            cuando="no hay nada todavía (invita a actuar) o los datos vienen en camino (la forma de lo que viene)."
            no="escribir «Cargando…»."
            piezas="EmptyState · Skeleton · CargandoLista"
          >
            <EmptyState
              title="Conecta WhatsApp para empezar"
              description="Cuando tu número esté conectado, aquí vas a ver las conversaciones."
              action={<Button size="sm">Conectar WhatsApp</Button>}
            />
            <Skeleton lines={3} />
            <CargandoLista que="los clientes" filas={3} />
          </Seccion>
          <Seccion
            id="confirmar"
            titulo="Confirmar y avisos"
            cuando="una acción no se puede deshacer (confirma y explica la consecuencia) o algo terminó (un aviso breve)."
            no="acciones que se deshacen: ahí basta el aviso."
            piezas="useConfirm · toast"
          >
            <ConfirmProvider>
              <DemoConfirmar />
            </ConfirmProvider>
          </Seccion>
          <Seccion
            id="notificaciones"
            titulo="Notificaciones"
            cuando="avisas de algo que pasó mientras no mirabas; lo urgente lleva etiqueta y lo no leído, punto."
            piezas="FilaNotificacion"
          >
            <ul className="flex max-w-md flex-col gap-0.5">
              {NOTIFICACIONES_DE_MUESTRA.map((n) => (
                <FilaNotificacion key={n.id} item={n} href="#" ahora={AHORA_DE_MUESTRA} onAbrir={() => undefined} onArchivar={() => undefined} />
              ))}
            </ul>
          </Seccion>
          <TituloDeGrupo grupo={GRUPOS[3]} />
          <Seccion
            id="cabecera"
            titulo="Cabecera de página"
            cuando="empieza una página: un solo h1, una frase de para qué sirve y la acción principal."
            no="títulos dentro de una tarjeta."
            piezas="PageHeader · Breadcrumbs"
          >
            <PageHeader
              title="Clientes"
              description="Quién te compra y cómo va su cuenta."
              breadcrumbs={[{ label: "Operación" }, { label: "Clientes" }]}
              actions={<Button variant="accent">Nuevo cliente</Button>}
            />
            <Breadcrumbs
              items={[{ label: "Ventas y cobros", href: "#" }, { label: "Cobranza", href: "#" }, { label: "Carteras" }]}
            />
          </Seccion>
          <Seccion
            id="vistas"
            titulo="Elegir una vista"
            cuando="cambias lo que se ve. Cada vista con su ruta: TabLinks. Filtrar o ver lo mismo de otra forma (2 a 5): SegmentedControl. Partes de un objeto sin ruta propia: Tabs."
            no="más de 5 filtros cortos combinables: eso es un selector."
            piezas="TabLinks · SegmentedControl · Tabs"
          >
            <TabLinks
              label="Secciones de la cartera"
              items={[
                { href: "#vistas", label: "Resumen" },
                { href: "#vistas-clientes", label: "Clientes", count: 12 },
                { href: "#vistas-pagos", label: "Pagos" },
              ]}
              current="#vistas"
            />
            <SegmentedControl
              label="Ejemplo: estado"
              value={segmento}
              onChange={setSegmento}
              options={[
                { value: "", label: "Todas" },
                { value: "open", label: "Abiertas" },
                { value: "escalated", label: "Escaladas" },
                { value: "closed", label: "Cerradas" },
              ]}
            />
            <Tabs
              items={[
                { id: "identidad", label: "Identidad" },
                { id: "cerebro", label: "Cerebro" },
                { id: "avanzado", label: "Avanzado" },
              ]}
              value={pestana}
              onValueChange={setPestana}
            />
          </Seccion>
          <Seccion
            id="menu-de-fila"
            titulo="Menú de fila"
            cuando="una fila tiene varias acciones: van con nombre, y la destructiva al final y confirmada."
            no="la acción principal de la página."
            piezas="MenuDeFila"
          >
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border-soft bg-surface px-4 py-3">
              <span className="text-sm text-headline">Ana Prueba</span>
              <MenuDeFila etiqueta="Acciones de Ana Prueba">
                <DropdownMenuItem icon={<Pencil />}>Editar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem icon={<Trash2 />} tone="danger">
                  Eliminar
                </DropdownMenuItem>
              </MenuDeFila>
            </div>
          </Seccion>
          <Seccion
            id="paginacion"
            titulo="Paginación"
            cuando="una lista no cabe en una página: cuántos hay, en singular o plural, y en qué página."
            piezas="Pagination"
          >
            <Pagination page={1} hasMore total={42} label="clientes" singular="cliente" makeHref={(n) => `#paginacion-${n}`} />
            <Pagination page={1} hasMore={false} total={1} label="clientes" singular="cliente" makeHref={(n) => `#paginacion-${n}`} />
          </Seccion>
          <Seccion
            id="capas"
            titulo="Menús, paneles y diálogos"
            cuando="hace falta más espacio sin salir de la página: un menú, un panel lateral para editar, un diálogo para una tarea corta."
            no="una página entera: eso es una ruta."
            piezas="DropdownMenu · Popover · Sheet · Dialog"
          >
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Acciones de la fila">
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Cliente</DropdownMenuLabel>
                  <DropdownMenuItem icon={<Pencil />}>Editar</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem icon={<Trash2 />} tone="danger">
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">Filtros</Button>
                </PopoverTrigger>
                <PopoverContent label="Filtros">
                  <p className="text-sm text-body">Contenido interactivo: filtros, ayudas largas.</p>
                </PopoverContent>
              </Popover>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Abrir panel lateral</Button>
                </SheetTrigger>
                <SheetContent
                  title="Detalle del cliente"
                  description="Sin salir de la lista."
                  footer={<Button>Guardar cambios</Button>}
                >
                  <p className="text-sm text-body">Datos del cliente.</p>
                </SheetContent>
              </Sheet>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Abrir diálogo</Button>
                </DialogTrigger>
                <DialogContent title="Cambiar plan" description="El cambio se aplica en el próximo cobro.">
                  <p className="text-sm text-body">Contenido del diálogo.</p>
                </DialogContent>
              </Dialog>
            </div>
          </Seccion>
          <TituloDeGrupo grupo={GRUPOS[4]} />
          <Seccion
            id="primer-uso"
            titulo="Asistente de primer uso"
            cuando="alguien abre el panel por primera vez: seis pasos, tarjetas de un clic y la tarjeta viva del agente."
            piezas="SPEC-41 · Marca"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-8">
                <Marca pieza="horizontal" className="h-16 w-auto" />
                <Marca pieza="horizontal-simple" className="h-9 w-auto" />
              </div>
              <AvisoDeOnboarding recorrido={{ estado: "omitido", paso: 3, total_pasos: 6, aplica: true, abrir: false, avisar: true }} />
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { id: "ventas", titulo: "Vendo productos o planes", ayuda: "Responde dudas, cotiza y toma el pedido." },
                  { id: "agenda", titulo: "Agendo citas", ayuda: "Ofrece horarios y reserva la cita." },
                ].map((t) => (
                  <TarjetaElegible
                    key={t.id}
                    nombre="cat-tipo"
                    valor={t.id}
                    elegida={tipoNegocio === t.id}
                    onElegir={setTipoNegocio}
                    titulo={t.titulo}
                    ayuda={t.ayuda}
                  />
                ))}
              </div>
              <div className="grid gap-8 lg:grid-cols-[1fr_21rem]">
                <SelectorDeHorario valor={horario} onCambiar={setHorario} />
                <TarjetaDelAgente estado={{ ...ESTADO_INICIAL, tipo: "ventas", nombreDelAgente: "Sofía", negocio: "Sport Plus", horario }} />
              </div>
            </div>
          </Seccion>
          <Seccion
            id="creacion-de-agentes"
            titulo="Asistente de creación de agentes"
            cuando="se crea un agente: un paso por pantalla, «Paso X de N» y resumen antes de crear."
            piezas="SPEC-39"
          >
            <div className="flex max-w-2xl flex-col gap-4 rounded-lg border border-border-soft bg-surface p-5">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-text-soft">{textoDeAvance(1, 7)}</p>
                <Progress value={2} max={7} label="Avance del asistente" valueText={textoDeAvance(1, 7)} size="sm" />
              </div>
              <h3 className="text-lg font-semibold text-headline">¿Qué vendes?</h3>
              <RadioGroup
                label="Qué vende tu negocio"
                name="cat-asistente-vende"
                value={vende}
                onValueChange={setVende}
                options={[
                  { value: "productos", label: "Productos", description: "Tomas pedidos de tu catálogo." },
                  { value: "planes", label: "Planes o suscripciones", description: "Vendes planes que se contratan y se renuevan." },
                  { value: "ambos", label: "Ambos", description: "Productos y planes en el mismo negocio." },
                ]}
              />
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-text-soft">Tipo</dt>
                <dd className="text-headline">Ventas</dd>
                <dt className="text-text-soft">¿Qué vendes?</dt>
                <dd className="text-headline">Productos</dd>
                <dt className="text-text-soft">Nombre</dt>
                <dd className="text-headline">Ventas</dd>
              </dl>
              <AvisoDeRequisitos
                requisitos={REQUISITOS_EJEMPLO}
                titulo="Puedes publicar, pero tu agente no funcionará del todo hasta que configures:"
              />
              <div className="flex gap-3">
                <Button variant="outline">Atrás</Button>
                <Button variant="accent">Crear mi agente</Button>
              </div>
            </div>
          </Seccion>
        </main>
      </div>
    </TemaEnCelular.Provider>
  );
}
