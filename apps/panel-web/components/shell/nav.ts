import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Coins,
  CreditCard,
  FlaskConical,
  type LucideIcon,
  HandCoins,
  LayoutDashboard,
  LogIn,
  MessageSquare,
  UserRoundPlus,
  PlayCircle,
  Plug,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  UserCog,
  Users,
  Workflow,
  Activity,
  BadgePercent,
  Banknote,
  BarChart3,
  BellRing,
  Bot,
  CalendarX,
  Clock,
  Handshake,
  Landmark,
  Link2,
  Package,
  Receipt,
  Repeat,
  Scale,
  ScrollText,
  Shapes,
  Smartphone,
  Tags,
  Wallet,
} from "lucide-react";

export type NavItem = {
  /**
   * Clave del RBAC del core (ADR-0047). En una entrada con `tabs` no se usa: la entrada se ve
   * si el usuario ve al menos una de sus pestañas.
   */
  section: string;
  label: string;
  /** En una entrada con `tabs`, `gruposVisibles` la reemplaza por la primera pestaña visible. */
  href: string;
  icon: LucideIcon;
  /** false = sección aún servida por el panel clásico (SSR) vía `/legacy`. */
  ready: boolean;
  /** true = enlace al panel clásico (SSR): se marca con ↗. */
  legacy?: boolean;
  /** Subgrupo de pestañas dentro de una entrada (Cobranza: Operación, Monitoreo, Seguridad). */
  sub?: string;
  /**
   * true = solo para el admin de plataforma (`role === "master"`), aunque la sección esté en
   * los permisos: un tester actúa como master en la operación pero no gestiona la plataforma.
   */
  soloMaster?: boolean;
  /**
   * Pack de la entrada: con el pack apagado para el negocio se muestra con candado y su
   * página ofrece habilitarlo (ADR-0019).
   */
  pack?: string;
  /**
   * Menú v2 (HU-UX-02, D-37): las páginas de una entrada son sus pestañas, no ítems del
   * menú. Cada ruta del panel es una entrada o una pestaña de una entrada.
   */
  tabs?: NavItem[];
  /**
   * true = página de la entrada que no se muestra como pestaña (HU-UX-08: Bloqueos se crea
   * y se mueve desde el Calendario). Sigue en `rutasDelMenu`, así su ruta queda protegida
   * por su clave de permiso y las migas la ubican.
   */
  oculta?: boolean;
};

export type NavGroupDef = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Entrada del menú que agrupa páginas como pestañas. */
function entrada(
  label: string,
  icon: LucideIcon,
  tabs: NavItem[],
  extra: Pick<NavItem, "pack"> = {},
): NavItem {
  return { section: "", label, href: tabs[0].href, icon, ready: true, tabs, ...extra };
}

/**
 * Menú v2 (HU-UX-02, SPEC-12, D-37): una entrada por tarea del negocio y el resto en
 * pestañas. Las rutas no cambian respecto al menú anterior; solo cambia dónde se ven.
 * Las claves `section` son las del RBAC del core (ADR-0047).
 */
export const NAV_GROUPS: NavGroupDef[] = [
  {
    id: "operacion",
    label: "Operación",
    items: [
      { section: "dashboard", label: "Resumen", href: "/dashboard", icon: LayoutDashboard, ready: true },
      entrada("Conversaciones", MessageSquare, [
        { section: "conversations", label: "Conversaciones", href: "/conversaciones", icon: MessageSquare, ready: true },
        { section: "escalations", label: "Escalaciones", href: "/escalaciones", icon: ShieldAlert, ready: true },
      ]),
      { section: "leads", label: "Clientes", href: "/leads", icon: Users, ready: true },
    ],
  },
  {
    id: "asistente",
    label: "Tu asistente",
    items: [
      entrada("Agentes", Bot, [
        { section: "agents", label: "Agentes", href: "/agentes", icon: Bot, ready: true },
        { section: "connections", label: "Probar asistente", href: "/asistente", icon: PlayCircle, ready: true },
      ]),
      // Plantillas, Producción y Requisitos de Meta se gestionan desde cada conexión Meta.
      { section: "connections", label: "Conexiones", href: "/conexiones", icon: Plug, ready: true },
    ],
  },
  {
    id: "negocio",
    label: "Negocio",
    items: [
      entrada(
        "Agenda",
        CalendarDays,
        [
          { section: "pack_calendar:citas", label: "Calendario", href: "/calendario/citas", icon: CalendarDays, ready: true },
          { section: "pack_calendar:tipos", label: "Tipos de cita", href: "/calendario/tipos", icon: Shapes, ready: true },
          // Misma clave que el backend (`pack_calendar:configuracion`, «Horarios y calendario»).
          { section: "pack_calendar:configuracion", label: "Horario", href: "/calendario/horario", icon: Clock, ready: true },
          // Google Calendar pasa a la ficha de su conexión con HU-UX-09; hasta entonces queda aquí.
          { section: "pack_calendar:conexion", label: "Google Calendar", href: "/calendario", icon: Link2, ready: true },
          // HU-UX-08: los bloqueos se crean y se arrastran en el Calendario. Va al final para
          // que la entrada nunca abra en ella si el usuario ve el Calendario.
          { section: "pack_calendar:bloqueos", label: "Bloqueos", href: "/calendario/bloqueos", icon: CalendarX, ready: true, oculta: true },
        ],
        { pack: "pack_calendar" },
      ),
      entrada(
        "Ventas",
        ShoppingCart,
        [
          { section: "pack_commerce", label: "Resumen", href: "/comercio", icon: LayoutDashboard, ready: true },
          { section: "pack_commerce", label: "Productos", href: "/comercio/productos", icon: Package, ready: true },
          { section: "pack_commerce", label: "Categorías", href: "/comercio/categorias", icon: Tags, ready: true },
          { section: "pack_commerce", label: "Promociones", href: "/comercio/promociones", icon: BadgePercent, ready: true },
          { section: "pack_commerce", label: "Pedidos", href: "/comercio/pedidos", icon: ShoppingCart, ready: true },
          // HU-CRM-03: los aliados son opcionales por negocio; no sale como pestaña y se entra
          // desde Productos cuando el master los enciende.
          { section: "pack_commerce", label: "Aliados", href: "/comercio/aliados", icon: Handshake, ready: true, oculta: true },
        ],
        { pack: "pack_commerce" },
      ),
      // D-43 (SPEC-35): entrada propia, no pestaña de Ventas; solo aparece con la habilidad activa.
      entrada(
        "Suscripciones",
        Repeat,
        [
          { section: "pack_subscriptions:suscripciones", label: "Resumen", href: "/suscripciones", icon: LayoutDashboard, ready: true },
          { section: "pack_subscriptions:suscripciones", label: "Suscripciones", href: "/suscripciones/lista", icon: Repeat, ready: true },
          { section: "pack_subscriptions:suscripciones", label: "Clientes", href: "/suscripciones/clientes", icon: Users, ready: true },
          { section: "pack_subscriptions:suscripciones", label: "Pagos", href: "/suscripciones/pagos", icon: Banknote, ready: true },
        ],
        { pack: "pack_subscriptions" },
      ),
      entrada(
        "Cobranza",
        HandCoins,
        [
          { label: "Resumen", href: "/cobranza", section: "pack_cobranza:resumen", icon: LayoutDashboard, sub: "Operación", ready: true },
          { label: "Gestores", href: "/cobranza/gestores", section: "pack_cobranza:gestores", icon: UserCog, sub: "Operación", ready: true },
          { label: "Carteras", href: "/cobranza/carteras", section: "pack_cobranza:carteras", icon: Wallet, sub: "Operación", ready: true },
          { label: "Clientes", href: "/cobranza/clientes", section: "pack_cobranza:clientes", icon: Users, sub: "Operación", ready: true },
          { label: "Cobros al propietario", href: "/cobranza/cobros", section: "pack_cobranza:cobros", icon: Receipt, sub: "Operación", ready: true },
          { label: "Pagos de clientes", href: "/cobranza/pagos", section: "pack_cobranza:cobros", icon: Banknote, sub: "Operación", ready: true },
          { label: "Promesas", href: "/cobranza/promesas", section: "pack_cobranza:promesas", icon: Handshake, sub: "Operación", ready: true },
          { label: "Propietario", href: "/cobranza/propietario", section: "pack_cobranza:propietario", icon: Landmark, sub: "Operación", ready: true },
          { label: "Reportes", href: "/cobranza/reportes", section: "pack_cobranza:reportes", icon: BarChart3, sub: "Operación", ready: true },
          { label: "Monitoreo IA", href: "/cobranza/monitoreo", section: "pack_cobranza:monitoreo", icon: Activity, sub: "Monitoreo", ready: true },
          { label: "Reglas de negociación", href: "/cobranza/reglas", section: "pack_cobranza:reglas", icon: Scale, sub: "Monitoreo", ready: true },
          { label: "Alertas de acceso", href: "/cobranza/alertas", section: "pack_cobranza:alertas", icon: BellRing, sub: "Seguridad", ready: true },
          { label: "Auditoría", href: "/cobranza/auditoria", section: "pack_cobranza:auditoria", icon: ScrollText, sub: "Seguridad", ready: true },
          { label: "Dispositivos", href: "/cobranza/dispositivos", section: "pack_cobranza:dispositivos", icon: Smartphone, sub: "Seguridad", ready: true },
        ],
        { pack: "pack_cobranza" },
      ),
    ],
  },
  {
    id: "cuenta",
    label: "Cuenta",
    items: [
      entrada("Consumo y plan", CreditCard, [
        { section: "plan", label: "Plan y consumo", href: "/plan", icon: CreditCard, ready: true },
        { section: "costs", label: "Costos", href: "/costos", icon: Coins, ready: true },
      ]),
      { section: "collaborators", label: "Equipo", href: "/colaboradores", icon: UserCog, ready: true },
      entrada("Configuración", Settings, [
        { section: "settings", label: "General", href: "/configuracion", icon: Settings, ready: true },
        { section: "plugins", label: "Habilidades", href: "/habilidades", icon: Workflow, ready: true },
        { section: "settings", label: "Mensajes fallidos", href: "/dlq", icon: AlertTriangle, ready: true },
      ]),
    ],
  },
  {
    id: "plataforma",
    label: "Plataforma",
    items: [
      // Solo master: `tenants` es una sección global (HU-CONN-07 y HU-SH-05).
      entrada("Negocios", Building2, [
        { section: "tenants", label: "Negocios", href: "/tenants", icon: Building2, ready: true },
        // Alta automática (HU-SH-07): configuración propia del agente de ventas de SolversHub.
        { section: "tenants", label: "Alta automática", href: "/tenants/alta-automatica", icon: UserRoundPlus, ready: true, soloMaster: true },
      ]),
      entrada("App de Meta", ShieldCheck, [
        { section: "tenants", label: "App de Meta", href: "/plataforma/meta", icon: ShieldCheck, ready: true },
        { section: "tenants", label: "Embedded Signup", href: "/plataforma/meta/embedded-signup", icon: LogIn, ready: true },
      ]),
      // Centro de pruebas (SPEC-30): sección global `qa`, de master y testers (solo en test).
      { section: "qa", label: "Pruebas", href: "/pruebas", icon: FlaskConical, ready: true },
    ],
  },
];

/** Grupos que arrancan colapsados: ninguno (el menú v2 es corto). */
export const DEFAULT_COLLAPSED_GROUPS: string[] = [];
