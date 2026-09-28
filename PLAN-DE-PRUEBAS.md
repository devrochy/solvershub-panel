# Plan de pruebas — SolversHub (panel + API + panel clásico)

**Producto:** SolversHub · **Empresa:** Roshi — Centro de Inteligencia e Innovación
**Alcance:** panel web (`solvershub/apps/panel-web`), API `/api/v1` (`agent-core`) y
panel clásico SSR (`/legacy`).
**Versión del plan:** 1.1 · **Fecha:** 2026-09-28 (incluye la campaña de paridad Tanda 5.5)
**Autor:** equipo de ingeniería (asistido por IA).

---

## 1. Objetivo

Verificar que el **panel nuevo es funcionalmente equivalente** al panel clásico en las
secciones migradas, que **no se perdió ninguna capacidad** (lo no reconstruido queda
accesible vía `/legacy`), y que la API, la sesión, el aislamiento multi-tenant y la
accesibilidad cumplen los criterios de aceptación antes de un despliegue a producción.

## 2. Componentes bajo prueba

| Componente | Ubicación | Stack | Estado |
|---|---|---|---|
| API `/api/v1` | `agent-core/core/api/**` | FastAPI + Pydantic + SQLAlchemy | 61 rutas |
| Panel web | `solvershub/apps/panel-web/**` | Next.js 16 · Tailwind v4 · shadcn/ui | 30 rutas |
| Panel clásico | `agent-core/core/admin/**` | Jinja2 + Bootstrap (SSR) | intacto, accesible en `/legacy` |
| Tokens/marca | `solvershub/brand/tokens/**` | DTCG → CSS/Tailwind/RN/Android | v1.4 |

## 3. Entornos y accesos

| Recurso | Valor |
|---|---|
| Panel nuevo | `http://localhost:3200` |
| API agent-core | `http://localhost:8001` (stack docker `agent-core-s1`) |
| Panel clásico | `http://localhost:8001/admin` o `http://localhost:3200/legacy/...` |
| Postgres | `localhost:5433` · Redis `localhost:6380` |
| Usuario admin | `admin@local` / `SolversHub2026` (rol **master**) |
| Negocio con datos | **Tenant de ejemplo (moto)** — 57 conversaciones (usar el selector de negocio) |
| Negocio alterno | **test-alpha** — 247 conversaciones |

**Preparación del entorno**

```bash
# 1. Backend (reconstruye e incorpora la API /api/v1)
cd agent-core && docker compose up -d --build core-api
# 2. Panel
cd ../solvershub && make panel-dev        # http://localhost:3200
# 3. Contrato y tipos (si cambió la API)
make api-types
```

## 4. Datos de prueba

- **Contactos/negocio:** usar `Tenant de ejemplo (moto)` (no escribir datos reales).
- **Cuentas QA:** `qa-tanda3@example.test` (colaborador, **desactivada**), creada en pruebas.
- **Plantillas/plantillas/números:** solo existen si el negocio tiene conexión Meta; el
  tenant demo usa **WhatsApp Web (QR)**, así que los caminos sin conexión deben devolver
  errores claros (se prueban igual).
- **Nunca** enviar mensajes reales a clientes: los casos de envío se validan en el
  playground del panel clásico o con conversaciones de prueba (`channel == test`).

## 5. Estrategia por niveles

| Nivel | Qué cubre | Automatización |
|---|---|---|
| Unitario | Lógica pura (formatters, tema, coercion de JSON Schema) | `npm run test` (Vitest, 12 tests) |
| API (backend) | Contratos, permisos, aislamiento | `pytest -q` (594 tests) · `ruff check` |
| Integración E2E (manual) | Flujos del panel contra el stack real | Este plan (§7) |
| Seguridad | Multi-tenant, RBAC, secretos | §9 |
| Accesibilidad | WCAG 2.1 AA | §10 |
| Rendimiento | Core Web Vitals del panel | §10 |

**Comandos de regresión obligatorios antes de aceptar:**

```bash
cd solvershub && make panel-check     # typecheck + lint + build
cd apps/panel-web && npm run test     # 12 tests
cd ../../agent-core && .venv/bin/python -m ruff check core cli tests evals scripts
cd agent-core && .venv/bin/python -m pytest -q     # 594 passed, 245 skipped
```

## 6. Criterios de entrada / salida

**Entrada:** stack arriba, admin con contraseña conocida, `docs/openapi.json` regenerado.
**Salida (aceptación):** 100 % de los casos **Críticos** y **Altos** en verde; 0 defectos
abiertos de severidad Alta o Crítica; comandos de regresión en verde; evidencia adjunta.

---

## 7. Casos de prueba funcionales

Convenciones: **ID** (`MÓDULO-nn`) · **P** = prioridad (C crítica, A alta, M media) ·
**Pre** = precondición.

### 7.1 Autenticación y sesión

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| AUTH-01 | C | Login correcto | Entrar a `/login`, `admin@local` / contraseña válida | Redirige a `/dashboard`; topbar muestra el usuario y el negocio activo |
| AUTH-02 | C | Credenciales inválidas | Contraseña incorrecta | Mensaje de error legible; **no** se crea sesión |
| AUTH-03 | A | Ruta protegida sin sesión | Abrir `/conversaciones` en incógnito | Redirige a `/login` |
| AUTH-04 | A | Logout | Pulsar "Salir" | Vuelve a `/login`; las rutas protegidas vuelven a redirigir |
| AUTH-05 | A | Sesión revocada | Desactivar la cuenta del admin en BD y recargar | Nueva petición falla y redirige a login (sin JWT) |
| AUTH-06 | M | Token en cookie httpOnly | Inspeccionar cookies | `panel_session` es `HttpOnly`, `SameSite=Lax`; el token **no** aparece en el HTML |

### 7.2 Navegación, RBAC y tema

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| NAV-01 | C | Secciones visibles por permiso | Entrar como master | Se ven las 11 secciones + grupos Herramientas y Packs |
| NAV-02 | A | Sección oculta sin permiso | Entrar con un `colaborador` sin permisos | Solo ve las secciones permitidas; Tenants/Colaboradores ocultas |
| NAV-03 | M | Marcador de panel clásico | Observar los ítems con ↗ | Herramientas/Packs abren el panel clásico con la misma sesión |
| NAV-04 | A | Selector de negocio | Abrir el selector, buscar "moto", elegir | Los datos de todas las páginas cambian al negocio elegido; se recuerda al recargar |
| NAV-05 | A | Tema claro/oscuro | Alternar el botón de tema | El tema cambia sin recargar y **persiste** al recargar (cookie) |
| NAV-06 | M | Sin destello de tema | Recargar en tema claro | No hay parpadeo: el servidor pinta el tema correcto |

### 7.3 Resumen

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| DASH-01 | A | KPIs | Abrir `/dashboard` | Conversaciones/mensajes 7d, escalaciones y costo 30d coinciden con la BD |
| DASH-02 | A | Estado del sistema | Revisar la tarjeta | Agente ACTIVO/PAUSADO, proveedor LLM y nº de habilidades correctos |
| DASH-03 | M | Conversaciones recientes | Revisar la lista | Hasta 8 conversaciones del negocio, con su estado |

### 7.4 Leads

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| LEAD-01 | A | Listado | Abrir `/leads` | Filas con cliente, canal y alta; columnas extra de packs si aplica |
| LEAD-02 | A | Búsqueda | Escribir un nombre y "Filtrar" | Solo coincidencias; "Limpiar" restaura |
| LEAD-03 | M | Paginación | Pulsar "Siguiente" | Cambia de página conservando el filtro |

### 7.5 Conversaciones

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| CONV-01 | A | Listado y filtros | `/conversaciones` + filtros estado/búsqueda | Lista filtrada y paginada |
| CONV-02 | C | Detalle con hilo | Abrir una conversación | Mensajes entrantes a la izquierda y salientes a la derecha, con fecha y remitente |
| CONV-03 | C | **Pausar agente** | Pulsar "Pausar agente" | Botón cambia a "Reanudar"; el badge pasa a pausado; persiste al recargar |
| CONV-04 | C | **Resolver** | Pulsar "Resolver conversación" | Estado abierto y agente activo; las escalaciones del hilo quedan resueltas |
| CONV-05 | A | **Mensaje humano** | Escribir y "Enviar mensaje" | Se encola el envío; aparece en el hilo como "Equipo"; fuera de ventana de 24 h devuelve error claro (409) |
| CONV-06 | A | Validación de envío | Enviar vacío | El botón permanece deshabilitado (no se envía) |

### 7.6 Escalaciones

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| ESC-01 | A | Listado | `/escalaciones` | Cliente, motivo, resumen, estado y fecha |
| ESC-02 | M | Ir al hilo | "Ver" | Abre el detalle de la conversación asociada |

### 7.7 Conexiones

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| CONX-01 | C | Listado | `/conexiones` | Conexiones del negocio + **webhook propio** del negocio visible |
| CONX-02 | C | Catálogo | "Agregar conexión" | Categorías y tipos con disponibilidad; los no disponibles como "Próximamente" |
| CONX-03 | C | Alta manual | Elegir un tipo manual (ej. Correo SMTP), completar y guardar | 204, aparece en la tabla; los secretos **no** se devuelven |
| CONX-04 | A | Edición | Reabrir el formulario del tipo | Los secretos salen vacíos con marca "(guardado)"; dejarlos vacíos los conserva |
| CONX-05 | A | Validación de requeridos | Guardar sin un campo obligatorio | Error claro indicando los campos faltantes |
| CONX-06 | C | Activar/Desactivar | Acciones → Desactivar, luego Activar | Estado cambia y persiste |
| CONX-07 | A | Marcar principal | Acciones → Marcar principal | La conexión queda como principal (única) |
| CONX-08 | A | Eliminar | Acciones → Eliminar | La conexión desaparece; pide confirmación |
| CONX-09 | A | Editar credenciales | Acciones → Editar credenciales, cambiar un valor | Se carga el formulario con los valores actuales (secretos vacíos con "(guardado)"); al guardar se actualiza |
| CONX-09b | A | Ciclo de vida Meta | En una conexión de Meta: Desactivar → Activar | El estado cambia y persiste |
| CONX-09c | A | Eliminar conexión Meta | Acciones → Eliminar | Soft-delete: desaparece de la lista y libera números/WABAs |
| CONX-09d | A | Aislamiento | Intentar operar una conexión de otro negocio (manipulando la URL) | 404/403; no se modifica nada |

### 7.8 Salud de Meta y webhooks

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| META-01 | A | Estado por conexión | `/conexiones/meta` | Estado, motivo, último chequeo y checks ok/falla |
| META-02 | A | Diagnosticar | Pulsar "Diagnosticar" | Se ejecutan los checks y se actualiza el estado |
| META-03 | A | Re-suscribir WABA | Pulsar "Re-suscribir WABA" | Se reencola la suscripción; mensaje de éxito o error de Meta |
| META-04 | M | Facturación manual | Elegir estado y "Guardar estado" | Se persiste el estado marcado (no hay API en Meta) |
| META-05b | A | Vencimiento del token | Revisar la tarjeta de la conexión | Muestra "vence en N días" o "vencido" (rojo si venció) |
| META-05 | A | Suscripciones de webhook | Tabla inferior | Canal, objeto, callback, activa e último error; "Registrar" funciona (requiere owner/master) |

### 7.9 Números telefónicos

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| NUM-01 | A | Listado | `/conexiones/meta/<id>/numeros` | Números de la WABA (sincroniza); si falla el sync, se muestra el aviso |
| NUM-02 | A | Agregar número | "Agregar número" con cc/número/nombre | Se agrega en Meta y aparece en la lista |
| NUM-03 | A | Enviar código | Acciones → Verificar → "Enviar código" (SMS/Voz) | Código enviado; el reenvío inmediato se bloquea (rate limit 60 s) |
| NUM-04 | A | Verificar código | Introducir el código recibido | Número verificado; código incorrecto devuelve error claro |

### 7.10 Plantillas

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| TPL-01 | A | Listado | `/conexiones/meta/<id>/plantillas` | Nombre, idioma, categoría, estado (con motivo de rechazo) y calidad |
| TPL-02 | A | Sincronizar | "Sincronizar" | Refresca desde Meta; aviso si se hizo hace < 1 h |
| TPL-03 | M | Eliminar | "Eliminar" + confirmar | Se eliminan todas las versiones de idioma |
| TPL-04 | M | Crear/editar | Enlace al panel clásico | El formulario clásico funciona con la sesión compartida |

### 7.11 WhatsApp Web (canal no oficial)

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| WAW-01 | C | Aviso de riesgo | `/conexiones/waweb` sin riesgo aceptado | Bloquea el QR hasta pulsar "Acepto el riesgo" |
| WAW-02 | C | Aceptar riesgo | Pulsar "Acepto el riesgo" | Se registra por negocio; el QR empieza a consultarse |
| WAW-03 | A | QR con polling | Con el conector arriba | El QR aparece y se renueva solo cada ~8 s |
| WAW-04 | A | Reiniciar vínculo | Pulsar "Reiniciar vínculo" | La sesión se reinicia y pide un QR nuevo |
| WAW-05 | M | Vinculado | Tras escanear | Estado conectado y JID visible |

### 7.12 Habilidades (plugins)

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| SKL-01 | A | Listado | `/habilidades` | Tarjetas con estado, versión y habilitación por negocio |
| SKL-02 | C | Configurar (JSON Schema) | Abrir un pack con config | Formulario generado desde el JSON Schema; secretos como `password` con pista "(guardado)" |
| SKL-03 | C | Guardar config | Cambiar un valor y "Guardar y activar" | Se valida, cifra y activa; el pack queda habilitado |
| SKL-04 | C | Activar/Desactivar | Switch de la tarjeta | Habilitar respeta la cuota del plan; deshabilitar pide **confirmación** y avisa que reactivar puede requerir plan |
| SKL-05 | A | Reintentar | Con un pack en error, "Reintentar" | Se limpia la salud del pack para el negocio |
| SKL-06 | A | Requiere configuración | Activar un pack sin config | Error claro ("necesita configuración…") |

### 7.13 Costos

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| COST-01 | A | Costos LLM | `/costos` | Hoy, 30 días, turnos y desglose por modelo/conversación |
| COST-02 | A | Métricas con decimales | Negocio con costo | Las métricas de USD **no** rompen la página (regresión corregida) |
| COST-03 | A | Sincronizar Meta | "Sincronizar costos" | Ejecuta el sync; aviso por errores de Meta |
| COST-04b | A | Costos Meta (pricing) | Negocio con consumo Meta | Tablas por categoría/país y por número + aviso de discrepancia webhook↔pricing |
| COST-04 | A | Verificar créditos | Por conexión | Muestra las líneas de crédito o el motivo del error |

### 7.14 Plan y consumo

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| PLAN-01 | A | Estado y consumo | `/plan` | Plan activo, días restantes, barras por métrica (rojo si excedida) |
| PLAN-02 | A | Suscribir | "Suscribir" en un plan pago | Abre el checkout; si la pasarela no está configurada, error claro |
| PLAN-03b | M | Límites y prestaciones | Catálogo de planes | Cada plan muestra sus límites y prestaciones |
| PLAN-03 | M | Pagos | Tabla de pagos | Historial con estado y fecha |

### 7.15 Colaboradores

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| COL-01 | A | Listado | `/colaboradores` | Cuenta, rol, estado, negocios y permisos |
| COL-02 | C | Crear | "Nuevo colaborador" (email, contraseña, rol) | Se crea y aparece; email duplicado devuelve error |
| COL-03 | A | Contraseña | Acciones → Restablecer contraseña | Se actualiza; el colaborador puede iniciar sesión |
| COL-04 | A | Otorgar/Revocar permiso | Acciones → sección + acceso | El permiso aparece/desaparece en la fila |
| COL-05 | A | Vincular a negocio | Acciones → negocio + rol | Se agrega el vínculo |
| COL-06 | A | Activar/Desactivar | Acciones → Desactivar | La cuenta queda inactiva y no puede iniciar sesión |
| COL-07 | A | Guardas de owner | Entrar como owner de un negocio e intentar tocar un master | Error ("no podés modificar esa cuenta") |
| COL-08b | M | Roles por habilidad | Alta con "Roles por habilidad" marcados | El colaborador queda con ese rol en el pack (ADR-0066) |
| COL-08 | M | No auto-desactivarse | Intentar desactivar la propia cuenta | Error explícito |

### 7.16 Tenants (plataforma, solo master)

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| TEN-01 | C | Listado | `/tenants` | Negocios con plan y estado; búsqueda y paginación |
| TEN-02 | C | Crear negocio | "Nuevo negocio" (nombre, slug, admin) | Se crea con asistente y suscripción free; aparece en la lista |
| TEN-03 | A | Cambiar plan | Acciones → plan + días | El plan y los días se actualizan |
| TEN-04 | A | Suspender/Activar | Acciones | El estado del negocio cambia |
| TEN-05 | C | Eliminar (purga) | Acciones → escribir `ELIMINAR <slug>` | Exige la frase exacta; con frase incorrecta falla; con la correcta el negocio desaparece |
| TEN-06 | A | No-master | Entrar sin ser master | No ve la sección; la API responde 403 |

### 7.17 Configuración

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| CFG-01 | C | Identidad | `/configuracion` → Identidad; cambiar nombre/tono y guardar | Se guarda; el nuevo nombre aparece en el panel |
| CFG-02 | A | Persona y frases | Editar persona/calidez/frases | Se persiste y versiona el AgentSpec |
| CFG-03 | A | Horario de atención | Zona horaria + franjas (`1 08:00-18:00`) | Se guarda el horario; franjas inválidas se descartan |
| CFG-04 | A | Kill-switch | Activar "Pausar el asistente" | El agente queda pausado (visible en Resumen) |
| CFG-05 | A | Guardrails on/off | Desactivar un guardrail | Se guarda en la configuración de comportamiento |
| CFG-06 | A | Cerebro | Cambiar modelo/temperatura/límites y guardar | Se guarda la nueva versión del spec |
| CFG-07 | A | Memoria | Cambiar turnos y RAG; guardar y recargar | Los valores persisten |
| CFG-08 | A | Habilidades (tools) | Desactivar una herramienta y poner límite | Se guarda la lista de bindings |
| CFG-09 | C | Avanzado · versiones | Ver versiones; activar una histórica | La versión pasa a activa (rollback) |
| CFG-10 | A | Avanzado · LLM | Cambiar proveedor/modelo; dejar la llave vacía | Se guarda sin borrar la llave existente |
| CFG-11 | A | Avanzado · guardrails | Añadir `max_length \| 600 \| retry` y guardar | Regla aceptada; una regla con formato inválido se rechaza |
| CFG-12b | M | Enlace al spec crudo | Avanzado → "abrir Avanzado clásico ↗" | Abre `/legacy/admin/configuracion?tab=avanzado` con la sesión compartida |
| CFG-12 | M | Avanzado · flow/evals | Revisar secciones del flow y evals | Se listan origen, secciones, herramientas y últimas corridas |

### 7.18 Panel clásico (`/legacy`)

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| LG-01 | C | Sesión compartida | Abrir `/legacy/admin/conexiones` desde el sidebar | Carga **sin** pedir login de nuevo |
| LG-02 | A | Assets y navegación | Recorrer Conexiones, DLQ, Playground, Packs | Estilos y enlaces internos funcionan (URLs reescritas a `/legacy`) |
| LG-03 | A | Formularios del clásico | Realizar una acción POST (ej. cambiar tenant) | La acción se ejecuta y redirige correctamente |
| LG-04 | C | Wizard de WhatsApp | Desde `/conexiones` → "Agregar conexión" → tipo WhatsApp → **Abrir asistente ↗** | Abre el asistente clásico **sin pedir login**; permite iniciar el Embedded Signup/BYOK (ADR-0078) |
| LG-07 | A | WhatsApp Web desde el catálogo | Tipo "WhatsApp Web" → "Vincular por QR" | Abre la **página nueva** `/conexiones/waweb` (no el clásico) |
| LG-08 | A | Carga manual de respaldo | Pie del diálogo → "Carga manual de respaldo ↗" | Abre `/legacy/admin/conexiones/manual` con la sesión compartida |
| LG-05 | A | Playground | `/legacy/admin/asistente/probar` | Permite conversar con el asistente sin canal |
| LG-06 | A | DLQ | `/legacy/admin/dlq` | Lista y "Reintentar" funcionan |

---

## 8. Pruebas de regresión

| ID | P | Caso | Resultado esperado |
|---|---|---|---|
| REG-01 | C | Suite backend | `pytest -q` → 594 passed, 245 skipped |
| REG-02 | C | Lint backend | `ruff check` sin hallazgos |
| REG-03 | A | Panel | `make panel-check` (typecheck + lint + build) en verde |
| REG-04 | A | Unitarios de lógica pura | `npm run test` → 12 passed |
| REG-05 | C | Contrato | `scripts/export_openapi.py` regenera sin errores y el cliente TS compila |
| REG-06 | C | Panel clásico | Las 18 páginas SSR clave responden (200/303 esperado) |

## 9. Pruebas de seguridad (multi-tenant y RBAC)

| ID | P | Caso | Pasos | Resultado esperado |
|---|---|---|---|---|
| SEC-01 | C | Aislamiento por tenant | Con el negocio A activo, pedir `X-Tenant-Id` del negocio B | **403**; no se devuelven datos ajenos |
| SEC-02 | C | RLS de respaldo | Manipular el `tenant_id` en una consulta desde la API | RLS impide el acceso cruzado |
| SEC-03 | C | Secretos nunca salen | Abrir la config de un pack con secretos | Los campos secretos salen **redactados** (`configured_secrets`) |
| SEC-04 | A | RBAC de escritura | Con un usuario `read` en una sección, intentar una acción de escritura | **403** |
| SEC-05 | A | Owner/master en acciones sensibles | Registrar webhooks o vincular cuentas sin ser owner/master | **403** |
| SEC-06 | A | Guardas de purga | Purgar sin la frase exacta | **400**; el negocio **no** se elimina |
| SEC-07 | A | Cookies | Inspeccionar cookies del panel | Solo `panel_session`/`panel_tenant`; sin cookies huérfanas del clásico |
| SEC-08 | M | Logs | Revisar logs de la API | No hay tokens, contraseñas ni secretos en claro |

## 10. Accesibilidad y rendimiento

| ID | P | Caso | Cómo | Criterio |
|---|---|---|---|---|
| A11Y-01 | A | Contraste | Auditoría de tokens y UI | AA mínimo (cuerpo AAA en oscuro) |
| A11Y-02 | A | Teclado | Recorrer tablas/diálogos solo con teclado | Foco visible, sin trampas, Escape cierra diálogos |
| A11Y-03 | A | Nombres accesibles | Inspeccionar switches/botones con icono | `aria-label` o texto presente |
| A11Y-04 | M | Movimiento reducido | Activar `prefers-reduced-motion` | Sin animaciones |
| PERF-01 | M | Carga del panel | Medir LCP/CLS en `/dashboard` | LCP < 2,5 s · CLS < 0,1 en entorno local |
| PERF-02 | M | Respuesta de la API | Medir `/dashboard` y `/conversations` | < 500 ms con el dataset demo |

## 11. Matriz de automatización

| Suite | Comando | Frecuencia |
|---|---|---|
| Backend unitario | `pytest -q` | Cada cambio |
| Lint backend | `ruff check core cli tests evals scripts` | Cada cambio |
| Panel | `make panel-check` | Cada cambio |
| Unitarios de panel | `npm run test` | Cada cambio |
| Contrato | `make api-types` | Al cambiar la API |
| CI del monorepo | `.github/workflows/ci.yml` | Push/PR (path filters) |

## 12. Evidencias y reporte de defectos

- **Evidencia por caso:** captura o salida de comando, con fecha y negocio usado.
- **Defecto:** `[ID del caso] Título · Severidad (Crítica/Alta/Media/Baja) · Pasos ·
  Esperado · Obtenido · Evidencia · Entorno`.
- **Severidades:** Crítica = pérdida de datos o fuga entre negocios; Alta = función
  principal rota; Media = función secundaria o cosmético relevante; Baja = cosmético.
- **Bitácora de esta campaña (2026-09-28):** se detectaron y corrigieron
  (a) métricas de costo con decimales rompían `/plan` (tipo `int`→`float`),
  (b) desactivar una habilidad en un plan al límite impide reactivarla (se añadió
  confirmación con aviso), (c) se restauró `pack_commerce` del negocio demo tras una
  prueba destructiva.

## 13. Riesgos y limitaciones conocidas

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Sin conexiones Meta reales en el negocio demo, los ciclos contra la Graph API (números, plantillas, créditos) no se ejercitaron end-to-end | Probar en un negocio conectado antes de producción |
| 2 | El conector `waweb` no corre en local: el QR real no aparece | Probar con el connector arriba y un número de repuesto |
| 3 | El wizard de Embedded Signup/BYOK vive en el panel clásico (**decisión aceptada**, ADR-0078) | Validar `LG-04`; se reconstruye en la Tanda 6 |
| 4 | Los packs (Cobranza, Comercio, Calendario) siguen en el panel clásico | Validar `LG-01..03`; reconstrucción pendiente |
| 5 | Datos de prueba conviven con datos demo (cuentas `qa-*`) | Limpiar antes de producción o purgar los negocios QA |
| 6 | Paginación/búsqueda de tenants puede ser lenta con miles de negocios | Medir `PERF-02`; el cálculo de plan se limita a la página |

## 14. Anexos

**A. Rutas de la API `/api/v1` (61):** auth (login/logout), me, tenants (selector),
dashboard, conversations (+messages/toggle-bot/resolve), escalations, leads, plugins
(+action, config), connections (+catalog, manual, action), meta (health, webhooks,
numbers, templates, waweb), costs (+meta), plan (+subscribe), collaborators (+6 acciones),
settings (identity, brain, memory, skills, advanced).

**B. Respuestas esperadas de error:** `{"error":{"code":"...","message":"..."}}`.
401 sin sesión · 403 sin permiso/tenant ajeno · 400 validación/negocio · 404 no encontrado
· 409 ventana de 24 h expirada.

**C. Glosario mínimo:** *panel* (centro de control), *habilidad* (módulo activable),
*negocio/tenant*, *escalamiento* (paso a humano), *guardrail* (regla de seguridad).

---

*SolversHub — Centro de soluciones impulsado con IA. Un producto de Roshi.*
