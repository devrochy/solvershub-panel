import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Coins,
  CreditCard,
  FlaskConical,
  Gauge,
  type LucideIcon,
  Network,
  HandCoins,
  LayoutDashboard,
  LogIn,
  MessageSquare,
  MessagesSquare,
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
  Handshake,
  Package,
  Repeat,
  Scale,
  ScrollText,
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
  /** Subgrupo de pestañas dentro de una entrada (Cobranza: Resumen, Carteras, Actividad, Equipo, Asistente). */
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
        // HU-AOS-26: permisos entre agentes y «Probar una frase» (escribe en `settings`, como el editor).
        { section: "settings", label: "Colaboración", href: "/agentes/colaboracion", icon: Network, ready: true },
        // HU-AOS-29: tablero de fiabilidad (escalamiento, verificador, completitud y consistencia).
        { section: "agents", label: "Calidad", href: "/agentes/calidad", icon: Gauge, ready: true },
        { section: "connections", label: "Probar asistente", href: "/asistente", icon: PlayCircle, ready: true },
        // ADR-0178 (pista D0): catálogo de solo lectura de los mensajes al cliente. El backend filtra cada tipo por la
        // sección de su fuente (connections, settings, plugins); la entrada se ve con `connections`, como las plantillas.
        { section: "connections", label: "Mensajes", href: "/mensajes", icon: MessagesSquare, ready: true },
      ]),
      // Plantillas, Producción y Requisitos de Meta se gestionan desde cada conexión Meta.
      { section: "connections", label: "Conexiones", href: "/conexiones", icon: Plug, ready: true },
    ],
  },
  {
    id: "negocio",
    label: "Negocio",
    items: [
      // HU-CAL-08: Agenda es una sola vista; tipos, horario, agendas y Google se abren en su cajón
      // de ajustes y la cuenta de Google vive en la ficha de su conexión.
      { section: "pack_calendar:citas", label: "Agenda", href: "/calendario", icon: CalendarDays, ready: true, pack: "pack_calendar" },
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
          { label: "Resumen", href: "/cobranza", section: "pack_cobranza:resumen", icon: LayoutDashboard, sub: "Resumen", ready: true },
          { label: "Carteras", href: "/cobranza/carteras", section: "pack_cobranza:carteras", icon: Wallet, sub: "Carteras", ready: true },
          // El cliente es hijo de la cartera: se llega desde su ficha y desde «Buscar cliente» en Carteras.
          { label: "Clientes", href: "/cobranza/clientes", section: "pack_cobranza:clientes", icon: Users, sub: "Carteras", ready: true, oculta: true },
          { label: "Pagos", href: "/cobranza/pagos", section: "pack_cobranza:cobros", icon: Banknote, sub: "Actividad", ready: true },
          { label: "Promesas", href: "/cobranza/promesas", section: "pack_cobranza:promesas", icon: Handshake, sub: "Actividad", ready: true },
          { label: "Reportes", href: "/cobranza/reportes", section: "pack_cobranza:reportes", icon: BarChart3, sub: "Actividad", ready: true },
          { label: "Gestores", href: "/cobranza/gestores", section: "pack_cobranza:gestores", icon: UserCog, sub: "Equipo", ready: true },
          { label: "Dispositivos", href: "/cobranza/dispositivos", section: "pack_cobranza:dispositivos", icon: Smartphone, sub: "Equipo", ready: true },
          { label: "Alertas de acceso", href: "/cobranza/alertas", section: "pack_cobranza:alertas", icon: BellRing, sub: "Equipo", ready: true },
          { label: "Auditoría", href: "/cobranza/auditoria", section: "pack_cobranza:auditoria", icon: ScrollText, sub: "Equipo", ready: true },
          { label: "Monitoreo IA", href: "/cobranza/monitoreo", section: "pack_cobranza:monitoreo", icon: Activity, sub: "Asistente", ready: true },
          { label: "Reglas de negociación", href: "/cobranza/reglas", section: "pack_cobranza:reglas", icon: Scale, sub: "Asistente", ready: true },
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
