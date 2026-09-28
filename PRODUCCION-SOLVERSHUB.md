# Cierre a producción — SolversHub

**Producto:** SolversHub · **Empresa:** Roshi — Centro de Inteligencia e Innovación
**Motor:** `agent-core` · **Fecha:** 2026-09-23 · **Responsable:** equipo Roshi

Este es el tablero único para **cerrar SolversHub a producción**. Consolida los
pendientes del `../agent-core/docs/ROADMAP.md` (Sprints 5–6), la checklist de promoción (ADR-0035), la
seguridad (`security.md`) y el paquete comercial. Cada ítem tiene estado y criterio
de aceptación. No se marca `[x]` sin evidencia.

Leyenda: `[x]` hecho · `[~]` parcial · `[ ]` pendiente · `P0` bloquea la venta · `P1` bloquea el escalamiento.

---

## 0. Estado actual (ya hecho)

- [x] Multi-tenant con RLS + `FORCE` en todas las tablas (ADR-0001, ADR-0035).
- [x] `AgentSpec` v2 en BD, cero prompts en código (ADR-0014, ADR-0050).
- [x] Plugins/packs por `entry_points`, auto-disable **por tenant** (ADR-0019, ADR-0024).
- [x] WhatsApp BYOK end-to-end: firma, verify_token, alta, reconexión (ADR-0036–0044).
- [x] Memoria 3 capas (Redis + Postgres + pgvector).
- [x] Guardrails de montos y de acciones terminales (con límites conocidos, ver P0-2).
- [x] `usage_ledger` append-only + costo por conversación (ADR-0008).
- [x] Panel admin SSR, RBAC, colaboradores por tenant (ADR-0047/0048/0049).
- [x] Billing: planes, cuotas, enforcement y cobro Wompi (ADR-0045/0046, `../agent-core/docs/BILLING.md`).
- [x] Checklist de promoción con 9 checks reales (ADR-0035, `core/gateway/meta_production_readiness.py`).
- [x] Runbook de despliegue Coolify (`../agent-core/docs/despliegue-coolify.md`).
- [x] `security.md` público completo.

---

## 1. P0 — Bloqueantes de venta (código/calidad)

### P0-1 · Calidad del agente ≥ 95 % en el golden set del ICP
- [~] Hoy ~83 % (`../agent-core/docs/ROADMAP.md`, golden set CRM/comercio).
- [ ] Subir el golden set del vertical de lanzamiento (ventas por WhatsApp) a ≥95 %.
- [ ] Correr `evals-nightly` estable 3 noches seguidas sin flakes.
- **Aceptación:** `eval-runner` del tenant ICP con pass ≥95 %, evidencia en el PR.

### P0-2 · Reemplazar el guardrail de texto libre por precondiciones de datos
- [~] `crm_completion_check` (regex sobre texto) ya fue esquivado cambiando conjugación.
- [x] `confirmar_cotizacion` → `crear_pedido` ya usa precondición de datos (`Quote.status`).
- [ ] Extender el patrón a `generar_link_pago` y `escalate_to_human` (o el mecanismo
      `tool_choice`/corte de turno de `agent-sale`).
- **Aceptación:** un turno no puede "afirmar" una acción terminal sin que la tool haya corrido.

### P0-3 · Alta de un tercer cliente cronometrada
- [ ] Dar de alta un comercio real con `agent-core tenant create` + BYOK WhatsApp.
- [ ] Medir el tiempo total (meta: **< 1 día**).
- **Aceptación:** número cronometrado y documentado; si requiere código, es un pack incompleto.

### P0-4 · Producción separada de desarrollo
- [x] Invariante #9; entorno de test en Coolify.
- [ ] Provisionar entorno de **producción** con dominio propio, Postgres y Redis dedicados.
- [ ] Verificar que producción no comparte credenciales con test.
- **Aceptación:** un tenant real opera en el dominio de producción.

---

## 2. P1 — Operación, legal y seguridad

### P1-1 · Backups con restauración probada
- [x] Runbook creado: `runbooks/backup-restore.md`.
- [ ] Backup automático diario + retención definida + offsite.
- [ ] **Restaurar una vez** y documentar con evidencia (`runbooks/evidencia/`).
- [ ] Decidir RPO: hoy el dump diario da RPO 24 h, **no los 15 min prometidos**
      → activar WAL archiving/PITR o ajustar el SLO publicado (ver runbook §4).
- **Aceptación:** evidencia de una restauración real + RPO decidido.

### P1-2 · SLOs publicados y medidos
- [x] SLOs definidos en `security.md` (99,5 %, p95<6 s, RTO<4 h, RPO<15 min).
- [ ] Panel/status que los mida en vivo.
- [ ] Publicar en la página de estado.
- **Aceptación:** métrica visible y alerta al incumplir.

### P1-3 · Legal
- [x] Borradores creados en `legal/`: `legal/contrato-servicio.md` (MSA + orden),
      `legal/dpa.md`, `legal/aviso-privacidad.md`.
- [ ] Revisión por abogado y completar `⟨PENDIENTE⟩` (razón social, NIT, correos).
- [ ] Publicar el aviso de privacidad y registrarlo en el panel de Meta.
- [ ] Términos y condiciones del sitio (derivar del contrato de servicio).
- **Aceptación:** documentos firmables disponibles para el primer cliente empresarial.

### P1-4 · Seguridad operativa
- [ ] Pentest básico (o revisión externa) del panel y webhooks.
- [ ] Cuestionario de seguridad estándar respondido (para compras enterprise).
- [ ] Rotación de secretos y política de accesos documentada.
- **Aceptación:** paquete de seguridad listo para enviar a un comprador enterprise.

### P1-5 · Sprint 5 — Extensibilidad (habilita "añadir habilidades")
- [ ] Registro de servidores MCP por tenant con allowlist + circuit breaker.
- [ ] Guardrails de runtime completos (pre-tool, post-generación, presupuesto, rate limit).
- [ ] Reporte mensual automático por cliente.
- **Aceptación:** conectar el calendario/ERP de un cliente sin código nuevo.

---

## 3. Paquete comercial (Sprint 6)

- [ ] **SLOs publicados** (ver P1-2).
- [ ] **Dashboard de calidad visible para el cliente** (conversaciones, resolución sin humano, costo).
- [x] **Respuestas escritas a las 10 preguntas de venta** (ver §4).
- [x] **Kit de venta** base: `comercial/README.md` (oferta, ICP, objeciones,
      guion de descubrimiento, pipeline) + `comercial/roi-calculator.html`.
- [ ] **Onboarding cronometrado** por debajo de lo prometido (< 1 día, ver P0-3);
      runbook listo en `runbooks/onboarding-cliente.md`.
- [ ] **Kit de venta** faltante: deck, one-pager PDF, 2 casos de estudio, video demo 90 s.
- [ ] **Precios finales** publicados (base `../agent-core/docs/BILLING.md`) + fee de implementación.
- **Aceptación:** entrar a una reunión con un director de operaciones y responder con documentos.

---

## 4. Las 10 preguntas de venta (respuestas escritas)

> Completar cada una con una respuesta de máximo 3 frases, sin jerga. Se publican en el
> kit de venta y en la landing (sección FAQ).

1. **¿Qué hace exactamente?** — Un agente IA que atiende, vende y da seguimiento por
   WhatsApp, con panel de control y escalamiento a humano.
2. **¿Cuánto tarda en estar operativo?** — Días, no meses: alta por configuración + conexión
   de WhatsApp. Meta: < 1 día de trabajo de alta.
3. **¿Cuánto cuesta?** — Desde 200.000 COP/mes según plan (`../agent-core/docs/BILLING.md`); 30 días gratis.
4. **¿Qué pasa si el agente no sabe algo?** — Escala a un humano y aprende del caso; nunca
   inventa precios ni cierres.
5. **¿Es seguro con mis datos?** — RLS a nivel de base de datos, cifrado, BYOK, y tus datos
   no entrenan modelos (`security.md`).
6. **¿Puedo usar mi número de WhatsApp?** — Sí, conexión BYOK con tu propia cuenta de Meta.
7. **¿Se adapta a mi negocio?** — Sí: se configura la persona, el catálogo y las habilidades
   (ventas, cobranza, agendamiento, marketing) sin código.
8. **¿Qué pasa si quiero cambiar algo?** — Se ajusta desde el panel (configuración), sin
   reescribir software.
9. **¿Puedo ver qué hace y cuánto gasta?** — Sí: panel con conversaciones, métricas y costo
   LLM por conversación.
10. **¿Y si quiero cancelar?** — Sin permanencia; tus datos se exportan y se suprimen a
    solicitud.

---

## 5. Checklist de go-live (no se lanza sin todo `[x]`)

> Procedimientos paso a paso: `runbooks/go-live.md` (promoción),
> `runbooks/backup-restore.md` (respaldos), `runbooks/onboarding-cliente.md` (alta),
> `runbooks/incident-response.md` (incidentes).

- [ ] P0-1 calidad ≥95 %.
- [ ] P0-2 precondiciones de datos.
- [ ] P0-4 producción separada + dominio.
- [ ] P1-1 backup restaurado con evidencia.
- [ ] P1-3 legal firmable.
- [ ] Landing publicada con funnel y analytics funcionando.
- [ ] WhatsApp Business verificado + plantillas aprobadas + opt-in.
- [ ] Facturación Wompi probada con un pago real.
- [ ] Soporte con SLA y canal de contacto.
- [ ] Runbook de incidentes y on-call definido.

---

## 6. Plan de ejecución sugerido (6 semanas)

| Semana | Foco |
|---|---|
| 1 | P0-4 producción + P1-1 backups + cerrar landing (auditoría P0) |
| 2 | P0-1 calidad del agente + P0-2 guardrails |
| 3 | P1-3 legal + P1-4 seguridad + P0-3 alta cronometrada |
| 4 | Paquete comercial (kit de venta + 10 respuestas + dashboard de calidad) |
| 5 | Sprint 5 (MCP + guardrails de runtime) |
| 6 | Go-live: 3 clientes de pago + caso de estudio |

---

*SolversHub — Centro de soluciones impulsado con IA. Un producto de Roshi.*
