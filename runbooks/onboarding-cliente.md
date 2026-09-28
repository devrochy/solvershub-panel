# Runbook — Alta de un cliente (onboarding)

**Objetivo:** dejar a un cliente operando **en menos de 1 día**, 100% por configuración.
**Dueño:** operaciones/CS · **Métrica de negocio:** tiempo total de alta cronometrado.

> Si un paso exige **escribir código**, es un pack incompleto: anótalo en
> `../agent-core/docs/ROADMAP.md` (sección "deuda") y resuélvelo con configuración.

## 0. Prealta (antes de tocar el sistema)

Recoge del cliente:

- [ ] Nombre del negocio, a qué se dedica, tono (cercano/formal/divertido).
- [ ] Qué ofrece: productos/servicios **con precios** (catálogo).
- [ ] Horario, ubicación, teléfono, sitio/redes.
- [ ] Métodos de pago.
- [ ] Preguntas frecuentes (2–3) y qué **no** debe decir el agente.
- [ ] Cuándo escalar a un humano.
- [ ] Número de WhatsApp que usará (su propia cuenta Meta = BYOK).
- [ ] Vertical → packs a habilitar (ventas, agendamiento, cobros).

## 1. Alta del tenant

```bash
agent-core tenant create          # wizard: crea tenant + AgentSpec + admin + suscripción free (30 días)
agent-core tenant seed <slug>     # importa TENANTS_ROOT/<slug>/catalog.json
```

Alternativa por panel: `/admin/tenants/nuevo`.

- [ ] Tenant creado con `slug` correcto.
- [ ] `catalog.json` colocado en `TENANTS_ROOT/<slug>/` y sembrado.

## 2. WhatsApp (BYOK)

- [ ] El cliente crea su app en Meta y entrega token / app_secret / verify_token / phone_number_id.
- [ ] Conectar en el panel (`/admin/conexiones`): wizard de token + expiración.
- [ ] Webhook verificado (el check de handshake lo confirma).
- [ ] Mensaje de prueba real: entra y responde.

## 3. Configuración del agente

- [ ] `AgentSpec`: persona, tono, idioma, playbooks permitidos, packs habilitados.
- [ ] Reglas de negocio: mínimo de pago en línea, umbrales de escalamiento, kill-switch.
- [ ] Packs: activar y configurar (catálogo, pagos, calendario).
- [ ] Base de conocimiento / playbooks específicos (override por tenant, ADR-0026).

## 4. Pruebas de aceptación (con el cliente)

- [ ] 10 conversaciones de prueba cubriendo: consulta de precio, cotización, pedido, pago, escalamiento.
- [ ] El agente **no inventa** precios ni afirma cierres que no ocurrieron (guardrails).
- [ ] El escalamiento a humano funciona y llega al canal correcto.
- [ ] Costos por conversación visibles en el panel.

## 5. Cierre

- [ ] Capacitación al cliente (panel: conversaciones, métricas, costos, pausar el bot).
- [ ] Plan y facturación confirmados (arranca el trial de 30 días).
- [ ] Contacto de soporte entregado + SLA por plan.
- [ ] **Cronometrar** el tiempo total de alta y registrarlo aquí: `⟨fecha — horas totales⟩`.

## 6. Seguimiento

- [ ] Día 3: revisar conversaciones reales y ajustar.
- [ ] Día 7: primer reporte de métricas al cliente.
- [ ] Día 25: aviso de fin de trial y oferta de plan.
