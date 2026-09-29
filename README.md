# SolversHub — Centro de lanzamiento

**Producto:** SolversHub · **Empresa:** Roshi — Centro de Inteligencia e Innovación
**Primario de marca:** `#172F6C` · **Última actualización:** 2026-09-23

Esta carpeta reúne **todo** lo necesario para llevar SolversHub a producción y a
mercado. El checklist de abajo es la **fuente de verdad del avance**: se marca aquí
y se enlaza al detalle.

---

## Cómo está organizada

| Carpeta / archivo | Qué contiene |
|---|---|
| `apps/panel-web/` | Panel web: Next.js 16 + Tailwind v4 + shadcn/ui. Consume la API `/api/v1` de agent-core (ADR-0076/0077). |
| `brand/` | Manual de marca, brand book, logos (SVG), tokens de diseño |
| `legal/` | Contrato, DPA, aviso de privacidad (borradores) |
| `comercial/` | Kit de venta + calculadora de ROI |
| `runbooks/` | Go-live, backup/restore, onboarding, incidentes |
| `PRODUCCION-SOLVERSHUB.md` | Tablero técnico de cierre a producción |
| `security.md` | Documento de seguridad (para ventas enterprise) |

> Todos los documentos de lanzamiento viven **físicamente aquí**, en `solvershub/`.
> Solo quedan en el repo del producto (`solvershub-backend/docs/`) los documentos propios
> del código que su código y ADRs referencian: `solvershub-backend/docs/BILLING.md` (facturación),
> `solvershub-backend/docs/despliegue-coolify.md` (despliegue) y `solvershub-backend/docs/ROADMAP.md` (desarrollo).

---

## Estado global

| Fase | Avance | Estado |
|---|---|---|
| 0 · Fundaciones (decisiones) | 80 % | 🟢 En curso |
| 1 · Producto a producción | 30 % | 🟡 Pendiente lo crítico |
| 2 · Marca | 90 % | 🟢 Casi listo |
| 3 · Landing y activos | 70 % | 🟡 Núcleo listo; faltan activos de venta |
| 4 · Canales y redes | 0 % | 🔴 Pendiente |
| 5 · Go-to-market | 30 % | 🟡 Base lista |
| 6 · Operación | 40 % | 🟡 Base lista |

Leyenda: 🟢 avanzado · 🟡 a medias · 🔴 por hacer

---

## Fase 0 · Fundaciones (decisiones) — 🟢

- [x] Marca: **SolversHub** (producto) · **Roshi** (empresa).
- [x] Paleta base `#172F6C` validada (contraste WCAG AA/AAA).
- [x] Logotipo (check + cerebro en red 3D) y **manual de marca**.
- [x] Precios y planes definidos (`../solvershub-backend/docs/BILLING.md`).
- [x] Congelar Forja y MobiMetrIA durante el lanzamiento.
- [ ] **Fee de implementación** definido (recomendado: 1–3 meses de plan).
- [ ] **Dominio final** de SolversHub (hoy la landing apunta a `solversolutions.com`).

## Fase 1 · Producto a producción — 🟡

**P0 (bloquean la venta)**
- [~] Calidad del agente **≥ 95 %** en el golden set del ICP. El agente interno de la
      agencia (tenant `solvershub`) tiene golden set propio en **4/4**; falta ampliarlo a
      ≥15 escenarios y medir el ICP (`runbooks/alta-agente-agencia.md`).
- [ ] Guardrails por **precondición de datos** (no regex sobre texto libre).
- [~] Alta de un cliente **cronometrada < 1 día**. Se dio de alta el tenant interno de la
      agencia como ensayo del flujo; falta cronometrar un cliente externo real.
- [ ] Entorno de **producción separado** + dominio propio.

**P1 (bloquean el escalamiento)**
- [x] `security.md` completo.
- [x] Runbooks (go-live, backup, onboarding, incidentes).
- [x] Borradores legales (contrato, DPA, privacidad).
- [ ] **Restaurar un backup** con evidencia (y decidir RPO: 24 h vs 15 min).
- [ ] SLOs **medidos** y visibles (status page).
- [ ] Revisión **legal** por abogado + publicar aviso de privacidad.
- [ ] Pentest básico + cuestionario de seguridad respondido.
- [ ] Sprint 5: MCP por tenant + guardrails de runtime.

## Fase 2 · Marca — 🟢

- [x] Manual de marca completo (`brand/manual-de-marca.md`).
- [x] Brand book visual (`brand/brand-book.html`).
- [x] Logos vectoriales + tokens (`brand/logos/`, `brand/tokens/`).
- [x] Tipografía del logo: geométrica **Montserrat** (v1.3 del manual).
- [x] Aplicar Montserrat en la landing y el panel (tokens + `next/font`, display en titulares).
- [ ] Kit de aplicaciones: firma de email, plantillas de redes, deck, one-pager PDF.

## Fase 3 · Landing y activos — 🟡

- [x] Ejecutar `../landing/docs/plan-auditoria.md` (CTAs rotos, performance, a11y):
      CTAs/anclas por scroll, DataGraph lazy + error boundary, hydration determinista,
      animaciones acotadas, header con menú mobile accesible, 0 errores de lint.
- [~] Funnel de leads funcional + **analytics**: implementado (`/api/leads`, PostHog,
      WhatsApp flotante, opt-in). Falta configurar las claves (`POSTHOG_KEY`,
      `WHATSAPP_NUMBER`) y el endpoint de intake de agent-core (ADR-0055).
- [~] Páginas: **Precios** y **Seguridad** y **Legales** (`/privacidad`, `/terminos`)
      listas. Faltan Integraciones y Casos de uso.
- [~] SEO + schema (FAQ, Product, Organization, sitemap multi-ruta). Falta SEO por vertical.
- [ ] Activos de venta: deck, one-pager, 2 casos de estudio, video demo 90 s.
- [ ] Prueba social real: testimonios, caso de éxito y logo cloud ocultos hasta tener
      datos verificables (`landing/lib/flags.ts` → `SHOW_SOCIAL_PROOF`).

> Detalle de la integración landing↔agente: `runbooks/alta-agente-agencia.md`.

## Fase 4 · Canales y redes — 🔴

- [ ] WhatsApp Business propio verificado + plantillas aprobadas + opt-in.
- [ ] LinkedIn (B2B) e Instagram (PyMEs) activos.
- [ ] Calendario editorial de 8 semanas + 20 piezas base.

## Fase 5 · Go-to-market — 🟡

- [x] Kit de venta base + calculadora de ROI (`comercial/`).
- [x] Las 10 respuestas de venta (`PRODUCCION-SOLVERSHUB.md` §4).
- [ ] Campañas: Meta Lead Ads, Google Search, outbound asistido.
- [ ] CRM de leads + SLA de respuesta < 5 min.
- [ ] Casos de estudio + deck comercial.

## Fase 6 · Operación — 🟡

- [x] Borradores legales (`legal/`).
- [x] Runbooks de operación (`runbooks/`).
- [ ] Legal revisado y publicado; aviso de privacidad en Meta.
- [ ] Soporte con SLA por plan + canal de contacto.
- [ ] On-call + página de estado.

---

## Software (monorepo)

Estructura objetivo y estado actual:

| Componente | Ubicación | Stack | Estado |
|---|---|---|---|
| Panel web | `apps/panel-web/` | Next.js 16 · Tailwind v4 · shadcn/ui | En este repo |
| Marca / tokens | `brand/` | DTCG → CSS/Tailwind/RN/Android | En este repo |
| Runtime | `../solvershub-backend/` | Python · FastAPI · PostgreSQL/Redis | Repo propio (fase 2) |
| APK del gestor | `../cobranza/solvershub-apk/` | Expo / React Native | Repo propio (fase 2) |

`agent-core` y la APK conservan su repo y su CI (runner self-hosted) por ahora;
migrarlos a este monorepo es fase 2 (ver `../solvershub-backend/docs/adr/0076`). La CI de este
repo (`.github/workflows/ci.yml`) usa *path filters*: corre tokens si cambia
`brand/tokens/**` y el panel si cambia `apps/panel-web/**`.

Comandos (desde la raíz `solvershub/`):

| Comando | Qué hace |
|---|---|
| `make tokens` | Genera tokens (CSS, Tailwind, RN, Android) |
| `make tokens-sync` | Regenera tokens y los copia al panel |
| `make api-types` | Exporta el OpenAPI de agent-core y regenera los tipos TS del panel |
| `make panel-install` | Instala dependencias del panel |
| `make panel-dev` | Levanta el panel en `:3200` |
| `make panel-check` | typecheck + lint + build del panel |
| `make core-rebuild` | Reconstruye y reinicia `core-api` del stack docker |
| `make lint` / `make test` | Lint / tests de todo el monorepo |

**Validación:** el plan de pruebas vive en [`PLAN-DE-PRUEBAS.md`](../solvershub-comercial/PLAN-DE-PRUEBAS.md) y su
última ejecución (campaña completa, 122 casos) en
[`REPORTE-DE-PRUEBAS-2026-09-28.md`](../solvershub-comercial/REPORTE-DE-PRUEBAS-2026-09-28.md): **116 PASA ·
5 con limitación de entorno · 1 hallazgo menor (DEF-01) · 0 defectos Altos/Críticos**.

> Rutas relativas: `AGENT_CORE` (default `../solvershub-backend`) es configurable:
> `make api-types AGENT_CORE=/ruta/a/agent-core`.

---

## Qué sigue, en orden (próximos 7 días)

1. **Producción separada + dominio** (Fase 1, P0-4) — sin esto no hay go-live.
2. **Backup con restauración probada** (Fase 1, P1-1) — evidencia real.
3. **Cerrar la auditoría P0 de la landing** (Fase 3) — CTAs, funnel, analytics.
4. **Revisión legal** de los borradores (Fase 6) — abogado.
5. **Guardrails + calidad del agente** (Fase 1, P0-1/P0-2) — el mayor riesgo de producto.

> Cada tarea se marca aquí y su detalle vive en el documento enlazado. No se marca
> `[x]` sin evidencia.
