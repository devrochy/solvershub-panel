"use client";

import { useState, type ReactNode } from "react";
import { Bell, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { BarChart, LineChart, ProgressRing, Sparkline, resumenSerie, type ChartDatum, type ChartSeries } from "@/components/dataviz";
import { FilaNotificacion } from "@/components/notificaciones/fila-notificacion";
import { AvisoDeOnboarding } from "@/components/domain/aviso-de-onboarding";
import { AvisoDeRequisitos } from "@/components/domain/aviso-de-requisitos";
import { TarjetaDelAgente } from "@/app/(onboarding)/bienvenida/_components/tarjeta-del-agente";
import { SelectorDeHorario } from "@/app/(onboarding)/bienvenida/_components/selector-de-horario";
import { TarjetaElegible } from "@/app/(onboarding)/bienvenida/_components/elegibles";
import { Marca } from "@/components/ui/marca";
import { ESTADO_INICIAL, HORARIO_INICIAL, type HorarioElegido } from "@/lib/onboarding";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup } from "@/components/ui/radio-group";
import { SearchInput } from "@/components/ui/search-input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Stepper } from "@/components/ui/stepper";
import type { Requirement } from "@/lib/api/types";
import { textoDeAvance } from "@/lib/agente-asistente";
import { toast } from "@/lib/toast-store";

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

/** Una sección del catálogo, repetida en claro y en oscuro lado a lado. */
function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`sec-${titulo}`} className="flex flex-col gap-3">
      <div>
        <h2 id={`sec-${titulo}`} className="font-display text-sh-block text-headline">
          {titulo}
        </h2>
        {nota && <p className="text-sm text-body">{nota}</p>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["sh-light", "sh-dark"] as const).map((tema) => (
          <div
            key={tema}
            data-theme={tema}
            className="flex flex-col gap-4 rounded-lg border border-border-soft bg-bg p-5 text-headline"
          >
            <p className="text-xs text-text-soft">{tema === "sh-light" ? "Claro" : "Oscuro"}</p>
            {children}
          </div>
        ))}
      </div>
    </section>
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
  const [vende, setVende] = useState("productos");
  const [horario, setHorario] = useState<HorarioElegido | null>(HORARIO_INICIAL);
  const [tipoNegocio, setTipoNegocio] = useState("ventas");
  const [busqueda, setBusqueda] = useState("");
  const [pestana, setPestana] = useState("identidad");
  const [canales, setCanales] = useState<string[]>(CANALES.map((c) => c.key));

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <Breadcrumbs items={[{ label: "Desarrollo" }, { label: "Catálogo de componentes" }]} />
        <h1 className="font-display text-sh-h1 text-headline">Catálogo de componentes</h1>
        <p className="max-w-2xl text-sm text-body">
          El kit del panel con sus variantes y estados, en claro y oscuro. Solo existe con PANEL_CATALOGO=1.
          Reglas en DESIGN.md.
        </p>
      </header>

      <Seccion titulo="Botones" nota="Variantes, tamaños y estados. El principal (accent) va uno por pantalla.">
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

      <Seccion titulo="Badges" nota="Con tono de estado el ícono va siempre: el color nunca es la única señal.">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="accent">Nuevo</Badge>
          <Badge variant="info">Programado</Badge>
          <Badge variant="success">Al día</Badge>
          <Badge variant="warning">Por vencer</Badge>
          <Badge variant="danger">En mora</Badge>
        </div>
      </Seccion>

      <Seccion titulo="Avatares y atajos">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name="Ana Prueba" size="xs" />
          <Avatar name="Luis Prueba" size="sm" status="online" />
          <Avatar name="Marta" size="md" status="offline" />
          <Avatar name="Negocio de prueba" size="lg" />
          <Kbd keys={["Ctrl", "K"]} />
          <Kbd keys={["/"]} />
        </div>
      </Seccion>

      <Seccion titulo="Formularios" nota="Etiqueta, ayuda y error unidos al control; error con texto, no solo color.">
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

      <Seccion titulo="KPIs" nota="El delta dice contra qué compara; con polarity up-bad subir es malo.">
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiTile label="Conversaciones (7 días)" value="1.284" delta={{ value: 12, versus: "los 7 días anteriores" }} />
          <KpiTile
            label="Clientes en mora"
            value="8"
            delta={{ value: 14.5, versus: "la semana pasada" }}
            polarity="up-bad"
          />
          <KpiTile label="Recaudo de hoy" loading />
          <KpiTile label="Consumo del plan" error="No se pudo calcular el consumo." />
        </div>
      </Seccion>

      <Seccion
        titulo="Gráficos"
        nota="SVG propio con colores data-* de orden fijo, un solo eje Y, crosshair con flechas y «Ver tabla». Filtra un canal: los otros conservan su color."
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

      <Seccion titulo="Avance y pasos" nota="Barra por estados con su leyenda aparte, pasos numerados con estado escrito y zona para adjuntar capturas (HU-QA-03).">
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

      <Seccion
        titulo="Asistente de primer uso"
        nota="Pantalla completa de 6 pasos (SPEC-41): tarjetas y fichas de un clic, la tarjeta viva «Tu agente, armándose», el selector de horario y el aviso permanente mientras no se termina."
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
        titulo="Asistente de creación de agentes"
        nota="Un paso por pantalla, hasta 10 (SPEC-39): «Paso X de N», una pregunta con opciones, resumen antes de crear y aviso de lo que falta configurar."
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

      <Seccion titulo="Tabla" nota="Densidad compacta, encabezado fijo con scroll propio, carga, vacío y error.">
        <DataTable columns={COLUMNAS} rows={FILAS} getRowKey={(f) => f.id} density="compact" maxHeight="max-h-40" caption="Clientes de prueba" />
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

      <Seccion titulo="Estados vacíos y carga">
        <EmptyState
          title="Conecta WhatsApp para empezar"
          description="Cuando tu número esté conectado, aquí vas a ver las conversaciones."
          action={<Button size="sm">Conectar WhatsApp</Button>}
        />
        <Skeleton lines={3} />
      </Seccion>

      <Seccion
        titulo="Notificaciones"
        nota="Icono de categoría sobre el color de la severidad (info, éxito, atención, urgente); lo urgente lleva etiqueta y lo no leído, punto y negrita."
      >
        <ul className="flex max-w-md flex-col gap-0.5">
          {NOTIFICACIONES_DE_MUESTRA.map((n) => (
            <FilaNotificacion key={n.id} item={n} href="#" ahora={AHORA_DE_MUESTRA} onAbrir={() => undefined} onArchivar={() => undefined} />
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Navegación" nota="Migas y pestañas dentro de la página (las que cambian de ruta son TabLinks).">
        <Breadcrumbs
          items={[{ label: "Ventas y cobros", href: "#" }, { label: "Cobranza", href: "#" }, { label: "Carteras" }]}
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

      <section aria-labelledby="sec-capas" className="flex flex-col gap-3">
        <h2 id="sec-capas" className="font-display text-sh-block text-headline">
          Capas
        </h2>
        <p className="text-sm text-body">
          Menús, paneles, diálogos y avisos se abren sobre el tema de la página: cámbialo con el selector del panel.
        </p>
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
          <Button variant="outline" onClick={() => toast.success("Cambios guardados.")}>
            Aviso de éxito
          </Button>
          <Button variant="outline" onClick={() => toast.error("No se pudo guardar. Inténtalo de nuevo.")}>
            Aviso de error
          </Button>
        </div>
      </section>
    </main>
  );
}
