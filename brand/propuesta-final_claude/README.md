# SolversHub — propuesta-final_claude

**Fecha:** 2026-09-26 · **Estado:** en revisión (Paso D). `propuesta-inicial/` y `propuesta-final/` **no se han tocado**.
**Lámina de revisión:** [`lamina-revision.png`](lamina-revision.png)

Son dos propuestas nuevas, construidas desde `brand/base/`:

| # | Pieza | Archivo principal |
|---|---|---|
| 1 | Isotipo: cerebro con red de nodos | [`cerebro-red.svg`](cerebro-red.svg) |
| 2 | Logotipo "SolversHub" con la V-check | [`solvershub-logotipo.svg`](solvershub-logotipo.svg) |

Los archivos principales son la versión **positiva**. Todas las variantes están en `variantes/` y sus PNG en `png/`.

---

## 1. Referencias y supuestos

- `./base` → `brand/base/`. Tiene **3 imágenes**: no existe `./referencias/` ni una 4ª imagen.
  El archivo de Figma "Logo" contiene 2 de ellas (Gemini y `solvershub 1` a 3190 × 770), sin más detalle.
- `referencias/solvers.jpeg` → `brand/base/solvershub.jpeg`.
- `logo_solvershub` → `brand/base/logo solvershub.png`.

## 2. Qué se tomó de cada referencia (medido en píxeles)

**`logo solvershub.png` → cerebro**
- Vista frontal y simétrica, proporción ≈ 1,45 : 1.
- **4 lóbulos por hemisferio** más la hendidura superior.
  Cúspides medidas en el eje del trazo (px, origen en el centro del cerebro): C1 (70, 78), C2 (117, 34), C3 (121, −44).
- Bombillo centrado en (0, −52), con r ≈ 74. Rosca de 3 franjas que se estrechan.
- Trazo uniforme de ~12 px sobre 690 px, con uniones y extremos redondos.
  Se replica a la misma proporción: 9,6 px sobre 512 px.

**`solvershub.jpeg` → V y luz**
- Brazo corto = 100 % de la altura de mayúscula. Brazo largo ≥ 155 %.
- El vértice baja ~15 % por debajo de la línea base. La V pesa ≈ 1,6 × el resto de letras.
- Luz: gradiente vertical en tres zonas.
  - Punta del brazo largo en cian `#0EB9FF`.
  - Núcleo en azul eléctrico `#025FFC` / `#005EF8`.
  - Vértice en cian `#03CCFA` → `#0ECDFF` (el punto más luminoso).
  - Bordes más oscuros (`#1364D9`). Luz desde arriba a la izquierda (borde derecho más oscuro) y halo radial tenue.
  - Sin reflejos metálicos.
- HUB en `#1B81E5`, con líneas cian `#5BC9E4` a los lados. Fondo `#010510`.

**`Gemini_…jpeg` → concepto de red**
- Nodos de apps en órbita, unidos al cerebro por líneas curvas finas.

## 3. Propuesta 1 — Cerebro con red de nodos

- **Silueta:** usa las cúspides y los lóbulos medidos, trazados como arcos que pasan por los tres puntos (cúspide, lóbulo, cúspide).
  Es la misma forma del logo base, redibujada limpia.
- **Membranas:** 3 surcos por hemisferio más la fisura central, todos rellenos con **grosor variable**
  (más gruesos al nacer en la cúspide y afinándose hacia dentro).
  Convergen hacia el bombillo. El surco medio llega hasta él, como las diagonales del logo base.
- **Red:** 6 nodos (avatar, chat, agenda, documento, carrito, pago).
  - Cada **sinapsis nace en una cúspide y prolonga su surco hacia fuera**. Así la conexión viaja app → membrana → hub.
  - Cada sinapsis termina en un botón sináptico, separado del nodo por una pequeña hendidura.
  - Ángulos, radios y curvaturas difieren un poco entre lados, para que se sienta como una red viva y no como un diagrama.
- **Hub = cliente final:** el bombillo. Su núcleo usa la misma luz de la V de la Propuesta 2 y contiene la V-check en blanco, lo que une las dos piezas.
- **Favicons:** son dibujos propios, no reescalados.
  - **32 px:** cerebro + bombillo + fisura. Las apps se omiten porque a ese tamaño se vuelven ruido.
  - **180 px:** la misma corona de 6 nodos, pero como puntos cian.

## 4. Propuesta 2 — Logotipo SolversHub

- **Tipografía:** Montserrat SemiBold (HUB en Bold), convertida a trazos. Kerning leído de la tabla GPOS de la fuente.
- **V-check** (parámetros en `_src/build.py`, clase `VCheck`):

  | Parámetro | Valor | Nota |
  |---|---|---|
  | Brazo corto | 100 % de mayúscula | alineado a la línea de mayúsculas: se lee como V |
  | Brazo largo | **120 %** | la referencia llega a ≈ 155 %; se suavizó para que sea una ilusión |
  | Ángulos | 24° → 13° (corto, se endereza al subir = "remate que se curva hacia arriba") · 31° (largo) | |
  | Vértice | −6 % bajo la línea base, remate plano mínimo | |
  | Peso | 1,22 × el palo de la I | la referencia es 1,6 ×; más sobrio |
- **Luz:** dos capas recortadas a la forma de la V.
  - La capa de borde es más oscura. La capa de núcleo va desplazada, con el borde derecho más grueso: la luz llega de arriba a la izquierda.
  - Brillo radial en el vértice y reflejo suave en la punta.
  - Halo solo en el negativo.
  - Verificado contra la referencia: **ΔE ≤ 2,2** en punta, tercio superior, núcleo y vértice.
- **Estructuras:**
  - **Apilado (principal):** SOLVERS / HUB, con HUB al 42 % de la altura de mayúscula, tracking amplio y líneas a los lados.
  - **Una línea:** "SolversHub" como una sola palabra. Hub se distingue por color (gradiente de marca `#2F6BFF → #22C7E0`).
- **Favicons:** monograma de la V-check. El de 32 px tiene gradiente simplificado de 3 paradas y no lleva halo.

## 5. Archivos

```
propuesta-final_claude/
├─ cerebro-red.svg                         Propuesta 1 · positivo
├─ solvershub-logotipo.svg                 Propuesta 2 · apilado positivo
├─ lamina-revision.png                     Todas las variantes + favicons a tamaño real
├─ variantes/
│  ├─ cerebro-red-{positivo,negativo,mono-navy,mono-blanco}.svg
│  ├─ cerebro-red-favicon-{32,180}.svg
│  ├─ solvershub-logotipo-{positivo,negativo,mono-navy,mono-blanco}.svg
│  ├─ solvershub-logotipo-linea-{positivo,negativo,mono-navy,mono-blanco}.svg
│  └─ solvershub-favicon-{32,180}.svg
├─ png/                                    *@2x.png de todo; favicons también a 32/180 reales
└─ _src/
   ├─ build.py                             Generador (única fuente de verdad)
   └─ fonts/                               Montserrat SemiBold/Bold + OFL.txt
```

- Los SVG de logo tienen **fondo transparente**. Los PNG de revisión se exportan sobre su fondo: claro `#F7F9FC` y oscuro `#080F22` / `#0B1733`.
- Los favicons llevan su propio cuadrado navy, así que funcionan sobre pestañas claras y oscuras.
- Los monocromos usan **una sola tinta**, sin gradientes. La ilusión de check se sostiene solo con la geometría.

## 6. Regenerar

```bash
python3 brand/propuesta-final_claude/_src/build.py
```

Requiere `fonttools`, `cairosvg` y `Pillow`. Los PNG y la lámina **siempre se generan desde los SVG**.

## 7. Pendiente (Paso E)

Solo tras confirmación explícita:
1. Mover `brand/propuesta-inicial/` → `brand/_archivo/propuesta-inicial-backup/`.
2. Poner este set en `brand/propuesta-inicial/`.
