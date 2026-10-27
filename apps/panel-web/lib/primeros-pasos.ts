/**
 * Primeros pasos del Resumen (HU-SH-06): textos y destino de cada paso.
 *
 * El estado lo calcula el backend (`GET /admin/onboarding`) del estado real del negocio;
 * aquí solo se traduce a lenguaje de negocio (glosario: negocio, habilidad) y se elige
 * adónde lleva la acción. Nunca se muestra la clave o el motivo crudo.
 */
import type { PasoPrimerosPasos } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

export interface CopiaDePaso {
  titulo: string;
  descripcion: string;
  /** Texto del botón (lo que pasa al pulsarlo). */
  accion: string;
  /** Ruta del panel donde se resuelve el paso; null = no hay acción en el panel. */
  href: string | null;
}

type Tipo = NonNullable<PasoPrimerosPasos["tipo"]>;

export const CONTENIDO: Record<Tipo, { titulo: string; descripcion: string; accion: string; href: string; unidad: [string, string] }> = {
  catalogo: {
    titulo: "Carga tu catálogo",
    descripcion: "Agrega los productos que tu asistente puede ofrecer y cotizar.",
    accion: "Cargar productos",
    href: "/comercio/productos",
    unidad: ["producto cargado", "productos cargados"],
  },
  servicios: {
    titulo: "Define tus servicios",
    descripcion: "Crea los tipos de cita que tus clientes pueden agendar.",
    accion: "Crear servicios",
    href: "/calendario?ajustes=tipos",
    unidad: ["servicio creado", "servicios creados"],
  },
  cartera: {
    titulo: "Carga tu cartera",
    descripcion: "Agrega los clientes que tu asistente va a gestionar.",
    accion: "Cargar clientes",
    href: "/cobranza/clientes",
    unidad: ["cliente cargado", "clientes cargados"],
  },
};

const WHATSAPP_EN_CURSO: Record<string, { descripcion: string; accion: string; href: string }> = {
  sin_verificar: {
    descripcion: "Tu número está conectado. Falta que el diagnóstico confirme que puede enviar mensajes.",
    accion: "Revisar conexión",
    href: "/conexiones/meta",
  },
  con_problemas: {
    descripcion: "La conexión tiene un problema. Revisa el diagnóstico para repararla.",
    accion: "Revisar conexión",
    href: "/conexiones",
  },
  sin_terminar: {
    descripcion: "Empezaste a conectar tu WhatsApp: termina el proceso para que tu asistente atienda.",
    accion: "Terminar conexión",
    href: "/conexiones",
  },
};

/** Textos y destino de un paso, según su clave, su estado y su motivo. */
export function copiaDelPaso(paso: PasoPrimerosPasos): CopiaDePaso {
  switch (paso.clave) {
    case "datos_negocio":
      return {
        titulo: "Describe tu negocio",
        descripcion: "Cuéntale a tu asistente qué vendes, dónde estás y cómo atiendes.",
        accion: "Completar datos",
        href: "/configuracion",
      };
    case "whatsapp": {
      const enCurso = paso.estado === "en_curso" && paso.motivo ? WHATSAPP_EN_CURSO[paso.motivo] : undefined;
      return {
        titulo: "Conecta tu WhatsApp",
        descripcion: enCurso?.descripcion ?? "Tu asistente atiende a tus clientes por el WhatsApp de tu negocio.",
        accion: enCurso?.accion ?? "Conectar WhatsApp",
        href: enCurso?.href ?? "/conexiones",
      };
    }
    case "catalogo": {
      if (paso.motivo === "sin_habilidad" || !paso.tipo) {
        return {
          titulo: "Carga tu catálogo o tus servicios",
          descripcion: "Activa la habilidad de ventas o de agenda para cargar lo que ofreces.",
          accion: "Ver habilidades",
          href: "/habilidades",
        };
      }
      const contenido = CONTENIDO[paso.tipo];
      const cantidad = paso.cantidad ?? 0;
      const descripcion =
        paso.estado === "completo" && cantidad > 0
          ? `${formatNumber(cantidad)} ${cantidad === 1 ? contenido.unidad[0] : contenido.unidad[1]}.`
          : contenido.descripcion;
      return { titulo: contenido.titulo, descripcion, accion: contenido.accion, href: contenido.href };
    }
    case "probar_asistente":
      return {
        titulo: "Prueba tu asistente",
        descripcion: "Conversa con él antes de abrirlo a tus clientes.",
        accion: "Probar asistente",
        href: "/asistente",
      };
    case "equipo":
      return {
        titulo: "Invita a tu equipo",
        descripcion: "Suma a las personas que atienden contigo y define qué puede hacer cada una.",
        accion: "Invitar",
        href: "/colaboradores",
      };
    case "activar_preset": {
      const nombre = paso.titulo ?? "tu tipo de negocio";
      return {
        titulo: `Activa las habilidades de ${nombre}`,
        descripcion: paso.plan_requerido
          ? `Tu tipo de negocio necesita el plan ${paso.plan_requerido} para activar sus habilidades.`
          : "Tu tipo de negocio necesita un plan más alto para activar sus habilidades.",
        accion: "Ver planes",
        href: "/plan",
      };
    }
    default:
      if (paso.clave.startsWith("configurar_") && paso.pack) {
        return {
          titulo: `Configura ${paso.titulo ?? "la habilidad"}`,
          descripcion: paso.explicacion || "Completa sus datos para que tu asistente la pueda usar.",
          accion: "Configurar",
          href: `/habilidades/${encodeURIComponent(paso.pack)}`,
        };
      }
      return {
        titulo: paso.titulo ?? "Paso pendiente",
        descripcion: paso.explicacion ?? "",
        accion: "Ver",
        href: null,
      };
  }
}

/** Porcentaje entero de avance (0 si no hay pasos). */
export function porcentajeDeAvance(completos: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(completos, total) / total) * 100);
}

/** Los primeros pasos se muestran mientras quede alguno sin cumplir. */
export function hayPasosPendientes(pasos: Pick<PasoPrimerosPasos, "estado">[]): boolean {
  return pasos.some((paso) => paso.estado !== "completo");
}

/**
 * Se muestran si queda algún paso que este usuario pueda resolver: a quien solo puede mirar
 * (un colaborador de lectura) el checklist no le pide nada.
 */
export function hayPasosParaActuar(pasos: Pick<PasoPrimerosPasos, "estado" | "puede_actuar">[]): boolean {
  return pasos.some((paso) => paso.estado !== "completo" && paso.puede_actuar);
}

/** Cookie no secreta con la preferencia de ver la lista plegada (se lee en el servidor: sin salto). */
export const PASOS_PLEGADOS_COOKIE = "panel_pasos_plegados";
