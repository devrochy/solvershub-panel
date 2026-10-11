# SolversHub — Panel

Panel de control de SolversHub. **Next.js 16 + Tailwind v4 + shadcn/ui**, consume
la API unificada `/api/v1` de `agent-core` (ADR-0076/0077).

## Cómo corre

```bash
npm install
cp .env.example .env.local      # AGENT_CORE_API_URL=http://localhost:8000
npm run dev                     # http://localhost:3000
```

Requiere `agent-core` corriendo (por defecto en `http://localhost:8000`) con un
admin creado (`python scripts/init_db.py` en agent-core).

## Arquitectura

- **BFF**: el navegador nunca ve el token. `/app/api/session` hace login contra
  `POST /api/v1/auth/login` y guarda el token opaco en una cookie `httpOnly`
  (`panel_session`); `lib/api/server.ts` lo reenvía como `Authorization: Bearer`.
- **Tipos desde el contrato**: `lib/api/schema.d.ts` se genera del OpenAPI de
  agent-core (`scripts/api-types.mjs`). Por defecto lee `origin/develop:docs/openapi.json`
  de `../../../solvershub-backend` sin tocar su árbol de trabajo; `OPENAPI_PATH` apunta a
  otro archivo (es lo que hace `make api-types` con el OpenAPI recién exportado).
  ```bash
  npm run api:types          # regenera
  npm run api:types:check    # falla si hay deriva (lo corre el CI, HU-UI-04)
  ```
- **Tests**: `npm run test` (o `npm run test:coverage`, que deja el reporte en
  `coverage/`). Corren en el CI con cobertura. Las páginas principales se renderizan con
  respuestas de prueba (`lib/testing/fixtures.ts`) y axe no debe encontrar violaciones
  graves (`lib/a11y/paginas.test.tsx`).
- **Tokens de marca**: `app/tokens.css` es copia generada de
  `brand/tokens/tokens.css`. Sincronizar tras cambiar la paleta:
  ```bash
  (cd ../../brand/tokens && npm run build)
  npm run tokens:sync
  ```

## Panel clásico (`/legacy`) — transición sin pérdida

Mientras se reconstruyen las secciones que aún viven en el panel SSR de
agent-core (packs, **Probar asistente**, **Bandeja de fallos/DLQ**, **Plantillas**,
wizards de conexión), el sidebar las enlaza bajo `/legacy`.

`app/legacy/[...path]/route.ts` es un proxy que:

- reenvía `/legacy/<ruta>` → `agent-core/<ruta>` inyectando la **cookie de sesión**
  (`agent_core_session` ← token del panel) y el **tenant activo** (`ac_tenant` ←
  selección del panel): **misma sesión, sin segundo login**;
- reescribe en el HTML `href/src/action` y `fetch(...)` de `/admin`, `/static`,
  `/crm`, `/calendar` y `/cobranza` a `/legacy/...` (mismas reglas que el
  `PathPrefixMiddleware`, ADR-0073), y los `Location` de los redirects;
- propaga solo la cookie `ac_tenant`; no deja cookies huérfanas en este origen.

Los ítems del sidebar con **↗** abren el panel clásico. Se retiran cuando su
sección se reconstruya (fases finales).

## Estado de secciones

Todas las secciones usan el sistema de diseño (`DESIGN.md`): componentes de `ui/`
(sin dominio), widgets de `domain/`, piezas por sección en `app/(app)/<sección>/_components/`,
formatters únicos en `lib/format.ts` y tema claro/oscuro con toggle.

- **Resumen** (`/dashboard`) — KPIs, estado del agente/LLM, plan y recientes.
- **Leads** (`/leads`) — clientes con columnas que aportan los packs + búsqueda.
- **Conversaciones** (`/conversaciones`, `/conversaciones/[id]`) — lista con filtros
  y paginación, y detalle con el hilo de mensajes y **acciones**: responder como
  persona del equipo, pausar/reanudar el agente y resolver la conversación.
- **Escalaciones** (`/escalaciones`) — handoffs a humano con estado y enlace al hilo.
- **Habilidades** (`/habilidades`, `/habilidades/[id]`) — **activar/desactivar** el
  pack para el negocio (con confirmación: desactivar puede requerir plan para
  volver a habilitar), **reintentar** tras un error, y formulario generado desde el
  **JSON Schema** del plugin. Los secretos nunca salen del backend.
- **Costos LLM** (`/costos`) — gasto hoy/30 días, por modelo y por conversación;
  **costos de WhatsApp (Meta)**: por categoría/país, por número y la **discrepancia**
  webhook↔pricing; y el bloque de **sincronizar precios** y **verificar créditos**.
- **Plan y consumo** (`/plan`) — plan activo, barras de consumo, pagos, catálogo con
  **límites y prestaciones** por plan, y **suscribir** (abre el checkout).
- **Conexiones** (`/conexiones`) — canales del tenant (manual y Meta) + webhook del
  negocio, con **Agregar conexión** (catálogo + formulario desde el JSON Schema,
  secretos redactados) y **acciones**: **editar credenciales**, activar/desactivar,
  marcar principal y eliminar. Las conexiones de **Meta** también se activan,
  desactivan y eliminan desde aquí. Los tipos con asistente (wizard) enlazan al clásico.
- **Salud de Meta** (`/conexiones/meta`) — diagnóstico por conexión (checks, estado y
  **vencimiento del token**), **diagnosticar**, **re-suscribir la WABA**, marcar
  **facturación** y la tabla de **suscripciones de webhook** con registro por canal.
- **Números** (`/conexiones/meta/[id]/numeros`) — lista sincronizada con Meta,
  **agregar número** y **verificar** (enviar código por SMS/llamada y confirmarlo).
- **Plantillas** (`/conexiones/meta/[id]/plantillas`) — lista sincronizada, **sincronizar**
  y **eliminar** (todas las versiones). Crear/editar sigue enlazado al panel clásico.
- **WhatsApp Web** (`/conexiones/waweb`) — canal no oficial: **aceptar el aviso de riesgo**,
  **QR con polling** (se renueva solo) y **reiniciar el vínculo**.
- **Colaboradores** (`/colaboradores`) — cuentas, permisos por sección y negocios
  vinculados, con **alta** (incluye **roles por habilidad**, ADR-0066) y **acciones por
  cuenta**: activar/desactivar, restablecer contraseña, otorgar/revocar permiso y vincular.
- **Tenants** (`/tenants`) — gestión de plataforma (solo master): **alta de negocio**,
  búsqueda/paginación y **acciones por negocio** (suspender/activar, cambiar plan y
  eliminar con la frase `ELIMINAR <slug>`).
- **Comercio** (pack, `/comercio`) — dashboard, **productos** (alta/edición con variante
  e inventario), **categorías**, **promociones** (reglas JSON, vigencia y switch) y
  **pedidos** (estado). Consume la API del pack en `/api/v1/pack/commerce` (ADR-0079) con
  el proxy BFF genérico `/api/pack/[...path]`.
- **Calendario** (pack, `/calendario`) — estado de la conexión con Google (configurar
  credenciales con el formulario genérico, conectar por OAuth enlazado al clásico),
  **próximas citas** con cancelación y **tipos de cita** (alta/eliminar). API en
  `/api/v1/pack/calendar` (ADR-0079).
- **Cobranza** (pack, `/cobranza`) — **resumen** (7 KPIs), **gestores**, **carteras**,
  **cobros al propietario** (períodos + links de pago), **pagos de clientes**,
  **promesas** (con cambio de estado) y **reglas de
  negociación** (editable), **monitoreo IA** (actividad + últimas promesas),
  **alertas de acceso**, **auditoría** (con filtros por entidad/operación/fecha) y
  **dispositivos** (equipos, intentos y eventos de sync), **reportes** (consolidado por
  cartera + liquidaciones) y **propietario** (hilo de mensajes). API en
  `/api/v1/pack/cobranza`. Queda enlace al clásico para las acciones de escritura
  (generar cobro, marcar pago, aprobar dispositivo, enviar mensaje) y el detalle de
  cartera (caja, liquidaciones, inyecciones, gastos).
- **Configuración** (`/configuracion`) — pestañas **Identidad** (nombre, tono, persona,
  debounce, guardrails, escalamiento, **horario de atención**, kill-switch), **Cerebro**
  (modelos, temperatura, límites y presupuesto), **Memoria** (turnos de contexto y RAG)
  y **Habilidades** (herramientas on/off, límite por conversación y confirmación), y
  **Avanzado** (versiones del agente + rollback, proveedor LLM/BYOK, guardrails
  personalizados, flow de atención y evals).

**Tanda 6 (pendiente):** reconstrucción en Next de los **packs** (Cobranza, Comercio,
Calendario) y del **wizard de WhatsApp** (Embedded Signup/BYOK), que hoy se consumen
enlazados al panel clásico con sesión compartida (decisión: `agent-core/docs/adr/0078`).

El plan de pruebas completo está en [`../../PLAN-DE-PRUEBAS.md`](../../PLAN-DE-PRUEBAS.md).

> **Rutas del ecosistema**: los tipos de la API se generan desde el
> `docs/openapi.json` de `develop` de `../solvershub-backend` (`npm run api:types`) y el tema viene de
> `brand/tokens` (mismo repo). Ver la tabla de proyectos en el README raíz.
