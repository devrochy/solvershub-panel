# Runbook — Go-live (promoción a producción)

**Objetivo:** promover un despliegue a producción con evidencia, no con fe.
**Dueño:** operaciones · **Se corre:** una vez por despliegue y en cada release mayor.

## 1. Precondiciones

- [ ] Entorno de **producción separado** de desarrollo (invariante #9).
- [ ] Dominio propio con TLS (Meta exige HTTPS/443 para el webhook).
- [ ] Secretos de producción cargados (distintos de los de dev).
- [ ] Postgres + Redis de producción con backup automático activo.
- [ ] `backup-restore.md` ejecutado al menos una vez con restauración probada.

## 2. Migraciones

```bash
docker exec agent-core-api agent-core db migrate
```

## 3. Checklist automática de promoción (9 checks reales)

Con las env vars **reales de producción** cargadas (Coolify las inyecta):

```bash
docker exec agent-core-api python scripts/verify_production.py --tenant-id <uuid-tenant>
```

Salida esperada: todos `[OK]`. Un `[?]` es "no configurado" (advertencia); un
`[X]` **bloquea el go-live**. Los checks (ADR-0035) cubren: handshake del
webhook, suscripciones de la app Meta, secreto de prod distinto de dev, llaves
configuradas, heartbeat del worker + DLQ, RLS forzado, tests de aislamiento,
fuga de secretos en plantillas y salud de conexiones por tenant.

## 4. Verificación funcional (humana)

- [ ] Un mensaje real de WhatsApp entra y recibe respuesta.
- [ ] Un pago de prueba por Wompi se aprueba y entrega el acceso.
- [ ] El panel `/admin` abre, y un admin de tenant ve **solo** sus datos.
- [ ] `/healthz` responde `{"status":"ok"}`.
- [ ] Los costos por conversación aparecen en el panel.

## 5. Checklist manual de go-live

Ver `../PRODUCCION-SOLVERSHUB.md` §5. No se lanza si algún `[ ]` queda sin marcar.

## 6. Post-deploy

- [ ] Canary: un tenant de bajo riesgo opera 24 h antes de abrir a todos (ADR-0016).
- [ ] Baseline de métricas anotado (conversaciones, resolución sin humano, costo/conversación).
- [ ] Rollback disponible: `agent-core agent rollback` (1 paso).
- [ ] Aviso al equipo y, si aplica, a los clientes.
