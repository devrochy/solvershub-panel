# Manual de Marca — SolversHub

**Versión:** 1.4 · **Fecha:** 2026-09-28
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

El logotipo tiene dos elementos:

1. **Isotipo "Cerebro en red"** — un **cerebro con volumen** (cuerpo con degradado
   oscuro, contorno neón y un halo suave) conectado a **cuatro esferas 3D**, cada una
   con un glifo: **cliente** (avatar), **conversación**, **agenda** y **pedido**.
   Estilo **moderno y 3D**: profundidad por degradados, brillo superior y nodos
   esféricos con luz. Es la metáfora de SolversHub: una inteligencia central
   conectada a las operaciones del negocio.
2. **Logotipo de texto "SolversHub"** — la letra **"v" se sustituye por un check**
   grueso y redondeado (la solución/lo resuelto), con el brazo derecho largo que sube
   por encima de las letras, en el gradiente de marca `#2F6BFF → #22C7E0`. El resto
   de las letras van en el color de contraste según el fondo (blanco sobre navy,
   navy `#0B1733` sobre claro). Tipografía **geométrica Montserrat**, de ojo alto
   y formas redondas.

**Concepto recomendado:** `logos/solvershub-logo-horizontal-light.svg` (uso principal
sobre navy) y `-dark.svg` (sobre claro). El wordmark aislado está en
`logos/solvershub-wordmark-light.svg` / `-dark.svg`.
**Alternativas de isotipo:** `logos/solvershub-icon-hexhub.svg` (hub hexagonal), `logos/solvershub-icon-spark.svg`
(chispa IA), `logos/solvershub-icon-cluster.svg` (red de 6 nodos).

**Variante plana (flat):** `logos/solvershub-logo-horizontal-flat.svg` reproduce el
mismo concepto en estilo **línea plana** —contorno de cerebro de trazo suave y
brillante, unido por líneas curvas finas a los cuatro iconos (cliente, conversación,
agenda y pedido)—, sin volumen 3D. Fondo **transparente**, pensado para fondos navy;
el wordmark y el check-`v` se conservan idénticos. Úsala cuando la pieza pida una
lectura más limpia, ligera o técnica (UI, documentación, iconografía de producto).

### 4.2 Versiones

| Versión | Archivo | Uso |
|---|---|---|
| Horizontal sobre navy (principal) | `logos/solvershub-logo-horizontal-light.svg` | Web oscura, propuestas, email |
| Horizontal sobre claro | `logos/solvershub-logo-horizontal-dark.svg` | Documentos, fondos claros |
| Horizontal plano (flat, sobre navy) | `logos/solvershub-logo-horizontal-flat.svg` | UI, documentación, piezas técnicas sobre navy |
| Vertical (apilada) | `logos/solvershub-logo-vertical-light.svg` | Splash, aplicaciones, merchandising |
| Wordmark | `logos/solvershub-wordmark-light.svg` / `-dark.svg` | Cabeceras, firmas |
| Isotipo | `logos/solvershub-icon-brain.svg` | Marca de agua, espacios reducidos |
| Monocromo | `logos/solvershub-icon-mono.svg` | Un color, sellos, grabados, print B/N |
| Favicon | `logos/solvershub-favicon.svg` | Navegador, PWA (cerebro + 4 nodos simplificado) |
| App icon | `logos/solvershub-appicon.svg` | App stores, PWA, redes (512×512) |
| App icon maskable | `logos/solvershub-appicon-maskable.svg` | PWA / Android adaptativo (fondo a sangre, zona segura) |
| Iconos raster | `logos/png/*.png` | Export de app icon y favicon para PWA, stores y apple-touch |

> **Derivados raster:** los PNG de `logos/png/` se **generan siempre desde los SVG
> fuente** (`logos/solvershub-appicon.svg`, `logos/solvershub-appicon-maskable.svg`, `logos/solvershub-favicon.svg`), nunca se editan a
> mano. Set actual: `appicon-{512,256,192,180,152,120,96,64}.png`,
> `appicon-maskable-512.png` y `favicon-{32,16}.png`. Para tamaños ≤ 32 px usa el
> favicon simplificado (el app icon completo no es legible). El gradiente del emblema
> es el oficial `#2F6BFF → #22C7E0`.

> **Regla de la "v"-check:** el check siempre sustituye a la "v" y siempre va en el
> gradiente de marca. No se añade a otra letra ni se usa como elemento suelto.

### 4.3 Área de respeto

Deja libre alrededor del logotipo una distancia mínima igual a la **altura del nodo
central del isotipo** (≈ 1/6 del alto del isotipo) por cada lado. Nada —texto, borde,
imagen— entra en esa zona.

### 4.4 Tamaños mínimos

| Soporte | Horizontal | Isotipo |
|---|---|---|
| Digital | 120 px de ancho | 24 px |
| Impreso | 30 mm de ancho | 8 mm |

Por debajo de estos mínimos, usa solo el isotipo.

### 4.5 Usos correctos

- Sobre navy `#172F6C`, `#0B1733` o `#11224D` → versión clara (texto blanco).
- Sobre blanco o `#F7F9FC` → versión principal (texto navy).
- Sobre foto → aplica una capa navy al 60–75 % o usa el isotipo monocromo blanco.

### 4.6 Usos incorrectos (nunca)

- ❌ Deformar, rotar, inclinar o cambiar proporciones.
- ❌ Recolorear fuera de la paleta (nada de neón, degradados ajenos, dorado en el texto).
- ❌ Añadir sombras duras, biseles, contornos o efectos 3D.
- ❌ Poner el logotipo sobre fondos de bajo contraste o muy ruidosos.
- ❌ Separar "Solvers" de "Hub" en el logotipo de texto.
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
  humanoides ni circuitos de PCB. El **cerebro en red** es un recurso reservado del
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
- **Assets oficiales:** `solvershub/brand/logos/` y `solvershub/brand/tokens/`.
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
