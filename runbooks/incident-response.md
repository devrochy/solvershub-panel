# Runbook — Respuesta a incidentes

**Objetivo:** detectar, contener, resolver y aprender — sin pánico y sin pérdida de datos.
**Dueño:** operaciones · **On-call:** una persona designada por semana.

## 1. Severidades

| Sev | Qué es | Respuesta | Comunicación |
|---|---|---|---|
| **S1** | Plataforma caída, o pérdida/fuga de datos, o pagos incorrectos | Inmediata, 24/7 | Cliente afectado + interno en < 1 h |
| **S2** | Un tenant no responde, o una habilidad (pack) falla | < 2 h hábiles | Cliente afectado |
| **S3** | Degradación menor (latencia, un flujo raro) | Mismo día | Interno |

## 2. Primeros 10 minutos (S1/S2)

1. **Confirma el alcance:** ¿todos los tenants o uno? ¿solo un canal? ¿solo una habilidad?
2. **Revisa lo básico:**
   ```bash
   curl -fsS https://<dominio-produccion>/healthz
   docker ps            # ¿core-api, celery-worker, celery-beat, postgres, redis arriba?
   ```
3. **Kill-switch por tenant** (si el problema es el agente de un cliente):
   pausa el bot desde `/admin/configuracion` — detiene respuestas sin borrar datos.
4. **Auto-disable por tenant** (ADR-0024): si un pack falla para un cliente, solo
   ese cliente pierde la habilidad; los demás siguen. Reactivar desde `/admin/plugins`.
5. **DLQ:** revisa la bandeja de fallos; reprocesa tras resolver la causa.

## 3. Árbol de decisión

- **¿No responde nadie (todos los tenants)?** → infra: procesos caídos, Postgres/Redis
  caídos, o webhook sin verificar. Revisa `docker ps`, logs de `core-api`, handshake.
- **¿Un tenant no responde?** → conexión WhatsApp (token expirado/desconectado),
  billing vencido (enforcement corta al vencer el trial), o kill-switch activo.
- **¿El agente dice cosas raras / inventa?** → activa kill-switch, revisa `AgentSpec`
  y playbooks; el guardrail de montos/acciones terminales debería haber bloqueado.
- **¿Pago aprobado y no se entregó?** → revisa el webhook de Wompi (firma + idempotencia)
  y la cola de salida.
- **¿Sospecha de fuga de datos?** → S1: contiene (revoca credenciales), preserva
  evidencia (`audit_log`), escala a seguridad, no borres nada.

## 4. Comunicación

- Cliente: qué pasó, qué se hizo, qué falta, cuándo el próximo aviso. Sin jerga.
- Interno: un hilo único por incidente con hora de inicio, acciones y estado.
- Si hubo datos personales comprometidos: evaluar deber de notificación (Ley 1581).

## 5. Resolución

- Aplica el fix mínimo seguro; si es código, pasa por el flujo normal (`ruff` + `pytest`
  + `auditor-multitenant` si toca multi-tenant).
- Verifica con `python scripts/verify_production.py --tenant-id <uuid>`.
- Reactiva lo que hayas pausado (kill-switch, packs).

## 6. Post-mortem (obligatorio para S1, recomendado para S2)

Documento corto en `evidencia/incidente-AAAA-MM-DD.md`:

- Línea de tiempo (detección → resolución).
- Causa raíz (los 5 porqués).
- Impacto (tenants, tiempo, datos).
- Acciones preventivas con dueño y fecha.
- **Sin culpas:** el objetivo es el sistema, no la persona.
