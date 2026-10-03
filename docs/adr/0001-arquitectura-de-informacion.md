# ADR-0001 — Arquitectura de información y glosario del panel

- **Estado:** aceptado
- **Fecha:** 2026-10-03
- **Ámbito:** `solvershub-panel` (panel de producto) y, por coherencia, asistente,
  landing y material comercial.

## Contexto

El menú del panel crece con cada pack (comercio, cobranza, calendario…) y sin una
decisión escrita cada uno agrega su propio término técnico ("plugin", "pack",
"módulo"), y las secciones se ordenan por cómo está hecho el código, no por lo que
el negocio necesita. El manual de marca (§9.3) ya fija el vocabulario; falta
aterrizarlo en la estructura del panel.

## Decisión

### 1. Grupos del menú

El menú se agrupa por **tarea del negocio**, no por código:

| Grupo | Para qué | Contenido |
|---|---|---|
| **Operación** | El día a día | Resumen, Conversaciones, Escalaciones, Leads |
| **Configuración** | Dejar el asistente a punto | Conexiones, Habilidades, Colaboradores, Configuración |
| **Negocio** | Costos y plan | Costos LLM, Plan y consumo |
| **<Pack>** (uno por habilidad) | Lo específico del pack | Sus subsecciones (p. ej. Cobranza, Comercio, Calendario) |
| **Herramientas** | Diagnóstico y pruebas | Probar asistente, Plantillas WhatsApp, Bandeja de fallos, Requisitos de Meta, Producción |
| **Plataforma** | Solo master | Negocios (tenants) |

Reglas:
- El grupo se ordena por frecuencia de uso, no alfabéticamente.
- Un pack **nuevo** agrega su propio grupo con su nombre de negocio
  (`label` = glosario), y sus items usan `section` = `<pack>:<subseccion>`
  (RBAC del core) con `pack` para el gating de habilitación (ADR-0019).
- Las subsecciones de un pack se agrupan con `sub` (p. ej. General · Monitoreo ·
  Seguridad) cuando hay más de 6.

### 2. Nombres (glosario de negocio)

Fuente: `brand/manual-de-marca.md` §9.3. Términos permitidos de cara al cliente:

| Se dice | No se dice |
|---|---|
| **habilidad** | plugin, pack, módulo |
| **negocio** | tenant, cuenta |
| **asistente** | bot (salvo que el cliente lo diga), agente IA en UI |
| **panel** / **Resumen** | dashboard |
| **conversación**, **lead**, **pedido**, **cotización**, **escalamiento** | — |

Los enums técnicos **nunca** se muestran crudos: se traducen con `lib/format.ts`
y etiquetas legibles.

### 3. Mapeo de rutas

- Sección del core: `/dashboard`, `/conversaciones`, `/escalaciones`, `/leads`,
  `/conexiones`, `/habilidades`, `/colaboradores`, `/configuracion`, `/costos`,
  `/plan`.
- Pack: `/cobranza/**`, `/comercio/**`, `/calendario/**`.
- Herramientas: `/asistente`, `/plantillas`, `/dlq`, `/conexiones/requisitos`,
  `/conexiones/produccion`.
- Plataforma: `/tenants`.
- La ruta de una sección **no cambia** al renombrar su etiqueta; los renombres se
  hacen con redirección (ver HU-UX-02).

## Consecuencias

**Positivas:** un pack nuevo sabe dónde y cómo ponerse sin inventar vocabulario;
el panel habla el idioma del negocio; el manual de marca y la UI quedan alineados.

**Negativas / lo que aceptamos pagar:** mantener el glosario y las etiquetas a
medida que crecen los packs; una sección mal clasificada obliga a mover items.

**Qué haría que revisáramos esto:** que un negocio no encuentre una función en dos
búsquedas, o que un pack necesite estar en dos grupos a la vez.

## Impacto en el código

- `components/shell/nav.ts` (grupos, etiquetas, `section`, `pack`, `sub`).
- `lib/format.ts` (etiquetas legibles; nunca enums crudos).
- `brand/manual-de-marca.md` §9.3 (glosario, fuente de verdad del vocabulario).
