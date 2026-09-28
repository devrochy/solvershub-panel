# Runbooks de operación — SolversHub

Procedimientos operativos de producción. Cada runbook es un paso a paso que
**cualquiera del equipo puede seguir sin conocimiento previo del código**.

| Runbook | Cuándo usarlo |
|---|---|
| [backup-restore.md](backup-restore.md) | Respaldar y **restaurar** la base de datos y los artefactos de tenants |
| [go-live.md](go-live.md) | Promover un despliegue a producción (checklist + `verify_production.py`) |
| [onboarding-cliente.md](onboarding-cliente.md) | Dar de alta a un cliente nuevo (meta: < 1 día) |
| [incident-response.md](incident-response.md) | Algo se cayó, un tenant dejó de responder o se filtró un error |

Contexto relacionado:
- Despliegue en Coolify: `../../agent-core/docs/despliegue-coolify.md`
- Seguridad y SLOs: `../security.md`
- Estado del cierre a producción: `../PRODUCCION-SOLVERSHUB.md`

> Regla de oro: **producción nunca corre en la máquina de desarrollo**
> (invariante #9 de `../agent-core/CLAUDE.md`). Todo lo de estos runbooks se ejecuta en el
> entorno de producción.
