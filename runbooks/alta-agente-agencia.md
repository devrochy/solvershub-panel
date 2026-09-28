# Runbook — Alta del agente interno de la agencia (tenant `solvershub`)

**Producto:** SolversHub · **Motor:** `agent-core` · **Fecha:** 2026-09-23
**Objetivo:** el agente que atiende el CTA de WhatsApp y el formulario de la landing,
como asistente de **ventas + agendamiento + cobranza** de SolversHub.

> Los artefactos del tenant viven en `agent-core/tenants/solvershub/` (gitignored, por
> despliegue). Este runbook es la fuente de verdad reproducible: si se recrea el entorno,
> se vuelve a aplicar.

---

## 1. Estado actual (hecho)

- [x] Tenant `solvershub` creado y `active`.
  - id: `d6f4a99d-2ad0-4dcf-87d0-7174d880e043`
- [x] Plan `empresarial` (interno, ilimitado; acción de master auditada en `audit_log`).
- [x] `pack_commerce` (ventas / CRM / leads) activo. El plan `free` solo permite 1 pack de
      negocio; por eso el resto entra cuando haya credenciales.
- [x] Voz de marca cargada en `AppSettings.brand_voice` con planes, precios, políticas y
      reglas de escalamiento (ver `tenants/solvershub/docs/voz-de-marca.md`).
- [x] Playbooks del tenant (override por filesystem, ADR-0026) en
      `tenants/solvershub/playbooks/` (`ventas.md`, `seguimiento.md`).
- [x] Golden set en `tenants/solvershub/evals/` (4 escenarios) — **4/4 en verde**, estable
      en dos corridas consecutivas.
- [x] `flow.json` sembrado (4 secciones de `pack_commerce`).

## 2. Verificación

```bash
cd agent-core
.venv/bin/agent-core tenant list | grep solvershub
.venv/bin/python evals/runner.py --tenant solvershub        # esperado: 4/4
```

## 3. Pendientes (requieren credenciales o producto)

1. **WhatsApp BYOK** (bloquea el go-live del canal):
   - Conectar en `/admin/conexiones` con las credenciales de la WABA de la agencia
     (`phone_number_id`, `app_secret`, `access_token`, `verify_token`).
   - Registrar el webhook en Meta: `.venv/bin/agent-core tenant webhook solvershub`.
2. **Agendamiento (`pack_calendar`)** — requiere OAuth2 de Google Cloud
   (`client_id`, `client_secret`). Hasta entonces NO activar el pack (su config lo exige).
3. **Cobranza (`pack_payments`)** — requiere credenciales de Wompi
   (`public_key`, `private_key`, `events_secret`).
4. **Ampliar el golden set** a ≥15 escenarios (objeción de precio, agendamiento, cobranza,
   prompt injection) y correr `evals-nightly` 3 noches sin flakes (P0-1).
5. **Canary 5% → 24 h → 100%** antes de exponerlo al público (ADR-0016).

> Al activar `pack_calendar` o `pack_payments`, actualizar `AgentSpec.packs` (hoy
> `["pack_commerce"]`) y volver a exportar `tenants/solvershub/evals/spec.json`.

## 4. Reproducir desde cero (comandos)

```bash
cd agent-core
# 1) Alta del tenant (sin packs con credenciales)
.venv/bin/agent-core tenant create --non-interactive \
  --name "SolversHub" --slug solvershub \
  --business "Agencia de agentes IA de Roshi..." \
  --language es --tone cercano --packs pack_commerce

# 2) Voz de marca + plan interno + spec packs (script en el historial de la sesión)
#    → tenants/solvershub/docs/voz-de-marca.md es el contenido a cargar en brand_voice.

# 3) Playbooks y golden set: ya versionados en este runbook (tenants/solvershub/).

# 4) Verificación
.venv/bin/python evals/runner.py --tenant solvershub
```

## 5. Integración con la landing

- **CTA WhatsApp:** `NEXT_PUBLIC_WHATSAPP_NUMBER` = número de la WABA de la agencia
  (formato E.164 sin `+`). Si está vacío, la landing oculta el CTA (no rompe).
- **Formulario:** `POST /api/leads` en la landing → intake al tenant (ver ADR pendiente).
- **Panel:** los leads quedan visibles en `/admin/conversaciones` y `/admin/packs/.../leads`.
