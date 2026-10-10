# Manual de Marca — SolversHub

**Versión:** 1.5 · **Fecha:** 2026-10-09
**Empresa:** Roshi — Centro de Inteligencia e Innovación
**Producto:** SolversHub — Centro de soluciones impulsado con IA
**Primario de marca:** `#172F6C`

> Este manual es la fuente de verdad de la identidad de SolversHub. Toda pieza
> (producto, landing, redes, propuestas, campañas, material de venta) debe cumplirlo.
> Ante una duda no cubierta aquí, decide a favor de la claridad y el contraste.

---

## Índice

1. Estrategia de marca
2. Arquitectura de marca (Roshi / SolversHub)
3. Naming y nomenclatura
4. Sistema de logotipo
5. Color
6. Tipografía
7. Iconografía e ilustración
8. Fotografía e imagen
9. Voz y tono
10. Aplicaciones
11. Accesibilidad
12. Co-branding y uso por terceros
13. Gobernanza de marca

---

## 1. Estrategia de marca

### 1.1 Qué es SolversHub

SolversHub es un **centro de soluciones impulsado con IA**: un sistema operativo de
agentes que atiende, vende, cobra, agenda y da seguimiento por los canales donde ya
están los clientes (WhatsApp primero), y al que se le **añaden habilidades** según el
negocio. No es "un chatbot": es una plataforma que se adapta a cualquier negocio sin
reescribir software.

### 1.2 Propuesta de valor

> **"Agentes IA que resuelven el trabajo repetitivo de tu negocio — y se adaptan a él."**

Tres promesas que la marca nunca debe contradecir:

1. **Listo y adaptado.** Un agente operativo en días, configurado al negocio, no un proyecto de meses.
2. **Habilidades que se suman.** Ventas, cobranza, agendamiento, marketing: se activan como módulos.
3. **Bajo control.** Panel, métricas, costos y escalamiento a humano. El negocio manda, no el modelo.

### 1.3 Posicionamiento

| | |
|---|---|
| **Categoría** | Plataforma de agentes IA para operación y atención de negocios |
| **Para** | PyMEs y empresas medianas que operan por WhatsApp y viven de la atención al cliente |
| **Contra** | Chatbots genéricos, agencias que hacen "un bot a medida" por cliente, y hojas de cálculo/WhatsApp manual |
| **Diferencial** | Un solo motor multi-tenant + habilidades activables. Cero forks por cliente. |

### 1.4 Personalidad de marca

**Elegante · Confiable · Precisa · Cercana · Innovadora.**

La marca se siente como un **instrumento bien hecho**: sobria, técnica sin ser fría,
segura sin ser arrogante. Piensa "infraestructura premium", no "startup ruidosa".

- **Es:** clara, directa, competente, humana.
- **No es:** exagerada, mágica, llena de jerga, prometedora en exceso.

---

## 2. Arquitectura de marca (Roshi / SolversHub)

```
Roshi  (empresa / respaldo institucional)
  └── SolversHub  (producto / marca principal)
        ├── Solver para Ventas      (habilidad)
        ├── Solver para Cobranza    (habilidad)
        ├── Solver para Agendamiento(habilidad)
        └── Solver para Marketing   (habilidad)
```

**Reglas:**

- **Roshi** es la firma institucional. Aparece en lo legal, en el "Powered by" y en
  contextos corporativos (contratos, inversores, prensa). Nunca compite visualmente
  con SolversHub.
- **SolversHub** es la marca de producto. Es la que el cliente ve primero y recuerda.
- Las habilidades se nombran `Solver para <función>` en texto, nunca como marcas
  independientes. No crear logos por habilidad.
- Endoso estándar: **"SolversHub, un producto de Roshi"** o **"Powered by Roshi"**
  en footer y piezas institucionales.

---

## 3. Naming y nomenclatura

- **Siempre:** `SolversHub` — una palabra, "S" y "H" mayúsculas, sin guion, sin espacio.
- **Nunca:** `Solvers Hub`, `Solvershub`, `SOLVERSHUB`, `Solvers-Hub`, `SolversHub™` en texto corrido.
- **En frases:** "SolversHub te ayuda a…" (la marca es sujeto, no objeto de "usar").
- **Enlace/URL:** `solvershub.com` (o el dominio final) en minúsculas.
- **Redes:** handle unificado `@solvershub` donde esté disponible.
- **Producto interno:** los repos pueden conservar nombres técnicos (`agent-core`),
  pero **nunca** se usan de cara al cliente.

---

## 4. Sistema de logotipo

### 4.1 Construcción

Logo definitivo (v1.5, 2026-10-09). Tiene dos elementos y se apila en vertical:

1. **Isotipo "cerebro-foco"** — un cerebro de **8 lóbulos** dibujado con un trazo
   continuo, grueso y de remates redondos, que se cierra en el cuello de un **foco**
   con **3 líneas de rosca**. En el centro, un **núcleo circular** en el gradiente de
   marca (135°) con un **check blanco**; sobre él, la fisura del cerebro en forma de
   cruz y tres destellos. Alrededor, **10 mini-iconos de línea** (personas, ficha,
   documento, dial, flujo, carpeta, chat, casilla, historial): las operaciones del
   negocio que la inteligencia central resuelve.
2. **Logotipo de texto** — **SOLVERS** en mayúsculas, Montserrat Bold (tracking
   ≈ −0,02 em), con la **"V" sustituida por un check** (brazos a ±27,5°, base
   redondeada, brazo derecho que sube por encima de las letras) en el gradiente de
   marca de izquierda a derecha. Debajo, **HUB** flanqueado por dos líneas que
   llegan a los bordes de SOLVERS.

El set completo (SVG maestros, PNG, favicon, íconos de app) y su generador están en
`brand/logo-definitivo/` (lámina en `index.html`, guía en `README.md`).

### 4.2 Versiones

Cada pieza existe en `-tema-oscuro` (para fondos navy: tinta blanca, HUB cian
`#22C7E0`), `-tema-claro` (para blanco/paper: tinta navy `#0B1733`, HUB azul
`#2F6BFF`), `-mono-blanco` y `-mono-navy` (una tinta, check del núcleo calado).
Todas las rutas son relativas a `brand/logo-definitivo/svg/`.

| Versión | Carpeta | Uso |
|---|---|---|
| Vertical (principal) | `logo-vertical/` | Portadas, splash, presentaciones, redes |
| Horizontal · 2 líneas | `logo-horizontal/` | Cabecera de la landing, documentos, propuestas |
| Horizontal · 1 línea | `logo-horizontal-1-linea/` | Barras de navegación, pies de página, banners |
| Horizontal simple (2 y 1 línea) | `logo-horizontal-simple/`, `logo-horizontal-1-linea-simple/` | Por debajo de 240 px de ancho: firmas, panel, cabecera de la app |
| Wordmark · 2 líneas | `wordmark-2-lineas/` | SOLVERS / — HUB — cuando el isotipo ya está cerca |
| Wordmark · 1 línea | `wordmark-1-linea/` | SOLVERSHUB; HUB se distingue por color |
| Isotipo completo | `isotipo/` | Desde 96 px |
| Isotipo simple | `isotipo-simple/` | 24–96 px, avatares (sin mini-iconos) |
| App icon | `app-icon/` | Cuadrado (iOS, maskable), redondeado (PWA, redes), capas de Android |
| Favicon | `favicon/` | Silueta sólida en el gradiente con check blanco; sirve en pestañas claras y oscuras |

> **Derivados raster:** los PNG, el `favicon.ico` y los íconos de app se generan con
> `python3 brand/logo-definitivo/_src/build.py`; nunca se editan a mano.

> **Regla de la "v"-check:** el check siempre sustituye a la "v" y siempre va en el
> gradiente de marca (salvo en las versiones monocromo). No se añade a otra letra ni
> se usa como elemento suelto.

### 4.3 Área de respeto

Deja libre alrededor del logotipo una distancia mínima igual al **radio del núcleo
del isotipo** (≈ 1/5 del alto del isotipo) por cada lado. Nada —texto, borde,
imagen— entra en esa zona.

### 4.4 Tamaños mínimos

| Soporte | Horizontal | Isotipo simple | Isotipo completo |
|---|---|---|---|
| Digital | 120 px de ancho (versión simple bajo 240 px) | 24 px | 96 px |
| Impreso | 30 mm de ancho | 8 mm | 25 mm |

Por debajo de 24 px, usa el favicon.

### 4.5 Usos correctos

- Sobre navy `#172F6C`, `#0B1733`, `#11224D` o `#080F22` → `-tema-oscuro`.
- Sobre blanco o `#F7F9FC` → `-tema-claro`.
- Sobre foto → capa navy al 60–75 % con `-tema-oscuro`, o `-mono-blanco`.
- Impresión a una tinta, sellos, grabados → `-mono-navy`.
- En texto corrido el nombre sigue siendo **SolversHub** (§3); las mayúsculas son solo
  del logotipo.

### 4.6 Usos incorrectos (nunca)

- ❌ Deformar, rotar, inclinar o cambiar proporciones.
- ❌ Recolorear fuera de la paleta (nada de neón, degradados ajenos, dorado en el texto).
- ❌ Añadir sombras duras, biseles, contornos o efectos 3D.
- ❌ Poner el logotipo sobre fondos de bajo contraste o muy ruidosos.
- ❌ Separar SOLVERS de HUB, o quitar las líneas que flanquean HUB.
- ❌ Quitar el check del wordmark (la "v" no puede volver a ser una "v" normal).
- ❌ Usar el check suelto como logotipo completo, o recolorearlo fuera del gradiente.

---

## 5. Color

### 5.1 Paleta oficial

**Navy — color de marca (estructura y fondos)**

| Token | Hex | Uso |
|---|---|---|
| `--sh-navy-950` | `#080F22` | Fondos profundos, secciones hero |
| `--sh-navy-900` | `#0B1733` | Fondo base en oscuro, texto sobre claro |
| `--sh-navy-800` | `#11224D` | Superficies/cards en oscuro |
| **`--sh-navy-700`** | **`#172F6C`** | **Primario de marca**, botones, header |
| `--sh-navy-600` | `#21408A` | Estados hover, bordes de isotipo |

**Acentos**

| Token | Hex | Uso |
|---|---|---|
| `--sh-blue-500` | `#2F6BFF` | Enlaces, foco, interacción |
| `--sh-cyan-400` | `#22C7E0` | Acento IA, datos, highlights, gradiente |
| `--sh-gold-500` | `#C9A227` | Acento premium (uso medido: sellos, "empresarial") |

**Neutros**

| Token | Hex | Uso |
|---|---|---|
| `--sh-white` | `#FFFFFF` | Texto sobre navy, superficies claras |
| `--sh-paper` | `#F7F9FC` | Fondo claro principal |
| `--sh-mist` | `#E2E8F2` | Bordes y divisores en claro |
| `--sh-slate-600` | `#5A6B85` | Texto secundario sobre claro |
| `--sh-slate-300` | `#C9D2E3` | Texto secundario sobre oscuro |

**Semánticos**

| Token | Hex | Uso |
|---|---|---|
| `--sh-success` | `#22A06B` | Confirmaciones, pagos aprobados |
| `--sh-warning` | `#E0A106` | Avisos, cuota al 80 % |
| `--sh-danger` | `#D64545` | Errores, límites, cuota 100 % |

### 5.2 Gradiente de marca

`linear-gradient(135deg, #2F6BFF 0%, #22C7E0 100%)` — solo en acentos, "Hub" del
logotipo, indicadores de datos y detalles. **Nunca** como fondo de grandes áreas ni
detrás de texto largo.

### 5.3 Proporción de uso (regla 60-30-10)

- **60 %** navy (fondos y estructura).
- **30 %** neutros (superficies, texto, bordes).
- **10 %** acentos (blue/cyan/gold) para lo accionable y lo importante.

### 5.4 Contraste (verificado WCAG)

| Combinación | Ratio | Nivel |
|---|---|---|
| Blanco sobre `#172F6C` | 12.65:1 | AAA |
| `#172F6C` sobre `#F7F9FC` | 12.00:1 | AAA |
| `#22C7E0` sobre `#172F6C` | 6.21:1 | AA |
| `#C9A227` sobre `#172F6C` | 5.23:1 | AA |
| `#5A6B85` sobre `#F7F9FC` | 5.14:1 | AA |
| `#C9D2E3` sobre `#11224D` | 10.16:1 | AAA |

> Regla: el cyan y el dorado **no** se usan como color de texto sobre blanco
> (fallan contraste). Sobre blanco, usa navy o `#5A6B85`.

### 5.5 Tema oscuro y claro

El producto usa **oscuro por defecto** (navy 900/800) y **claro** para documentos,
facturas y material impreso. **El panel permite alternar oscuro/claro** (v1.4): el
claro está aprobado para sesiones largas de operación, con el mismo contraste AA y
los roles semánticos equivalentes. La fuente única es `tokens/tokens.json` (formato DTCG);
`tokens/build.mjs` genera `tokens/tokens.css` (variables `--sh-*`, clases
`.sh-dark` / `.sh-light`), `tokens/dist/tailwind-theme.css` (tema Tailwind v4),
`tokens/dist/theme.ts` (React Native, APK) y `tokens/dist/android/` (recursos
Android). **No se editan los archivos generados**: se cambia `tokens.json` y se
corre `npm run build` en `tokens/`.

---

## 6. Tipografía

### 6.1 Familias

| Rol | Fuente | Alternativas | Uso |
|---|---|---|---|
| **Display / titulares** | Montserrat | Century Gothic, Didact Gothic | H1–H3, logotipo, botones, cifras grandes |
| **Cuerpo** | Inter | Segoe UI, system-ui | Párrafos, UI, formularios, documentos |
| **Monoespaciada** | JetBrains Mono | SF Mono, Consolas | Código, tokens, IDs, métricas técnicas |

Todas son de uso libre (SIL OFL). Carga Montserrat e Inter vía Google Fonts o
autoalojadas; nunca más de dos familias por pieza.

### 6.2 Escala (web)

| Elemento | Tamaño | Peso | Interlineado | Tracking |
|---|---|---|---|---|
| Display | clamp(2.5rem, 5vw, 4rem) | 700 | 1.05 | −0.02em |
| H1 | clamp(2rem, 4vw, 3rem) | 700 | 1.1 | −0.02em |
| H2 | 2rem | 600 | 1.2 | −0.01em |
| H3 | 1.375rem | 600 | 1.3 | 0 |
| Body | 1rem | 400 | 1.6 | 0 |
| Body small | 0.875rem | 400 | 1.5 | 0 |
| Caption / label | 0.75rem | 500 | 1.4 | 0.04em |

### 6.3 Reglas

- Longitud de línea ideal: **60–75 caracteres**.
- No usar mayúsculas sostenidas en párrafos; solo en labels cortos y con tracking.
- Cifras y precios: Montserrat. El precio es información, no decoración.
- Nunca texto justificado en web.

---

## 7. Iconografía e ilustración

- **Iconos:** línea de 2 px, trazo redondeado, esquinas suaves, monocromáticos
  (navy o cyan). Librería base recomendada: **Lucide** (ya en la landing).
- **Tamaños:** 16, 20, 24, 32 px. Alineados a la rejilla de 4 px.
- **Ilustración:** geométrica y abstracta (nodos, rutas, capas). Nada de robots
  humanoides ni circuitos de PCB. El **cerebro-foco** es un recurso reservado del
  isotipo: no se reutiliza como ilustración decorativa en otras piezas.
- **Datos:** gráficas con la paleta navy + cyan; usa forma y etiqueta además del color
  (accesible para daltonismo).

---

## 8. Fotografía e imagen

- **Estilo:** real, luminoso, con foco en personas de negocio operando (no stock
  corporativo genérico ni sonrisas de banco de imágenes).
- **Tratamiento:** cuando haya texto encima, aplica velo navy (`#0B1733`) al 60–75 %.
- **Capturas de producto:** siempre sobre navy, con marco de dispositivo limpio y
  esquinas redondeadas (`--sh-radius-lg`). Nunca capturas con datos reales de clientes.
- **Avatares/placeholder:** iniciales sobre `#172F6C`, no fotos falsas.

---

## 9. Voz y tono

### 9.1 Principios

1. **Habla de resultados, no de tecnología.** "Cierra más ventas", no "RAG con pgvector".
2. **Directa.** Frases cortas. Un idea por frase.
3. **Concreta.** Números y ejemplos antes que adjetivos.
4. **Humana.** Tuteo cercano en LatAm; sin exclamaciones ni emojis en exceso.
5. **Honesta.** Nunca prometas autonomía total ni "magia". El humano siempre puede tomar el control.

### 9.2 Hacemos / No hacemos

| ✅ Hacemos | ❌ No hacemos |
|---|---|
| "Tu agente atiende y vende 24/7." | "Revoluciona tu negocio con IA disruptiva." |
| "Listo en 48 horas." | "Implementación instantánea." |
| "Escala a un humano cuando hace falta." | "100 % autónomo, cero intervención." |
| "Desde 200.000 COP/mes." | "Precios imbatibles." |

### 9.3 Glosario

- **agente** (no "bot" en material premium; "bot" solo si el cliente lo dice primero).
- **habilidad** (módulo funcional; no "plugin" ni "pack" de cara al cliente).
- **panel** (centro de control; no "dashboard" en español salvo término técnico).
- **conversación**, **lead**, **pedido**, **cotización**, **escalamiento**.

---

## 10. Aplicaciones

| Pieza | Especificación |
|---|---|
| **Landing** | Tema oscuro, navy 900, gradiente solo en acentos. Tokens de `tokens/tokens.css`. |
| **Panel de producto** | Tema oscuro por defecto (alternable a claro, v1.4); tablas y datos en `#11224D`; acentos cyan para métricas. |
| **Firma de email** | Logo horizontal 180 px + nombre + cargo + "SolversHub, un producto de Roshi". |
| **Presentación** | Portada navy con isotipo; tipografía Montserrat; una idea por diapositiva. |
| **Propuesta / cotización** | Fondo claro (`#F7F9FC`), navy para titulares, tablas con `#E2E8F2`. |
| **One-pager PDF** | Vertical, logo arriba, 3 beneficios, 1 captura, CTA con QR. |
| **Redes** | Avatar = isotipo; portada navy + tagline; plantillas de post 1080×1080 y 1080×1350. |
| **WhatsApp (perfil)** | Foto de perfil = isotipo; descripción con propuesta de valor; catálogo con imágenes sobre navy. |
| **Facturación** | Claro, sobria; datos fiscales de Roshi; "SolversHub" como concepto. |

---

## 11. Accesibilidad

- Todo par texto/fondo cumple **WCAG 2.1 AA** como mínimo (ver §5.4).
- El color **nunca** es el único portador de información (usa icono, texto o forma).
- Foco visible siempre (`outline` cyan de 2 px).
- Tamaño mínimo de texto interactivo: 16 px.
- Respeta `prefers-reduced-motion` en toda animación.

---

## 12. Co-branding y uso por terceros

- **Partners/agencias:** pueden mostrar "Partner de SolversHub" con el isotipo, sin
  alterarlo y con aprobación previa.
- **Clientes:** pueden usar "Atendido con SolversHub" o "Powered by SolversHub" en su
  web, respetando área de respeto y paleta.
- **Prohibido:** modificar el logo, sugerir afiliación no existente, usar la marca en
  productos competidores o en contenido engañoso.

---

## 13. Gobernanza de marca

- **Dueño de la marca:** Roshi. Toda excepción se aprueba y se documenta.
- **Assets oficiales:** `brand/logo-definitivo/` (logo, desde v1.5) y `brand/tokens/`. Los logos y propuestas anteriores se retiraron (siguen en el historial de git).
- **Cambios:** cualquier cambio de logotipo, paleta o tipografía se versiona aquí y
  sube la versión del manual.
- **Checklist antes de publicar cualquier pieza:**
  - [ ] Logo correcto para el fondo y el tamaño.
  - [ ] Área de respeto intacta.
  - [ ] Colores de la paleta oficial (sin inventar tonos).
  - [ ] Tipografía Montserrat/Inter.
  - [ ] Contraste AA verificado.
  - [ ] Tono: resultados, directo, honesto.
  - [ ] Ortografía del nombre: `SolversHub`.

---

*SolversHub — Centro de soluciones impulsado con IA. Un producto de Roshi.*
