# Plan de competencia y salida a producción — SolversHub

**Producto:** SolversHub · **Empresa:** Roshi — Centro de Inteligencia e Innovación
**Motor:** `agent-core` · **Landing:** `landing` · **APK cobranza:** `solvershub-apk`
**Fecha:** 2026-09-28 · **Fuentes:** matriz `estudio_mercado_agentes_ia.xlsx` + repos.

> Este documento responde a: qué nos falta para salir a producción y cómo competir.
> Es la salida del análisis de la matriz comparativa (14 competidores) contra el estado
> real de los cuatro repos. Convención: **P0** bloquea el go-live, **P1** bloquea el
> escalamiento, **P2** deseable.

---

## 1. Radiografía competitiva

Competidores analizados: **Lety.ai, Wati, Interakt, Visito AI, Respond.io, Messangi,
ClonAI, LiveConnect, Darwin AI, SleekFlow, Zendesk, Truora, Hubtype, Wolkvox**.

### 1.1 Lectura por eje

| Eje | Quién gana | Qué ofrece el mercado | SolversHub hoy |
|---|---|---|---|
| Canales | Respond.io, SleekFlow, Zendesk, Messangi, Lety | WhatsApp + IG + Messenger + Telegram + web + email + voz + SMS/RCS + TikTok | WhatsApp (núcleo BYOK) + IG/Messenger **solo entrantes**; web/email/voz no |
| Integraciones | Lety (900+ MCP), Zendesk (1.500 apps), SleekFlow/LiveConnect (100+) | Marketplace + CRMs + e-commerce + pagos + calendarios + Zapier/Make/n8n | 4 packs internos + MCP **pendiente (Sprint 5)** |
| Modelo agencia / white-label | **Lety** (subcuentas + marca propia), Messangi (CPaaS) | Revender IA bajo marca propia | No — plataforma directa al negocio |
| Pricing | Wati, LiveConnect, ClonAI | Suscripción + consumo; algunos opacos | Suscripción por plan + cuotas + Wompi; local en COP, transparente |
| Prueba gratuita | Wati, Interakt, Visito, Respond, SleekFlow, Zendesk, LiveConnect | Free/trial 7–14 días | 30 días (competitivo) |
| Demo | Lety, ClonAI, Visito | Demo/sandbox público | Demo en landing + agente WhatsApp (falta número) |
| Prueba social | Todos | Logos, reseñas, cifras | Oculta (`SHOW_SOCIAL_PROOF=false`); 0 clientes |
| Analítica / calidad | Zendesk, SleekFlow, LiveConnect | Analytics suite, CSAT, reportes | Panel de costos + conversaciones; sin dashboard de calidad |
| Voz | Respond.io, SleekFlow, Darwin, Zendesk, Messangi, Wolkvox | Llamadas con IA | No (v2) |
| Verticalización | ClonAI (restaurantes), Visito (hoteles), Truora (KYC), Darwin (ventas) | Nicho profundo | Horizontal + verticales iniciales + cobranza con APK |
| Enterprise / seguridad | Zendesk, Hubtype (ISO 27001), Messangi, Truora | Certificaciones, SLA, E2E | RLS real + BYOK + AES-GCM + DPA + SLOs (sin ISO) |
| CRM / inbox humano | Respond.io, SleekFlow, Zendesk, LiveConnect | Bandeja unificada + asignación | `/admin/conversaciones` con "Responder como humano" (básico) |
| Conocimiento / IA | Lety, SleekFlow | RAG, multi-agente, flow builders visuales | Memoria 3 capas; flujo por archivo, no editable en panel |

### 1.2 Posición de SolversHub

**Gana:** motor multi-tenant con RLS real, BYOK total (LLM + WhatsApp) con datos que no
entrenan modelos, costo por conversación auditable, guardrails determinísticos de acciones
terminales, precio local COP transparente, trial 30 días, onboarding objetivo <1 día, y un
vertical poco atendido (cobranza + APK offline-first).

**Pierde / no compite hoy:** canales (solo WhatsApp real), integraciones (MCP pendiente),
prueba social (0 clientes), analítica de calidad, presencia en redes (Fase 4 = 0%), legal
sin publicar, y no tiene play de agencia/white-label.

> **Nota de datos:** la hoja `Matriz Comparativa` no incluye **Wolkvox** (solo está en la
> hoja `Lista de Competidores`). Conviene agregar su columna.

---

## 2. Plan de requerimientos

### 2.1 Robustecimiento de arquitectura y producción (P0)

| ID | Requerimiento | Estado actual / evidencia | Aceptación |
|---|---|---|---|
| REQ-ARCH-01 | Dominio público estable con TLS para el webhook Meta | `BACKLOG.md` §Alta: solo dominio default HTTP `*.sslip.io`; 80/443 filtrados; túnel Tailscale con DNS caído | Webhook verificable por Meta en HTTPS/443 con dominio propio |
| REQ-ARCH-02 | Entorno de producción separado (Postgres/Redis/secretos dedicados) | `PRODUCCION-SOLVERSHUB.md` P0-4 pendiente | Tenant real en prod sin compartir credenciales con test |
| REQ-ARCH-03 | Backup con restauración probada + RPO decidido | `runbooks/backup-restore.md`; dump diario = RPO 24h vs SLO 15 min | Restauración documentada con evidencia; RPO coherente con el SLO |
| REQ-ARCH-04 | Endurecer panel: CSRF + rate limiting login + webhook fail-closed | `BACKLOG.md` §Media: sin `add_middleware`; firma opcional sin `app_secret` | Token CSRF en todos los POST; lockout; webhook rechaza sin firma |
| REQ-ARCH-05 | Procesamiento de media (audio/imagen) | `BACKLOG.md` §Media: `mod-media-processor` no existe | Ver §3 (REQ-MEDIA-01..07) |
| REQ-ARCH-06 | MCP por tenant con allowlist + circuit breaker + scopes (Sprint 5) | `ROADMAP.md` Sprint 5 sin hacer; deuda de `ToolContext` y `agentpkg.yaml` | Conectar MCP de un tenant sin código y sin fuga cross-tenant |
| REQ-ARCH-07 | Guardrails de runtime completos (pre-tool, post-gen, presupuesto, rate limit) | Sprint 5 pendiente; acciones terminales aún con regex de texto | Un turno no puede afirmar acción terminal sin que la tool haya corrido |
| REQ-ARCH-08 | Confiabilidad de cola: `XAUTOCLAIM` / consumer id único | `BACKLOG.md` §Baja: `CONSUMER="orchestrator-1"` hardcodeado | Ningún mensaje se pierde al reiniciar; multiconsumidor seguro |
| REQ-ARCH-09 | Observabilidad real: exporter OTLP + métricas webhook (p99) + status page | `BACKLOG.md` C4: gated por env; SLOs definidos pero no medidos | SLOs visibles y alerta al incumplir |
| REQ-ARCH-10 | Calidad del agente ≥95% en golden set del ICP (ambos verticales) | ~83% hoy; golden set `solvershub` 4/4 | Golden set ICP ≥15 escenarios (comercio + cobranza), pass ≥95%, `evals-nightly` 3 noches sin flakes |
| REQ-ARCH-11 | Alinear `ToolContext`/contratos y pricing LLM configurable | Deuda registrada (bump major + ADR); pricing hardcodeado | Contrato completo + pricing editable desde admin |
| REQ-ARCH-12 | Container no-root + mypy enforced + `Vector` configurable | `BACKLOG.md` §Media/§Baja | Docker sin root; `make lint` falla de verdad; dimensión de embedding configurable |
| REQ-ARCH-13 | Billing de producción: recurrente, prorrateo, overage | Diferido en `BILLING.md` §9 | Renovación sin fricción probada con un pago real |

### 2.2 Ajustes a requerimientos existentes (P1)

| ID | Ajuste | Por qué (competencia) |
|---|---|---|
| REQ-FIX-01 | Outbound IG/Messenger (el inbound ya existe) | Respond.io/SleekFlow/Lety envían por IG/Messenger |
| REQ-FIX-02 | Widget de chat web (canal `web` ya en `ChannelKind`) | Casi todos ofrecen chat web |
| REQ-FIX-03 | Editor de flujo en el panel (hoy `flow.json` por archivo) | Hubtype/SleekFlow tienen flow builder visual |
| REQ-FIX-04 | Bandeja unificada mejorada: asignación, SLA, filtros, búsqueda | Respond.io/SleekFlow/Zendesk venden "inbox" como core |
| REQ-FIX-05 | Catálogo de integraciones visible y honesto | Lety lidera con MCP; hay que mostrar el mapa real |
| REQ-FIX-06 | Planes: evaluar add-on por canal/consumo y tier agencia futuro | LiveConnect cobra $1/agente extra; Lety vende subcuentas |
| REQ-FIX-07 | Limpiar acoplamientos: `BASE_RULES` menciona CRM; tool de escalamiento prometida y no registrada | `BACKLOG.md` §Media |
| REQ-FIX-08 | Prompt caching Anthropic (breakpoint desperdiciado) | Costo/velocidad |
| REQ-FIX-09 | Dashboard de calidad por tenant (resolución sin humano, costo, CSAT) | Zendesk/SleekFlow lo venden |

### 2.3 Nuevos de alta prioridad para competir (P1)

| ID | Requerimiento | Referente de mercado |
|---|---|---|
| REQ-COMP-01 | Multi-canal completo: WhatsApp + IG + Messenger + web + email (voz v2) | Respond.io, SleekFlow, Zendesk |
| REQ-COMP-02 | MCP + marketplace: Google Calendar, HubSpot/Pipedrive/Zoho, Shopify/WooCommerce, Wompi/MercadoPago, Zapier/Make/n8n | Lety (900+), SleekFlow, LiveConnect (100+) |
| REQ-COMP-03 | Campañas salientes: plantillas aprobadas, mensajería masiva, opt-in | Interakt, Wati, ClonAI, LiveConnect |
| REQ-COMP-04 | Páginas de landing faltantes: Integraciones, Casos de uso, SEO por vertical | Todos tienen "Integrations"/"Industries" |
| REQ-COMP-05 | Prueba social real: testimonios, logo cloud, 2 casos de estudio | Todos la exhiben |
| REQ-COMP-06 | Reporte mensual automático por cliente (Sprint 5) | Zendesk/SleekFlow |
| REQ-COMP-07 | Demo pública interactiva + agente de prueba desde el hero | Lety, ClonAI |
| REQ-COMP-08 | Onboarding self-service (wizard guiado en panel) | Visito "setup en minutos", Wati |

### 2.4 Nuevos para tener "plus" (diferenciación)

| ID | Requerimiento | Diferenciador |
|---|---|---|
| REQ-PLUS-01 | "IA confiable": guardrails determinísticos + auditoría inmutable + cero alucinación de acciones | Nadie en la liga LATAM lo comunica |
| REQ-PLUS-02 | BYOK total + soberanía de datos (LLM, WhatsApp, embeddings; no entrena modelos) | Solo Lety se acerca |
| REQ-PLUS-03 | Transparencia de costo por conversación en el panel | Competidores cobran por consumo opaco |
| REQ-PLUS-04 | Vertical cobranza con APK offline-first (CobraIA) | Casi nadie lo tiene |
| REQ-PLUS-05 | Motor multi-tenant + habilidades activables ("se adapta sin forks") | Narrativa de plataforma, no de chatbot |
| REQ-PLUS-05b | Dejar el modelo de datos listo para jerarquía de sub-cuentas (agencia), sin implementar en v1 | Habilita el "agency play" futuro sin rediseño |
| REQ-PLUS-06 | Dogfooding: el propio agente de SolversHub atiende la landing | Caso de uso y demo en uno |
| REQ-PLUS-07 | Paquete de confianza (RLS + AES-GCM + DPA + SLOs) al precio LATAM | Zendesk/Hubtype lo cobran caro |
| REQ-PLUS-08 | Camino a ISO 27001 / evaluación de seguridad | Hubtype lo usa como argumento de venta |

### 2.5 Comercial, legal y marca para salir (P0/P1)

| ID | Requerimiento | Estado | Evidencia |
|---|---|---|---|
| REQ-GTM-01 | Legal revisado y publicado (razón social/NIT/domicilio) | Borradores; `⟨PENDIENTE⟩` | `legal/`, `PRODUCCION` P1-3 |
| REQ-GTM-02 | WhatsApp Business verificado + plantillas + opt-in | Pendiente | `README` Fase 4 |
| REQ-GTM-03 | Redes activas: LinkedIn (B2B) + Instagram (PyMEs), calendario 8 semanas | Fase 4 = 0% | `README` Fase 4 |
| REQ-GTM-04 | Activos de venta: deck, one-pager PDF, 2 casos, video 90 s | Pendiente | `PRODUCCION` §3 |
| REQ-GTM-05 | CRM de leads + SLA <5 min (que el agente responda) | Pendiente | `comercial/README` §8 |
| REQ-GTM-06 | Dominio final de SolversHub | Abierto (hoy `solvershub.site`) | `README` Fase 0 |
| REQ-GTM-07 | Fee de implementación definido | Abierto (1–3 meses de plan) | `README` Fase 0 |
| REQ-GTM-08 | SLOs publicados + status page | Definidos, no medidos | `security.md` |

---

## 3. Anexo — Port de multimodalidad de `agent-sale` a `agent-core`

Aclaración: en `agent-sale` la "voz" es **transcripción de notas de voz** (STT), no
llamadas telefónicas. Sí incluye **OCR/visión de imágenes**. Este anexo especifica el
port, ya que `agent-core` declara cuotas de media (`conversaciones_audio`,
`conversaciones_ocr`) y un gancho `_try_process_media`, pero **no tiene el procesador**.

### 3.1 Qué existe en `agent-sale` (verificado en código)

| Capacidad | Archivos | Cómo funciona |
|---|---|---|
| Transcripción de voz (STT) | `src/media/transcribirAudio.ts`, `resolveTranscriptionProvider.ts`, `transcriptionCatalog.ts` | Endpoint Whisper-compatible (OpenAI/Groq), `language=es`, timeout; devuelve `null` si no hay claridad (no lanza); BYOK + key de sistema |
| Visión / OCR (dispatcher) | `src/vision/callVisionModel.ts`, `index.ts`, `catalog.ts` | Multi-proveedor: Anthropic (Claude Sonnet vision), Gemini, DeepSeek; `resolveVisionProvider` (BYOK), `testVisionConfig` |
| OCR de comprobante | `src/payments/ocrComprobante.ts` | Extrae `{monto, cuenta_destino}` en JSON; nunca inventa: si no lee con certeza → `null` |
| Foto de producto | `src/domains/catalog/describirImagenProducto.ts` | Convierte la foto en descripción de texto → sigue el flujo normal |
| Clasificación imagen | `src/vision/clasificarImagenEntrante.ts` | Decide comprobante vs producto |
| Ruteo de ingesta | `src/orchestrator/mediaIngestion.ts`, `src/gateway/channels/meta/media.ts` | Descarga media de Meta → guarda → audio transcribe / imagen clasifica; rutas financieras sin pasar por el LLM conversacional |
| Idempotencia y almacenamiento | `src/shared/mediaResultCache.ts`, `src/shared/db/inboundMediaDirectory.ts` | Cache por `messageSid` (no re-paga en reintentos) + directorio de media entrante |

### 3.2 Adaptación necesaria (no es copiar/pegar)

- `agent-sale` **eliminó multi-tenancy** (migraciones 0035-0036): hay que re-agregar
  `tenant_id` + RLS + BYOK por tenant + claves de caché con tenant (evitar colisión
  cross-tenant, mismo riesgo ya visto en idempotencia).
- Reescritura a **Python/FastAPI** (el motor es Python; el dispatcher de visión debe
  integrarse con `BaseLLMProvider`/BYOK existentes).
- Los ganchos de cuota y métricas ya existen en `agent-core`; falta el procesador real.
- Las rutas financieras (comprobante) **no** deben pasar por el LLM conversacional.

### 3.3 Requerimientos derivados

| ID | Requerimiento | Prioridad | Origen / aceptación |
|---|---|---|---|
| REQ-MEDIA-01 | Descarga + almacenamiento de media entrante (tabla `inbound_media` con RLS) | P1 | Port `inboundMediaDirectory.ts` + `meta/media.ts` |
| REQ-MEDIA-02 | STT de notas de voz (Whisper-compatible, BYOK por tenant, `es`, timeout) | P1 | Port `transcribirAudio.ts`; una nota de voz se responde correctamente |
| REQ-MEDIA-03 | Dispatcher de visión (Anthropic/Gemini/DeepSeek) con resolución BYOK + prueba de conexión | P1 | Port `callVisionModel.ts`/`index.ts` |
| REQ-MEDIA-04 | OCR de comprobante `{monto, cuenta_destino}` sin inventar, validado contra reglas de negocio | P1 | Port `ocrComprobante.ts`; integra `pack_payments`/`pack_cobranza` |
| REQ-MEDIA-05 | Clasificación comprobante-vs-producto + descripción de producto → continúa como texto | P1 | Port `clasificarImagenEntrante.ts`/`describirImagenProducto.ts` |
| REQ-MEDIA-06 | Ruteo de ingesta en el consumer con idempotencia por mensaje y rutas financieras fuera del LLM | P1 | Port `mediaIngestion.ts` + `mediaResultCache.ts` |
| REQ-MEDIA-07 | Costo de STT/visión en `usage_ledger` + enforcement de cuotas de media | P1 | Panel muestra costo; cuota bloquea nueva unidad |
| REQ-MEDIA-08 | Voz en llamadas telefónicas (Twilio/ElevenLabs) | v2 | Diferido — no bloquea el go-live |

---

## 4. Secuencia de salida a producción

**Oleada 0 — "se puede vender y operar" (bloqueante, P0):** REQ-ARCH-01/02/03/04/05/08/10,
WhatsApp Business verificado, legal revisado, dominio final, facturación probada con pago
real. *Criterio:* un cliente real paga, su agente responde en producción, hay backup
restaurado y webhook estable.

**Oleada 1 — "se compite en la liga WhatsApp-LATAM":** REQ-FIX-01/02/03/09, REQ-COMP-03/04/07/08,
REQ-MEDIA-01..07, REQ-ARCH-06/07/09/11/13, REQ-GTM-03/04/05/08. *Criterio:* 3–5 clientes de
pago, canales IG+web, analítica de calidad, presencia en redes y media entrante operativa.

**Oleada 2 — "plus y escala":** REQ-COMP-01/02/05/06, REQ-PLUS-01..08, REQ-ARCH-12,
REQ-MEDIA-08. *Criterio:* diferenciación comunicada, marketplace MCP, casos de estudio,
opcional ISO y "agency play" habilitado.

---

## 5. Checklist "listo para lanzar"

```
legal publicado · WhatsApp verificado · dominio+TLS · prod separada · backup restaurado ·
panel con CSRF/rate-limit · webhook fail-closed · media (voz/OCR) operativa ·
calidad del agente ≥95% (comercio + cobranza) · evals estables · billing probado ·
SLOs medidos · 1 cliente de pago con onboarding <1 día · prueba social real ·
redes activas · facturación y soporte con SLA
```

---

## 6. Decisiones tomadas y pendientes

**Tomadas:**
- Competir como plataforma **directa ahora**, habilitar el modelo agencia/white-label en
  Oleada 2 (dejar el modelo de datos listo sin implementarlo).
- Lanzamiento con **ambos verticales en paralelo**: comercio/restaurantes + cobranza (APK).
- **Voz en llamadas fuera de v1**; **STT de notas de voz y OCR sí entran** (REQ-MEDIA).

**Pendientes (de negocio):**
- Dominio final de SolversHub (REQ-GTM-06).
- Fee de implementación (REQ-GTM-07).
- Razón social / NIT / domicilio para el legal (REQ-GTM-01).
- Decisión de tiers/consumo y posible tier agencia (REQ-FIX-06).

---

*SolversHub — Centro de soluciones impulsado con IA. Un producto de Roshi.*
