import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Coins,
  CreditCard,
  FileText,
  type LucideIcon,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  PlayCircle,
  Plug,
  Rocket,
  Settings,
  ShieldAlert,
  ShoppingCart,
  UserCog,
  Users,
  Workflow,
} from "lucide-react";

export type NavItem = {
  section: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** false = sección aún servida por el panel clásico (SSR) vía `/legacy`. */
  ready: boolean;
  /** true = enlace al panel clásico (SSR): se marca con ↗. */
  legacy?: boolean;
};

/**
 * Navegación del panel, por sección (misma clave que el RBAC del core, ADR-0047).
 * Los labels siguen el glosario del manual de marca (p. ej. "Habilidades").
 */
export const CORE_NAV: NavItem[] = [
  { section: "dashboard", label: "Resumen", href: "/dashboard", icon: LayoutDashboard, ready: true },
  { section: "leads", label: "Leads", href: "/leads", icon: Users, ready: true },
  { section: "conversations", label: "Conversaciones", href: "/conversaciones", icon: MessageSquare, ready: true },
  { section: "escalations", label: "Escalaciones", href: "/escalaciones", icon: ShieldAlert, ready: true },
  { section: "connections", label: "Conexiones", href: "/conexiones", icon: Plug, ready: true },
  { section: "plugins", label: "Habilidades", href: "/habilidades", icon: Workflow, ready: true },
  { section: "costs", label: "Costos LLM", href: "/costos", icon: Coins, ready: true },
  { section: "plan", label: "Plan y consumo", href: "/plan", icon: CreditCard, ready: true },
  { section: "collaborators", label: "Colaboradores", href: "/colaboradores", icon: UserCog, ready: true },
  { section: "settings", label: "Configuración", href: "/configuracion", icon: Settings, ready: true },
  { section: "tenants", label: "Tenants", href: "/tenants", icon: Building2, ready: true },
];

/** Herramientas: viven en el panel clásico hasta su reconstrucción. */
export const TOOLS_NAV: NavItem[] = [
  {
    section: "connections",
    label: "Probar asistente",
    href: "/legacy/admin/asistente/probar",
    icon: PlayCircle,
    ready: true,
    legacy: true,
  },
  {
    section: "connections",
    label: "Plantillas WhatsApp",
    href: "/legacy/admin/plantillas",
    icon: FileText,
    ready: true,
    legacy: true,
  },
  {
    section: "settings",
    label: "Bandeja de fallos",
    href: "/legacy/admin/dlq",
    icon: AlertTriangle,
    ready: true,
    legacy: true,
  },
  {
    section: "connections",
    label: "Requisitos de Meta",
    href: "/legacy/admin/conexiones/meta-requisitos",
    icon: ListChecks,
    ready: true,
    legacy: true,
  },
  {
    section: "connections",
    label: "Producción",
    href: "/legacy/admin/conexiones/produccion",
    icon: Rocket,
    ready: true,
    legacy: true,
  },
  {
    section: "connections",
    label: "Plantillas (todas)",
    href: "/legacy/admin/plantillas",
    icon: FileText,
    ready: true,
    legacy: true,
  },
];

/** Packs: UI propia de cada vertical (se reconstruye en la fase final). */
export const PACKS_NAV: NavItem[] = [
  { section: "pack_cobranza:resumen", label: "Cobranza", href: "/cobranza", icon: HandCoins, ready: true },
  { section: "pack_cobranza:carteras", label: "Carteras", href: "/cobranza/carteras", icon: HandCoins, ready: true },
  { section: "pack_cobranza:cobros", label: "Cobros al propietario", href: "/cobranza/cobros", icon: HandCoins, ready: true },
  { section: "pack_cobranza:cobros", label: "Pagos de clientes", href: "/cobranza/pagos", icon: HandCoins, ready: true },
  { section: "pack_cobranza:promesas", label: "Promesas", href: "/cobranza/promesas", icon: HandCoins, ready: true },
  { section: "pack_cobranza:reglas", label: "Reglas de negociación", href: "/cobranza/reglas", icon: HandCoins, ready: true },
  { section: "pack_cobranza:monitoreo", label: "Monitoreo IA", href: "/cobranza/monitoreo", icon: HandCoins, ready: true },
  { section: "pack_cobranza:alertas", label: "Alertas de acceso", href: "/cobranza/alertas", icon: HandCoins, ready: true },
  { section: "pack_cobranza:auditoria", label: "Auditoría", href: "/cobranza/auditoria", icon: HandCoins, ready: true },
  { section: "pack_cobranza:dispositivos", label: "Dispositivos", href: "/cobranza/dispositivos", icon: HandCoins, ready: true },
  { section: "pack_cobranza:resumen", label: "Cobranza (clásica)", href: "/legacy/cobranza/", icon: HandCoins, ready: true, legacy: true },
  { section: "pack_commerce", label: "Comercio", href: "/comercio", icon: ShoppingCart, ready: true },
  { section: "pack_commerce", label: "Productos", href: "/comercio/productos", icon: ShoppingCart, ready: true },
  { section: "pack_commerce", label: "Categorías", href: "/comercio/categorias", icon: FileText, ready: true },
  { section: "pack_commerce", label: "Promociones", href: "/comercio/promociones", icon: FileText, ready: true },
  { section: "pack_commerce", label: "Pedidos", href: "/comercio/pedidos", icon: FileText, ready: true },
  { section: "pack_commerce", label: "Comercio (clásico)", href: "/legacy/crm/", icon: ShoppingCart, ready: true, legacy: true },
  { section: "pack_calendar:conexion", label: "Calendario", href: "/calendario", icon: CalendarDays, ready: true },
  { section: "pack_calendar:tipos", label: "Tipos de cita", href: "/calendario/tipos", icon: CalendarDays, ready: true },
  { section: "pack_calendar:conexion", label: "Calendario (clásico)", href: "/legacy/calendar/", icon: CalendarDays, ready: true, legacy: true },
];
