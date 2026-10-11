"use client";

import { useState, type ReactNode } from "react";
import { Bell, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "@/lib/toast-store";

type Fila = { id: string; cliente: string; estado: "al_dia" | "mora"; saldo: string };

const FILAS: Fila[] = [
  { id: "1", cliente: "Ana Prueba", estado: "al_dia", saldo: "$ 120.000" },
  { id: "2", cliente: "Luis Prueba", estado: "mora", saldo: "$ 480.500" },
  { id: "3", cliente: "Marta Prueba", estado: "al_dia", saldo: "$ 75.000" },
];

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

export function Catalogo() {
  const [casilla, setCasilla] = useState<boolean | "indeterminate">("indeterminate");
  const [plan, setPlan] = useState("basico");
  const [busqueda, setBusqueda] = useState("");
  const [pestana, setPestana] = useState("identidad");

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
