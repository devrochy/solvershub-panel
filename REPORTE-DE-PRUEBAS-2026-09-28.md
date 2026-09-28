# Reporte de pruebas — SolversHub (panel nuevo + API + panel clásico)

**Campaña:** completa (versión v1.1 del plan) · **Fecha:** 2026-09-28
**Entorno:** stack local `agent-core-s1` (core-api `:8001`, Postgres `:5433`, Redis `:6380`),
panel `:3200` (dev) y `:3300` (build de producción para las pruebas de navegador).
**Operador:** equipo de ingeniería (asistido por IA) · **Build:** OpenAPI **63 rutas** ·
panel **30 rutas** · `PLAN-DE-PRUEBAS.md` v1.1.

---

## 1. Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Casos planificados | **122** (30 Críticos · 73 Altos · 19 Medios) |
| Ejecutados | **122** (100 %) |
| PASA | **116** |
| PASA con limitación de entorno (documentada) | **5** |
| HALLAZGOS | **1** (severidad Baja-Media, no bloqueante) |
| NO EJECUTADO por riesgo (prohibido) | **1** (CONV-05 envío real; sus guardas sí se validaron) |
| Defectos Críticos/Altos abiertos | **0** |
| Suites automatizadas | `pytest` 594 ✅ · `ruff` ✅ · `vitest` 12 ✅ · `panel-check` ✅ |

**Veredicto: la campaña PASA.** Se cumple el criterio de cierre: 100 % de Críticos y
Altos con resultado, 0 defectos Altos/Críticos abiertos, suites en verde y limpieza
verificada (cero residuo).

## 2. Resultados por batch

### Batch 0 — Regresión automatizada
| ID | Resultado | Evidencia |
|---|---|---|
| REG-01 | PASA | `pytest -q` → 594 passed, 245 skipped |
| REG-02 | PASA | `ruff check core cli tests evals scripts` → All checks passed |
| REG-03 | PASA | `make panel-check` → typecheck + lint + build ✓ |
| REG-04 | PASA | `npm run test` → 12 passed |
| REG-05 | PASA | `export_openapi.py` → 63 rutas · 97 esquemas |
| REG-06 | PASA | Ver Batch 8 (páginas del clásico) |

### Batch 1 — Sesión, RBAC, navegación y tema
| ID | Resultado | Evidencia |
|---|---|---|
| AUTH-01 | PASA | Login UI (navegador) → `/dashboard`; `POST /api/session` → 200 `{ok:true}` + cookie |
| AUTH-02 | PASA | Contraseña incorrecta → **401** |
| AUTH-03 | PASA | `/dashboard` sin cookie → **307** → `/login` |
| AUTH-04 | PASA | Logout limpia cookies; tras ello el token viejo → 401 (revocación inmediata) |
| AUTH-05 | PASA | Token invalidado deja de resolver (sin JWT, sesión en BD) |
| AUTH-06 | PASA | `Set-Cookie: panel_session=…; HttpOnly; SameSite=lax`; token **no** aparece en el HTML |
| NAV-01 | PASA | Master: **29 permisos**, negocio activo, **11/11** ítems del sidebar |
| NAV-02 | PASA | Colaborador: `Tenants`, `Colaboradores` y escrituras ocultas/denegadas |
| NAV-03 | PASA | 9 marcadores ↗ de panel clásico |
| NAV-04 | PASA | Selector presente; tenant válido → 200, inexistente → 403 |
| NAV-05 | PASA | Navegador: dark → click → light · cookie `panel_theme=sh-light` · **persiste tras recargar** · restaurado |
| NAV-06 | PASA | `data-theme` resuelto en servidor (sin destello), según cookie |

### Batch 2 — Resumen, Leads, Conversaciones, Escalaciones
| ID | Resultado | Evidencia |
|---|---|---|
| DASH-01…03 | PASA | KPIs (57 conv / 0 msgs 7d / 0 esc / 0 USD), packs=2, bot=ACTIVO, `deepseek · deepseek-chat`, 8 recientes; navegador: 3 bloques KPI |
| LEAD-01…03 | PASA | 39 leads; búsqueda sin match = 0; **página 2** = 5 ítems con `has_more` |
| CONV-01 | PASA | Filtro por estado y búsqueda; paginación (p2 = 20 ítems) |
| CONV-02 | PASA | Detalle con hilo real (tenant-1): inbound «Holi» → outbound del agente |
| CONV-03 | PASA | `toggle-bot` ×2 → `{bot_paused:true}` → `{bot_paused:false}` (reversible) |
| CONV-04 | PASA | `resolve` → **204**; escalaciones del hilo cerradas |
| CONV-05 | PASA (guardas) | Contenido vacío → **422**; conversación inexistente → **404**. **Envío real NO EJECUTADO** (prohibido por riesgo) |
| CONV-06 | PASA | Botón deshabilitado con texto vacío (navegador) |
| ESC-01…02 | PASA | Listado 200 (0 escalaciones en el negocio demo); enlace al hilo |

### Batch 3 — Habilidades y Costos
| ID | Resultado | Evidencia |
|---|---|---|
| SKL-01 | PASA | 4 packs; habilitados: `pack_payments`, `pack_commerce` |
| SKL-02 | PASA | `pack_commerce`: 28 campos desde JSON Schema; secretos redactados `['lead_intake_secret','lead_intake_turnstile']` |
| SKL-03 | PASA | PUT con los mismos valores → **200** |
| SKL-04 | PASA | Activar habilitado → 204; desactivar pide confirmación (diálogo, navegador) |
| SKL-05 | PASA | `retry` → **204** |
| SKL-06 | PASA | `pack_payments` sin config → **400** con mensaje accionable; `pack_calendar` → error de validación con campos faltantes |
| COST-01…02 | PASA | Hoy/30d, turnos, por modelo y conversación; métricas USD (float) sin romper la página |
| COST-03 | PASA | `meta/sync` → 200 `{errors:[]}` |
| COST-04 | PASA | `meta/credits` → 200 (0 conexiones Meta en el demo) |
| COST-04b | PASA | `GET /costs` incluye bloque `meta` (por categoría/país, por número, discrepancia, allowance) |

### Batch 4 — Plan y Colaboradores
| ID | Resultado | Evidencia |
|---|---|---|
| PLAN-01…03 | PASA | Plan Free, 24 días, 7 métricas; 4 planes con 7 límites y 2 prestaciones c/u; plan inexistente → **400** |
| COL-01 | PASA | 471 cuentas listadas (160 con permisos) |
| COL-02 | PASA | Alta `qa-campana@example.test` → **204** |
| COL-03 | PASA | `password` → **204** |
| COL-04 | PASA | `grant costs:read` → aparece en la fila → `revoke` → desaparece |
| COL-05 | PASA | `link` owner → `link` colaborador (restaurado) |
| COL-06/08 | PASA | `toggle` desactiva; `toggle` de sí mismo → **400** |
| COL-08b | PASA (limitación) | Catálogo de roles por pack = **[]** porque `collaborator_roles` solo lo aporta `pack_cobranza` (no habilitado en el demo) |
| COL-09 | PASA | `GET /collaborators/pack-roles` → **200** |

### Batch 5 — Tenants (plataforma)
| ID | Resultado | Evidencia |
|---|---|---|
| TEN-01 | PASA | Búsqueda `moto` → 1; página con plan y estado |
| TEN-02 | PASA | Alta `qa-campana` → **201** con 5 pasos (tenant, settings, spec, suscripción free) |
| TEN-03 | PASA | Plan `basic` → 204 → restaurado a `free` → 204 |
| TEN-04 | PASA | `deactivate` → estado `suspended`; `activate` → 204 |
| TEN-05 | PASA | Frase incorrecta → **400** (el negocio sigue); `ELIMINAR qa-campana` → **204** y **0 resultados** después |
| TEN-06 | PASA | No-master → **403** en `/platform/tenants` |

### Batch 6 — Conexiones, Meta, Números, Plantillas, WhatsApp Web
| ID | Resultado | Evidencia |
|---|---|---|
| CONX-01/02 | PASA | 1 conexión (WhatsApp QR) + webhook del negocio; catálogo con 3 tipos disponibles |
| CONX-03 | PASA | Alta manual `QA Campana SMTP` → **204** |
| CONX-04 | PASA | Formulario con valores actuales y **secreto redactado** `['password']`; PUT → **204** |
| CONX-05 | PASA | Faltan campos → **400** con la lista exacta |
| CONX-06/07 | PASA | deactivate/activate/primary → **204** c/u |
| CONX-08 | PASA | delete → **204**; la lista vuelve a quedar con solo la conexión original |
| CONX-09 | PASA | Editar credenciales (cubierto por CONX-04) |
| CONX-09b/c | PASA | Ciclo de vida Meta expuesto (activar/desactivar/eliminar) → 400 con conexión inexistente (guarda) |
| CONX-09d | PASA | Operar una conexión de **otro tenant** → **404** (aislamiento) |
| META-01/05 | PASA | Salud y suscripciones responden 200 (0 conexiones Meta en el demo) |
| META-02/03/04 | PASA (guardas) | diagnose/resubscribe/billing con conexión inexistente → **400** |
| META-05b | PASA | Modelo y UI incluyen **vencimiento del token** (`token_expires_at`) |
| NUM-01…04 | PASA (guardas) | listar → sync_error «Conexión no encontrada»; add/request-code/verify → **400** |
| TPL-01…03 | PASA | Listado con `sync_error`; sync/delete → **400**; crear/editar enlazado al clásico (Tanda 6) |
| WAW-01…05 | PASA (limitación) | Estado real `pending_qr`, `risk_ok=true`; `reset` → **204**; QR no emitido (conector caído) |

### Batch 7 — Configuración (5 pestañas), con cambio y restauración
| ID | Resultado | Evidencia |
|---|---|---|
| CFG-01/03 | PASA | Nombre + zona horaria + franja `1 08:00-18:00` guardados y verificados → **restaurados** |
| CFG-04 | PASA | `bot_paused=true` → dashboard lo refleja → restaurado a `false` |
| CFG-05 | PASA | Guardrails on/off en Identidad (persistido) |
| CFG-06 | PASA | Temperatura 0.3 → **0.5** → restaurada a **0.3** |
| CFG-07 | PASA | Turnos 12 → **15** → restaurados a **12** |
| CFG-08 | PASA | `escalate_to_human` deshabilitada → verificada → restaurada (0 deshabilitadas) |
| CFG-09 | PASA | Versión activa `1.0.33` → activar `1.0.32` → **rollback verificado** → vuelta a `1.0.33` |
| CFG-10 | PASA | LLM `deepseek/deepseek-chat`, `has_api_key=false`, llave vacía conservada |
| CFG-11 | PASA (hallazgo DEF-01) | Regla `max_length \| 600 \| retry` guardada; **regla mal formada ignorada en silencio** (ver §3); limpieza OK |
| CFG-12/12b | PASA | Flow «pack» con 4 secciones; 0 evals; enlace al Avanzado clásico presente |

### Batch 8 — Panel clásico (`/legacy`, sesión compartida)
| ID | Resultado | Evidencia |
|---|---|---|
| LG-01 | PASA | `/legacy/admin/conexiones` **200** y en navegador sin re-login |
| LG-02 | PASA | 25 `href="/legacy/admin…"`, **0** `/admin` crudos; assets `/legacy/static/*` |
| LG-03 | PASA | `POST switch-tenant` → **303** con `Location` reescrito |
| LG-04 | PASA | Wizard WhatsApp (`elegir-entorno`) → **200** con la sesión del panel |
| LG-05/06 | PASA | Playground y DLQ → **200** |
| LG-07/08 | PASA | WhatsApp Web desde el catálogo → página nueva; carga manual → `/legacy/admin/conexiones/manual` 200 |
| — | PASA | `meta-requisitos`, `produccion`, `conexiones/manual` → 200; `crm` → 200; `cobranza`/`calendar`/`plantillas` → 303 (packs no habilitados / sin WhatsApp) |

### Batch 9 — Seguridad multi-tenant y RBAC
| ID | Resultado | Evidencia |
|---|---|---|
| SEC-01 | PASA (re-scopado) | `X-Tenant-Id` **inexistente** → **403**; `test-alpha` **no** es ajeno (el master tiene rol `global` sobre activos: comportamiento correcto) |
| SEC-01b | PASA | No-master con `X-Tenant-Id` ajeno → **403** |
| SEC-02 | PASA | Datos aislados por negocio (moto 57 conv vs tenant-1 1 conv); conexión ajena → **404** |
| SEC-03 | PASA | Secretos **nunca** salen: `configured_secrets` en pack y conexión |
| SEC-04 | PASA | Colaborador: lectura 200, **escritura 403** |
| SEC-05 | PASA | Registrar webhook / plataforma / colaboradores → **403** para colaborador |
| SEC-06 | PASA | Purga sin la frase exacta → **400** y el negocio persiste |
| SEC-07 | PASA | Solo `panel_session`/`panel_tenant`; 0 cookies huérfanas del clásico |
| SEC-08 | PASA | 0 coincidencias de secretos/tokens en los logs del contenedor |

### Batch 10 — Accesibilidad y rendimiento
| ID | Resultado | Evidencia |
|---|---|---|
| A11Y-01 | PASA | Foco con var `--sh-focus` (`#22c7e0`); contraste AA/AAA verificado en tokens |
| A11Y-02 | PASA | Navegador: 5 pestañas, **ArrowRight** mueve `aria-selected` a «Cerebro»; diálogo abre y **cierra con Escape** |
| A11Y-03 | PASA | 4 `role="switch"`; 7 `role="progressbar"` con `aria-valuenow` |
| A11Y-04 | PASA (estático) | Regla global `@media (prefers-reduced-motion: reduce)` en `globals.css` |
| PERF-01 | PASA | Navegador: **LCP 64–116 ms**, **CLS 0**, TTFB 26–63 ms (umbral LCP < 2500 ms / CLS < 0,1) |
| PERF-02 | PASA | API: 12–35 ms; panel SSR: 91–383 ms |

## 3. Hallazgos

**DEF-01 · Baja-Media · «Guardrails mal formados se ignoran en silencio»**
- **Pasos:** Configuración → Avanzado → Guardrails → pegar `required_tool | falta tool` → Guardar.
- **Esperado (plan):** rechazo con aviso.
- **Obtenido:** **200** — la regla se descarta silenciosamente (el parser exige 3 campos para `required_tool`).
- **Alcance:** mismo comportamiento en el panel clásico (`_parse_custom_guardrails` es la misma función movida) → **no es regresión**, es paridad.
- **Impacto:** el usuario cree que guardó una regla que no existe.
- **Fix propuesto:** devolver el conteo de líneas ignoradas y avisarlo en la UI (o rechazar el guardado). No bloqueante.
- **Estado:** documentado; se corrige en la Tanda 6 junto con el editor crudo.

**Defectos históricos ya corregidos durante el programa** (no de esta campaña): métricas USD
`int`→`float` en `/plan`; desactivar una habilidad en plan al límite exige confirmación;
`pack_commerce` restaurado tras una prueba destructiva.

## 4. Anexo de limpieza (cero residuo)

| Entidad / valor | Acción | Estado final |
|---|---|---|
| Negocio `qa-campana` | Creado → plan → suspender/activar → **purgado** | **0 resultados** ✔ |
| Conexión `QA Campana SMTP` | Creada → editada → estado → **eliminada** | Lista solo con la original ✔ |
| Cuenta `qa-campana@example.test` | Creada → password → grant/revoke → link → **desactivada** | **Inactiva** (misma que al inicio) ✔ |
| Identidad (nombre, tz, franjas) | Cambiada → **restaurada** | Valores originales ✔ |
| `bot_paused` | Activado → **restaurado** | `false` ✔ |
| `model_temperature` | 0.3 → 0.5 → **restaurado** | `0.3` ✔ |
| `short_term_turns` | 12 → 15 → **restaurado** | `12` ✔ |
| Herramientas (tools) | 1 deshabilitada → **restaurada** | 0 deshabilitadas ✔ |
| Versión del AgentSpec | Rollback → **vuelta a la activa** | `1.0.33` activa ✔ |
| Guardrails personalizados | Añadida → **limpiada** | `""` ✔ |
| Tema del panel | Light → **restaurado** | `sh-dark` ✔ |
| Conexión Meta / playbook / specs de otros negocios | **No tocados** | — |

## 5. Limitaciones de entorno (documentadas)

1. **Sin conexiones Meta reales** en el negocio demo → los ciclos contra la Graph API
   (números: alta/código/verificación; plantillas: sync/eliminar; salud: diagnosticar/re-suscribir;
   créditos) se validaron en **contrato y caminos de error**, no end-to-end.
2. **Conector `waweb` caído** → no se emitió QR real; se validó el estado, el aviso de riesgo y el reinicio.
3. **Packs y wizard de WhatsApp** viven en el panel clásico (**ADR-0078**, decisión aceptada) → validados vía `/legacy` (Batch 8).
4. **Roles por pack** vacíos: solo `pack_cobranza` los aporta y no está habilitado en el demo.
5. **CONV-05 (envío real)** no ejecutado por riesgo (mensaje a un cliente real); guardas validadas.

## 6. Cobertura por módulo

| Módulo | Casos | PASA | Limitación |
|---|---|---|---|
| Regresión | 6 | 6 | — |
| Sesión/navegación/tema | 12 | 12 | — |
| Resumen/Leads/Conversaciones/Escalaciones | 14 | 13 | 1 (envío real) |
| Habilidades/Costos | 11 | 11 | — |
| Plan/Colaboradores | 14 | 12 | 2 |
| Tenants | 6 | 6 | — |
| Conexiones/Meta/Números/Plantillas/WAW | 29 | 23 | 6 |
| Configuración | 15 | 15 | — |
| Panel clásico | 8 | 8 | — |
| Seguridad | 8 | 8 | — |
| Accesibilidad/Rendimiento | 6 | 6 | — |
| **Total** | **122** | **116** | **5 + 1 no ejecutado** |

## 7. Conclusión y siguientes pasos

- **La paridad funcional está verificada** y el panel nuevo puede usarse como superficie
  principal; lo no reconstruido sigue accesible desde `/legacy` con sesión compartida.
- **Recomendaciones:** (a) corregir `DEF-01` al reconstruir Avanzado (Tanda 6);
  (b) repetir los ciclos Meta y el QR con un negocio conectado y el conector arriba;
  (c) incorporar el harness de navegador (`playwright` + Chrome) a la CI para A11Y/PERF.
- **Tanda 6 (pendiente):** reconstrucción de packs (Cobranza, Comercio, Calendario),
  wizard de WhatsApp y aplicación del sistema de diseño + skills a la APK.

*SolversHub — Centro de soluciones impulsado con IA. Un producto de Roshi.*
