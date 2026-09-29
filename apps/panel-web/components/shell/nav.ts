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
  /** Sub-sección del pack (mismo agrupamiento que el clásico). */
  sub?: string;
};

export type NavGroupDef = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /**
   * Si el grupo pertenece a un pack: se atenúa y bloquea cuando el pack no está
   * habilitado para el tenant (mismo gating que el menú clásico, ADR-0019).
   */
  pack?: string;
  items: NavItem[];
};

/**
 * Navegación del panel en grupos: los del core por dominio y **un grupo por
 * pack** con sus subsecciones (como el clásico). Las claves `section` son las
 * mismas del RBAC del core (ADR-0047); `pack` habilita el gating por pack.
 */
export const NAV_GROUPS: NavGroupDef[] = [
  {
    id: "operacion",
    label: "Operación",
    items: [
      { section: "dashboard", label: "Resumen", href: "/dashboard", icon: LayoutDashboard, ready: true },
      { section: "conversations", label: "Conversaciones", href: "/conversaciones", icon: MessageSquare, ready: true },
      { section: "escalations", label: "Escalaciones", href: "/escalaciones", icon: ShieldAlert, ready: true },
      { section: "leads", label: "Leads", href: "/leads", icon: Users, ready: true },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    items: [
      { section: "connections", label: "Conexiones", href: "/conexiones", icon: Plug, ready: true },
      { section: "plugins", label: "Habilidades", href: "/habilidades", icon: Workflow, ready: true },
      { section: "collaborators", label: "Colaboradores", href: "/colaboradores", icon: UserCog, ready: true },
      { section: "settings", label: "Configuración", href: "/configuracion", icon: Settings, ready: true },
    ],
  },
  {
    id: "negocio",
    label: "Negocio",
    items: [
      { section: "costs", label: "Costos LLM", href: "/costos", icon: Coins, ready: true },
      { section: "plan", label: "Plan y consumo", href: "/plan", icon: CreditCard, ready: true },
    ],
  },
  {
    id: "pack_cobranza",
    label: "Cobranza",
    icon: HandCoins,
    pack: "pack_cobranza",
    items: [
      { label: "Resumen", href: "/cobranza", section: "pack_cobranza:resumen", icon: HandCoins, sub: "General", ready: true },
      { label: "Carteras", href: "/cobranza/carteras", section: "pack_cobranza:carteras", icon: HandCoins, sub: "General", ready: true },
      { label: "Cobros al propietario", href: "/cobranza/cobros", section: "pack_cobranza:cobros", icon: HandCoins, sub: "General", ready: true },
      { label: "Pagos de clientes", href: "/cobranza/pagos", section: "pack_cobranza:cobros", icon: HandCoins, sub: "General", ready: true },
      { label: "Promesas", href: "/cobranza/promesas", section: "pack_cobranza:promesas", icon: HandCoins, sub: "General", ready: true },
      { label: "Propietario", href: "/cobranza/propietario", section: "pack_cobranza:propietario", icon: HandCoins, sub: "General", ready: true },
      { label: "Reportes", href: "/cobranza/reportes", section: "pack_cobranza:reportes", icon: HandCoins, sub: "General", ready: true },
      { label: "Monitoreo IA", href: "/cobranza/monitoreo", section: "pack_cobranza:monitoreo", icon: HandCoins, sub: "Monitoreo", ready: true },
      { label: "Reglas de negociación", href: "/cobranza/reglas", section: "pack_cobranza:reglas", icon: HandCoins, sub: "Monitoreo", ready: true },
      { label: "Alertas de acceso", href: "/cobranza/alertas", section: "pack_cobranza:alertas", icon: HandCoins, sub: "Seguridad", ready: true },
      { label: "Auditoría", href: "/cobranza/auditoria", section: "pack_cobranza:auditoria", icon: HandCoins, sub: "Seguridad", ready: true },
      { label: "Dispositivos", href: "/cobranza/dispositivos", section: "pack_cobranza:dispositivos", icon: HandCoins, sub: "Seguridad", ready: true },
    ],
  },
  {
    id: "pack_commerce",
    label: "Comercio",
    icon: ShoppingCart,
    pack: "pack_commerce",
    items: [
      { section: "pack_commerce", label: "Resumen", href: "/comercio", icon: ShoppingCart, ready: true },
      { section: "pack_commerce", label: "Productos", href: "/comercio/productos", icon: ShoppingCart, ready: true },
      { section: "pack_commerce", label: "Categorías", href: "/comercio/categorias", icon: FileText, ready: true },
      { section: "pack_commerce", label: "Promociones", href: "/comercio/promociones", icon: FileText, ready: true },
      { section: "pack_commerce", label: "Pedidos", href: "/comercio/pedidos", icon: FileText, ready: true },
    ],
  },
  {
    id: "pack_calendar",
    label: "Calendario",
    icon: CalendarDays,
    pack: "pack_calendar",
    items: [
      { section: "pack_calendar:conexion", label: "Conexión", href: "/calendario", icon: CalendarDays, ready: true },
      { section: "pack_calendar:tipos", label: "Tipos de cita", href: "/calendario/tipos", icon: CalendarDays, ready: true },
      { section: "pack_calendar:citas", label: "Citas", href: "/calendario/citas", icon: CalendarDays, ready: true },
    ],
  },
  {
    id: "herramientas",
    label: "Herramientas",
    items: [
      {
        section: "connections",
        label: "Probar asistente",
        href: "/asistente",
        icon: PlayCircle,
        ready: true,
      },
      {
        section: "connections",
        label: "Plantillas WhatsApp",
        href: "/plantillas",
        icon: FileText,
        ready: true,
      },
      {
        section: "settings",
        label: "Bandeja de fallos",
        href: "/dlq",
        icon: AlertTriangle,
        ready: true,
      },
      {
        section: "connections",
        label: "Requisitos de Meta",
        href: "/conexiones/requisitos",
        icon: ListChecks,
        ready: true,
      },
      {
        section: "connections",
        label: "Producción",
        href: "/conexiones/produccion",
        icon: Rocket,
        ready: true,
      },
    ],
  },
  {
    id: "plataforma",
    label: "Plataforma",
    items: [
      { section: "tenants", label: "Tenants", href: "/tenants", icon: Building2, ready: true },
    ],
  },
];

/** Grupos que arrancan colapsados (los packs: son los más largos). */
export const DEFAULT_COLLAPSED_GROUPS = NAV_GROUPS.filter((group) => group.pack).map(
  (group) => group.id,
);
