# Seguridad de SolversHub (agent-core)

*Documento público. Se entrega en el proceso de venta.*
**Producto:** SolversHub · **Empresa:** Roshi — Centro de Inteligencia e Innovación
**Versión:** 1.0 · **Fecha:** 2026-09-23

> Nomenclatura: `SolversHub` es el nombre comercial del producto; `agent-core` es el
> nombre interno del repositorio. Este documento describe el motor que opera SolversHub.

---

## Aislamiento entre clientes

SolversHub es **multi-tenant** con **Row Level Security (RLS) a nivel de base de datos**,
no solo a nivel de aplicación:

- Toda tabla de negocio lleva `tenant_id` y una política RLS que impide el acceso cruzado
  incluso ante un error de programación (ADR-0001).
- RLS con `FORCE` sobre todas las tablas: ni el dueño de la tabla puede saltarse la política
  (migración `0029_force_row_level_security.py`, ADR-0035).
- El tenant se fija por sesión (`app.tenant_id`) con `set_config`; el pool no comparte
  contexto entre clientes.
- Los tests de aislamiento multi-tenant corren en el gate de CI.

Modos de despliegue disponibles: **compartido** (pooled), **datos aislados** y
**infraestructura dedicada** para clientes que lo requieran.

## Cifrado

- **En tránsito:** TLS en todos los canales (webhooks, panel, APIs).
- **En reposo:** credenciales de cada cliente (tokens de Meta, claves de API de sus
  sistemas, llaves BYOK de LLM) cifradas con **AES-GCM** y rotación de claves (ADR-0027).
- **BYOK (Bring Your Own Key):** el cliente puede aportar su propia llave de LLM; se guarda
  cifrada y no se usa para otro tenant.
- No se almacenan datos de tarjeta: los pagos ocurren en el checkout hospedado del proveedor.

## Control de acceso

- Roles y permisos con **principio de menor privilegio** (RBAC por permisos de sección,
  ADR-0047) y colaboradores por tenant (ADR-0048).
- **Registro de auditoría** de toda acción administrativa: quién, qué, cuándo.
- El panel usa sesiones firmadas; el admin de plataforma (master) está separado del admin
  de tenant.

### Superficies públicas

Además del panel (sesión de admin), el motor expone un conjunto acotado de rutas
públicas, todas autenticadas por firma o secreto y con rate limit:

| Superficie | Autenticación | Notas |
|---|---|---|
| `POST /webhooks/whatsapp[/{slug}]` | Firma `X-Hub-Signature-256` (app_secret) | Entrada de mensajes de Meta |
| `/api/v1/…` | Sesión de admin (cookie `httpOnly` o `Authorization: Bearer`, token opaco revocable) | API del panel y las apps; tenant por `X-Tenant-Id` validado y RBAC por sección (ADR-0076/0077) |
| `POST /api/pack/pack_commerce/leads/{slug}` | Secreto **por tenant** (`X-Intake-Secret`) | Intake de leads desde landings (ADR-0057) |
| `/api/pack/<pack>/…` | El propio pack (firma/JWT/secreto) | Rutas públicas de packs (ADR-0057) |
| `GET /healthz` | Ninguna | Health check |

Ninguna ruta pública accede a datos de otros tenants: resuelven el tenant por `slug`
y operan dentro de `tenant_scope` (RLS).

## Tratamiento de datos

- Retención configurable por cliente; supresión a solicitud (ciclo de vida del tenant,
  incluido borrado físico tipo GDPR vía `tenant purge` con confirmación).
- **Los datos del cliente no se utilizan para entrenar modelos.**
- El contenido de mensajes, documentos y sistemas externos se trata **como dato, nunca como
  instrucción** para el agente (defensa contra prompt injection).
- Las acciones con efecto irreversible requieren confirmación explícita y, en pagos, las
  reglas de negocio se validan contra datos reales (no contra el texto del modelo).

### Subprocesadores

| Función | Proveedor | Nota |
|---|---|---|
| LLM (cerebro del agente) | Proveedor elegido por el cliente (DeepSeek / Anthropic / OpenAI u otro compatible) | Modo **BYOK**: la llave es del cliente |
| Canal WhatsApp | Meta (WhatsApp Cloud API) | Credenciales propias del cliente (BYOK) |
| Pagos | Wompi | Checkout hospedado; sin datos de tarjeta |
| Hosting | Infraestructura del despliegue (VPS/Coolify) | Entorno de producción separado de desarrollo |
| Observabilidad | OpenTelemetry (traza/costo por conversación) | Sin datos personales en trazas |

### Cumplimiento

- **Ley 1581 de 2012 (Colombia):** aviso de privacidad, rol de encargado del tratamiento y
  procedimiento de supresión.
- **GDPR:** disponible cuando aplique, vía ciclo de vida del tenant y borrado físico.
- **Políticas de WhatsApp/Meta:** plantillas aprobadas, registro de opt-in y respeto de la
  ventana de 24 h.

## Manejo de contenido no confiable

- Todo lo que viene de fuera (mensajes, webhooks, MCP externos, filas de base de datos) es
  **dato, no orden** (invariante #7).
- Guardrails de runtime: verificación de montos contra catálogo real, verificación de
  acciones terminales (no afirmar un cierre que no ocurrió), presupuesto por conversación y
  límite de llamadas a herramientas.
- **Kill-switch** por tenant y **escalamiento a humano** siempre disponible.

## Confiabilidad

| Métrica | Compromiso |
|---|---|
| Disponibilidad | 99,5 % mensual |
| p95 primera respuesta | < 6 s |
| Mensajes perdidos | 0 (cola con reintento e idempotencia 3 capas + bandeja de fallos) |
| RTO | < 4 h |
| RPO | < 15 min |

- **Backups** de base de datos con restauración probada y evidencia.
- **Canary + rollback** de versiones del agente en un paso (ADR-0016).
- **Auto-disable por tenant:** una falla de una habilidad para un cliente no afecta a los
  demás (ADR-0024).

## Reporte de vulnerabilidades

Escríbenos a **seguridad@roshi** (o el correo de contacto publicado). Respondemos en un
máximo de 72 h hábiles. No divulgamos detalles de un hallazgo hasta tener un plan de
remediación.

---

*SolversHub — Centro de soluciones impulsado con IA. Un producto de Roshi.*
