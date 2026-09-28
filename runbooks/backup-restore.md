# Runbook — Backup y restauración

**Objetivo:** poder restaurar la plataforma ante pérdida de datos, con evidencia.
**Dueño:** operaciones · **Frecuencia:** backup diario automático; restauración de prueba **trimestral**.

## 1. Qué se respalda

| Recurso | Dónde vive | Crítico |
|---|---|---|
| Base de datos `agent_core` (negocio + RLS + suscripciones) | contenedor Postgres (`pgdata`) | Sí |
| Artefactos de tenants (`TENANTS_ROOT/<slug>/`) | filesystem del host | Sí |
| Secretos de despliegue (`.env`: llaves Meta, Wompi billing, claves de cifrado) | gestor de secretos / `.env` del host | Sí |
| Código | GitHub (`devrochy/agent-core`) | Ya versionado |

> Las credenciales BYOK de cada tenant (Meta, LLM, Wompi) viven **cifradas en la
> base de datos** (ADR-0027). Si se pierde la clave de cifrado del despliegue,
> esas credenciales no se pueden descifrar: **respalda la clave junto con el `.env`.**

## 2. Backup

### 2.1 Base de datos (dump lógico comprimido)

```bash
# En el host de producción (Coolify). Ajusta usuario/base/entorno.
STAMP=$(date +%F_%H%M)
docker exec agent-core-postgres \
  pg_dump -U agent_core -Fc agent_core > /srv/backups/agent_core_${STAMP}.dump
```

Verifica que el archivo no esté vacío y que `pg_restore -l` lo liste:

```bash
ls -lh /srv/backups/agent_core_${STAMP}.dump
pg_restore -l /srv/backups/agent_core_${STAMP}.dump | head
```

### 2.2 Artefactos de tenants

```bash
tar czf /srv/backups/tenants_${STAMP}.tar.gz -C "$TENANTS_ROOT" .
```

### 2.3 Secretos

Copia el `.env` (o exporta del gestor de secretos) a un lugar cifrado. **Nunca** a git.

### 2.4 Automatización y retención

- Cron diario 03:00 (hora local del host).
- Retención: **diario 7 · semanal 4 · mensual 12**.
- **Offsite obligatorio** (S3/Backblaze/equivalente), cifrado en reposo.
- Alerta si un backup no se generó o pesa menos de lo esperado.

## 3. Restauración

### 3.1 Base de datos

```bash
# 1. Detén la app y el worker para evitar escrituras durante la restauración.
#    (en Coolify: pausa los servicios core-api, celery-worker, celery-beat)

# 2. Restaura sobre la base existente (limpia y recrea objetos).
docker exec -i agent-core-postgres \
  pg_restore -U agent_core -d agent_core --clean --if-exists < /srv/backups/agent_core_AAAA-MM-DD.dump

# 3. Verifica migraciones al día.
docker exec agent-core-api agent-core db migrate

# 4. Reactiva los servicios y comprueba salud.
curl -fsS https://<dominio-produccion>/healthz   # {"status":"ok"}
```

### 3.2 Artefactos de tenants

```bash
tar xzf /srv/backups/tenants_AAAA-MM-DD.tar.gz -C "$TENANTS_ROOT"
```

### 3.3 Verificación post-restauración

- [ ] `/healthz` responde `ok`.
- [ ] Un tenant de prueba recibe y responde un mensaje de WhatsApp.
- [ ] El panel abre y muestra conversaciones recientes.
- [ ] `python scripts/verify_production.py --tenant-id <uuid>` en verde.
- [ ] Conteo de filas de negocio coherente (sin pérdida visible).

## 4. RPO/RTO — estado real

| Métrica | Compromiso (`../security.md`) | Con este runbook | Para cumplirlo hace falta |
|---|---|---|---|
| RPO | < 15 min | **Hasta 24 h** (dump diario) | WAL archiving continuo **o** Postgres gestionado con PITR |
| RTO | < 4 h | ~1–2 h | Este runbook + backup offsite accesible |

> **Decisión pendiente:** el RPO de 15 min **no se cumple con dump diario**. Dos
> caminos: (a) activar archivado de WAL en el Postgres del despliegue, o
> (b) migrar a un Postgres gestionado con point-in-time recovery. Hasta
> entonces, ajustar el SLO publicado a RPO ≤ 24 h (honestidad ante el cliente).

## 5. Evidencia

Cada restauración de prueba deja registro en `evidencia/`:
fecha, quién, backup usado, tiempo total, resultado. **La primera restauración
de prueba es un bloqueante de go-live** (ver `../PRODUCCION-SOLVERSHUB.md`, P1-1).
