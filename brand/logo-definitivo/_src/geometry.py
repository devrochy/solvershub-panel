"""Geometría maestra del logo definitivo de SolversHub.

Reconstrucción vectorial del arte final (lienzo original de 1033 × 1024 px).
Todas las medidas salen de ese arte: el contorno del cerebro son 8 lóbulos
circulares simétricos, la tipografía es Montserrat Bold y la "V" es un check
con brazos a ±27,5°.

Sistema de coordenadas: unidades = píxeles del arte original; el eje vertical
del isotipo está en x = 0 (equivale a x = 505,6 del original) y la y se
conserva tal cual.
"""
import math
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT_PATH = Path(__file__).parent / "fonts" / "Montserrat-Bold.ttf"

# ---------------------------------------------------------------- trazos
W_MAIN = 12.5   # contorno del cerebro, fisura, rayos y rosca del foco
W_ICON = 3.1    # mini-iconos de línea
W_ICON_DETAIL = 2.6  # renglones y detalles internos de los mini-iconos
W_CHECK = 15.2  # check blanco del núcleo
W_RULE = 10.0   # líneas que flanquean HUB


def f(v):
    """Número compacto para SVG."""
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def pt(p):
    return f"{f(p[0])} {f(p[1])}"


# ------------------------------------------------------------ isotipo
# Lóbulos del lado derecho: (dx, cy, radio de la línea central). El
# izquierdo es su espejo. Radios exteriores medidos: 47.2 / 50.6 / 52.65 / 49.5.
LOBES = [
    (38.0, 167.6, 47.2 - W_MAIN / 2),
    (94.45, 199.1, 50.6 - W_MAIN / 2),
    (119.15, 259.75, 52.65 - W_MAIN / 2),
    (100.25, 320.05, 49.5 - W_MAIN / 2),
]
BRAIN_CENTER = (0.0, 265.0)
NECK_X = 44.5          # semiancho del cuello (línea central)
NECK_Y = 407.35        # base del cuello (línea central)
NECK_DIAG = 432.36     # diagonal lóbulo→cuello: x + y = NECK_DIAG (lado derecho)
NECK_BEND_R = 20.0     # curva diagonal→vertical
NECK_CORNER_R = 2.0    # esquinas inferiores

FISSURE_TOP_TO = 226.75   # la fisura baja desde la unión superior hasta aquí
CROSSBAR = (17.25, 197.25)  # semilargo, y

RAY = ((-90.5, 230.2), (-65.9, 254.8))   # rayo izquierdo; el derecho es espejo
DASH = ((-98.4, 288.2), (-90.8, 295.8))  # guion corto (solo lado izquierdo)

CORE = (0.0, 310.0, 66.6)  # círculo con degradado
CHECK = ((-30.0, 309.05), (-9.45, 329.6), (31.3, 288.6))

BASE_LINES = [(429.0, 41.5), (451.2, 34.1), (473.2, 21.1)]  # (y, semilargo)


def _circle_intersections(c1, r1, c2, r2):
    (x1, y1), (x2, y2) = c1, c2
    d = math.hypot(x2 - x1, y2 - y1)
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(max(r1 * r1 - a * a, 0.0))
    xm, ym = x1 + a * (x2 - x1) / d, y1 + a * (y2 - y1) / d
    return [(xm + h * (y2 - y1) / d, ym - h * (x2 - x1) / d),
            (xm - h * (y2 - y1) / d, ym + h * (x2 - x1) / d)]


def _outer(points):
    cx, cy = BRAIN_CENTER
    return max(points, key=lambda p: math.hypot(p[0] - cx, p[1] - cy))


def _arc_flags(c, a, b, sweep):
    """large-arc flag para ir de a a b alrededor de c en el sentido `sweep`."""
    t0 = math.atan2(a[1] - c[1], a[0] - c[0])
    t1 = math.atan2(b[1] - c[1], b[0] - c[0])
    span = (t1 - t0) % (2 * math.pi) if sweep else (t0 - t1) % (2 * math.pi)
    return 1 if span > math.pi else 0


def brain_outline_path():
    """Contorno cerebro + cuello del foco como una sola línea central cerrada."""
    lobes_r = [((dx, cy), r) for dx, cy, r in LOBES]
    lobes_l = [((-dx, cy), r) for dx, cy, r in LOBES]
    # unión superior (los dos lóbulos de arriba se cruzan sobre el eje)
    (cx0, cy0), r0 = lobes_r[0]
    j0 = (0.0, cy0 - math.sqrt(r0 * r0 - cx0 * cx0))
    # uniones entre lóbulos consecutivos (lado derecho)
    joints = [j0]
    for (c1, r1), (c2, r2) in zip(lobes_r, lobes_r[1:]):
        joints.append(_outer(_circle_intersections(c1, r1, c2, r2)))
    # unión del último lóbulo con la diagonal del cuello
    (cx, cy), r = lobes_r[-1]
    # P(t) = (t, NECK_DIAG - t)
    A = 2.0
    B = -2 * cx - 2 * (NECK_DIAG - cy)
    C = cx * cx + (NECK_DIAG - cy) ** 2 - r * r
    disc = math.sqrt(B * B - 4 * A * C)
    t = min((-B + disc) / (2 * A), (-B - disc) / (2 * A))
    j4 = (t, NECK_DIAG - t)
    joints.append(j4)

    # curva diagonal→vertical (giro de 45° hacia adentro)
    corner = (NECK_X, NECK_DIAG - NECK_X)
    tlen = NECK_BEND_R * math.tan(math.radians(22.5))
    bend_a = (corner[0] + tlen / math.sqrt(2), corner[1] - tlen / math.sqrt(2))
    bend_b = (NECK_X, corner[1] + tlen)
    corner_a = (NECK_X, NECK_Y - NECK_CORNER_R)
    corner_b = (NECK_X - NECK_CORNER_R, NECK_Y)

    def mx(p):
        return (-p[0], p[1])

    d = [f"M{pt(j0)}"]
    for i, (c, r) in enumerate(lobes_r):
        a, b = joints[i], joints[i + 1]
        d.append(f"A{f(r)} {f(r)} 0 {_arc_flags(c, a, b, 1)} 1 {pt(b)}")
    d.append(f"L{pt(bend_a)}")
    d.append(f"A{f(NECK_BEND_R)} {f(NECK_BEND_R)} 0 0 0 {pt(bend_b)}")
    d.append(f"L{pt(corner_a)}")
    d.append(f"A{f(NECK_CORNER_R)} {f(NECK_CORNER_R)} 0 0 1 {pt(corner_b)}")
    d.append(f"L{pt(mx(corner_b))}")
    d.append(f"A{f(NECK_CORNER_R)} {f(NECK_CORNER_R)} 0 0 1 {pt(mx(corner_a))}")
    d.append(f"L{pt(mx(bend_b))}")
    d.append(f"A{f(NECK_BEND_R)} {f(NECK_BEND_R)} 0 0 0 {pt(mx(bend_a))}")
    d.append(f"L{pt(mx(j4))}")
    mj = [mx(p) for p in joints]
    for i in range(len(lobes_l) - 1, -1, -1):
        c, r = lobes_l[i]
        a, b = mj[i + 1], mj[i]
        d.append(f"A{f(r)} {f(r)} 0 {_arc_flags(c, a, b, 1)} 1 {pt(b)}")
    d.append("Z")
    return " ".join(d), j0


def fissure_path():
    _, j0 = brain_outline_path()
    hx, y = CROSSBAR
    return f"M0 {f(j0[1])}V{f(FISSURE_TOP_TO)}M{f(-hx)} {f(y)}H{f(hx)}"


def rays_path():
    (a, b) = RAY
    ma, mb = (-a[0], a[1]), (-b[0], b[1])
    da, db = DASH
    return (f"M{pt(a)}L{pt(b)}M{pt(ma)}L{pt(mb)}"
            f"M{pt(da)}L{pt(db)}")


def base_path():
    return "".join(f"M{f(-h)} {f(y)}H{f(h)}" for y, h in BASE_LINES)


def check_path():
    a, b, c = CHECK
    return f"M{pt(a)}L{pt(b)}L{pt(c)}"


# ------------------------------------------------------- mini-iconos
DIAL = (-48.1, 218.4, 16.6)  # dial/objetivo: centro y radio del arco
def _rrect(x0, y0, x1, y1, r):
    return (f"M{f(x0 + r)} {f(y0)}H{f(x1 - r)}A{f(r)} {f(r)} 0 0 1 {f(x1)} {f(y0 + r)}"
            f"V{f(y1 - r)}A{f(r)} {f(r)} 0 0 1 {f(x1 - r)} {f(y1)}H{f(x0 + r)}"
            f"A{f(r)} {f(r)} 0 0 1 {f(x0)} {f(y1 - r)}V{f(y0 + r)}A{f(r)} {f(r)} 0 0 1 {f(x0 + r)} {f(y0)}Z")


def _circle(cx, cy, r):
    return (f"M{f(cx - r)} {f(cy)}A{f(r)} {f(r)} 0 1 0 {f(cx + r)} {f(cy)}"
            f"A{f(r)} {f(r)} 0 1 0 {f(cx - r)} {f(cy)}Z")


def _person(cx):
    head = _circle(cx, 152.5, 8.4)
    x0, x1, yb = cx - 15.0, cx + 15.0, 177.9
    body = (f"M{f(x0)} {f(yb)}V{f(yb - 3)}A15 11.4 0 0 1 {f(x1)} {f(yb - 3)}"
            f"V{f(yb)}Z")
    return head + body


def icons_outline():
    """Mini-iconos de trazo W_ICON (contornos)."""
    p = []
    # 1-2. personas (arriba, simétricas)
    p.append(_person(-38.1))
    p.append(_person(38.1))
    # 3. ventana / ficha (arriba izquierda)
    p.append(_rrect(-115.25, 186.6, -80.3, 206.5, 2.6))
    p.append("M-109.6 186.6V182.2A2.5 2.5 0 0 1 -107.1 179.7H-88.5A2.5 2.5 0 0 1 -86 182.2V186.6")
    # 4. documento con esquina doblada (arriba derecha)
    p.append("M82.35 177.85H109.4L115.9 184.35V208.9A2.6 2.6 0 0 1 113.3 211.5H82.35"
             "A2.6 2.6 0 0 1 79.75 208.9V180.45A2.6 2.6 0 0 1 82.35 177.85Z"
             "M109.4 177.85V184.35H115.9")
    # 5. dial / objetivo (centro izquierda)
    cx, cy, r = DIAL
    a0, a1 = math.radians(-48.5), math.radians(109.5)
    s = (cx + r * math.cos(a0), cy + r * math.sin(a0))
    e = (cx + r * math.cos(a1), cy + r * math.sin(a1))
    p.append(f"M{pt(s)}A{f(r)} {f(r)} 0 1 0 {pt(e)}")
    p.append(_circle(cx, cy, 5.4))
    p.append(_circle(-28.6, cy, 3.6))
    # 6. diagrama de flujo (centro derecha)
    p.append(_rrect(24.6, 218.3, 31.4, 225.1, 1.6))
    p.append(_circle(39.2, 221.7, 2.9))
    p.append(_circle(61.0, 207.6, 2.5))
    p.append(_circle(61.0, 221.7, 2.5))
    # 7. carpeta con conversación (izquierda)
    p.append("M-140.8 241.6H-114.6L-111.6 245.6H-104A2.6 2.6 0 0 1 -101.4 248.2V270.2"
             "A2.6 2.6 0 0 1 -104 272.8H-140.8A2.6 2.6 0 0 1 -143.4 270.2V244.2"
             "A2.6 2.6 0 0 1 -140.8 241.6Z")
    # 8. globo de chat con corazón (derecha)
    p.append("M106.1 245.85H140.2A2.6 2.6 0 0 1 142.8 248.45V270.05A2.6 2.6 0 0 1 140.2 272.65"
             "H114.4L110.2 280L108.6 272.65H106.1A2.6 2.6 0 0 1 103.5 270.05V248.45"
             "A2.6 2.6 0 0 1 106.1 245.85Z")
    p.append("M123.4 264.6L116.6 257.9A4 4 0 0 1 122.3 252.2L123.4 253.3L124.5 252.2"
             "A4 4 0 0 1 130.2 257.9Z")
    # 9. casilla con check (abajo izquierda)
    p.append(_rrect(-119.7, 310.5, -92.1, 338.1, 2.6))
    p.append("M-105.9 306.6V310.5")
    p.append("M-113.9 323.2L-108.9 328.6L-98.2 316.6")
    # 10. historial clínico (abajo derecha)
    p.append("M95.1 306.8H113.6L120.6 313.8V326.9A2.6 2.6 0 0 1 118 329.5H95.1"
             "A2.6 2.6 0 0 1 92.5 326.9V309.4A2.6 2.6 0 0 1 95.1 306.8Z")
    p.append("M113.6 306.8V313.8H120.6")
    p.append("M91.3 334.9H121.8")
    return "".join(p)


def icons_detail():
    """Detalles internos de los mini-iconos (trazo W_ICON_DETAIL)."""
    p = []
    # renglones de la ficha
    p.append("M-100 192.5H-86.4M-100 196.7H-86.4M-100 200.8H-89.6")
    # renglones del documento
    p.append("M88.2 190H104.6M88.2 194.4H102.6M88.2 198.8H95.2")
    # dial: marcas superior e izquierda, unión con el nodo
    cx, cy, r = DIAL
    p.append(f"M{f(cx)} {f(cy - r - 4.4)}V{f(cy - r + 3.4)}"
             f"M{f(cx - r - 0.9)} {f(cy)}H{f(cx - r + 5.3)}"
             f"M{f(cx + 6.6)} {f(cy)}H-33.4")
    # flujo: conectores y flecha (lazo cerrado entre nodos)
    p.append("M31.4 221.7H36.3M42.1 221.7H58.5M39.2 218.8V207.6H58.5"
             "M61 219.2V211M58.8 213.2L61 211L63.2 213.2")
    # pulso del historial
    p.append("M97.6 320.4H102L104.6 314.6L108 326.1L110.6 320.4H115.4")
    return "".join(p)


def icons_fill():
    """Elementos sólidos de los mini-iconos."""
    p = []
    p.append(_rrect(-110.6, 192.5, -103.1, 200.6, 1.0))         # foto de la ficha
    p.append(_circle(-105.4, 183.2, 1.1) + _circle(-101.9, 183.2, 1.1))  # puntos de la pestaña
    for x in (-131.25, -122.5, -113.75):                          # "..." de la carpeta
        p.append(_circle(x, 257.2, 2.3))
    p.append(_circle(136.4, 250.6, 1.4))                          # aviso del chat
    return "".join(p)


# ------------------------------------------------------------ wordmark
CAP = 700  # altura de mayúsculas de Montserrat (unidades de fuente)


class Font:
    def __init__(self, path=FONT_PATH):
        self.tt = TTFont(str(path))
        self.gs = self.tt.getGlyphSet()
        self.cmap = self.tt.getBestCmap()
        self.hmtx = self.tt["hmtx"]
        self.upm = self.tt["head"].unitsPerEm

    def glyph(self, ch):
        return self.cmap[ord(ch)]

    def bounds(self, ch):
        from fontTools.pens.boundsPen import BoundsPen
        bp = BoundsPen(self.gs)
        self.gs[self.glyph(ch)].draw(bp)
        return bp.bounds

    def advance(self, ch):
        return self.hmtx[self.glyph(ch)][0]

    def path(self, ch, scale, x_pen, baseline):
        pen = SVGPathPen(self.gs, ntos=f)
        tp = TransformPen(pen, (scale, 0, 0, -scale, x_pen, baseline))
        self.gs[self.glyph(ch)].draw(tp)
        return pen.getCommands()


# "V"-check: rectas de los bordes medidas en el arte (x = m·y + b), simetrizadas
# a ±27,5° alrededor de su vértice (alineado con el eje del isotipo).
V_SLOPE = math.tan(math.radians(27.5))
V_THICK_H = 38.8        # ancho horizontal de cada brazo
V_APEX = (0.0, 687.84)  # cruce de los bordes exteriores
V_TOP_L = 532.5         # el brazo izquierdo arranca en la altura de mayúsculas
V_TOP_R = 493.75        # el brazo derecho sube por encima de las letras
V_BOTTOM = 661.25       # punto más bajo (curva inferior)
V_FILLET = 16.0         # redondeo de las esquinas internas de las puntas
V_TIP_R = 1.5           # remate mínimo de las puntas exteriores


def v_check_path():
    m, w = V_SLOPE, V_THICK_H
    ax, ay = V_APEX

    def lo(y):   # borde exterior izquierdo
        return ax - m * (ay - y)

    def li(y):   # borde interior izquierdo
        return lo(y) + w

    def ro(y):   # borde exterior derecho
        return ax + m * (ay - y)

    def ri(y):   # borde interior derecho
        return ro(y) - w

    # muesca interior: li(y) == ri(y)
    y_notch = ay - w / m
    notch = (li(y_notch), y_notch)
    # curva inferior tangente a ambos bordes exteriores, con fondo en V_BOTTOM
    theta = math.atan(m)
    r_b = (ay - V_BOTTOM) / (1 / math.sin(theta) - 1)
    cyb = ay - r_b / math.sin(theta)
    tl = (ax - r_b * math.cos(theta), cyb + r_b * math.sin(theta))
    tr = (ax + r_b * math.cos(theta), cyb + r_b * math.sin(theta))

    def fillet(corner, d_in, d_out, r):
        """Esquina redondeada: devuelve (inicio, fin) tangentes."""
        ang = math.acos(max(-1.0, min(1.0, -(d_in[0] * d_out[0] + d_in[1] * d_out[1]))))
        t = r / math.tan(ang / 2)
        a = (corner[0] - d_in[0] * t, corner[1] - d_in[1] * t)
        b = (corner[0] + d_out[0] * t, corner[1] + d_out[1] * t)
        return a, b

    def unit(dx, dy):
        n = math.hypot(dx, dy)
        return dx / n, dy / n

    # recorrido horario: punta izq. exterior → arista superior → borde interior
    # → muesca → borde interior der. → arista superior der. → borde exterior der.
    # → curva inferior → borde exterior izq.
    p_tl = (lo(V_TOP_L), V_TOP_L)
    p_tli = (li(V_TOP_L), V_TOP_L)
    p_tri = (ri(V_TOP_R), V_TOP_R)
    p_tr = (ro(V_TOP_R), V_TOP_R)
    d_down_l = unit(m, 1)      # bajando por el brazo izquierdo
    d_up_r = unit(m, -1)       # subiendo por el brazo derecho
    a1, b1 = fillet(p_tli, (1, 0), d_down_l, V_FILLET)
    a2, b2 = fillet(p_tri, d_up_r, (1, 0), V_FILLET)
    k1a, k1b = fillet(p_tl, unit(-m, -1), (1, 0), V_TIP_R)
    k2a, k2b = fillet(p_tr, (1, 0), unit(-m, 1), V_TIP_R)
    d = [f"M{pt(k1b)}", f"L{pt(a1)}",
         f"A{f(V_FILLET)} {f(V_FILLET)} 0 0 1 {pt(b1)}",
         f"L{pt(notch)}", f"L{pt(a2)}",
         f"A{f(V_FILLET)} {f(V_FILLET)} 0 0 1 {pt(b2)}",
         f"L{pt(k2a)}",
         f"A{f(V_TIP_R)} {f(V_TIP_R)} 0 0 1 {pt(k2b)}",
         f"L{pt(tr)}",
         f"A{f(r_b)} {f(r_b)} 0 0 1 {pt(tl)}",
         f"L{pt(k1a)}",
         f"A{f(V_TIP_R)} {f(V_TIP_R)} 0 0 1 {pt(k1b)}Z"]
    bbox = (lo(V_TOP_L), V_TOP_R, ro(V_TOP_R), V_BOTTOM)
    return "".join(d), bbox


# Composición medida del arte (centros de cada letra, x del arte original)
AXIS_ORIG = 505.6
SOLVERS_SIZE = 120.0 / CAP * 1000     # 171,43 px → mayúsculas de 120
SOLVERS_BASELINE = 652.5
HUB_SIZE = 88.0 / CAP * 1000          # 125,71 px → mayúsculas de 88
HUB_BASELINE = 774.5
SOLVERS_CENTERS = {
    "S1": 149.25, "O": 273.875, "L": 401.0, "E": 640.875, "R": 758.5, "S2": 869.125,
}
SOLVERS_TRACK = -3.0  # tracking medido en SOLVERS (≈ −0,0175 em), se usa en la versión de 1 línea
HUB_CENTER = 509.0
HUB_TRACK = -2.0      # px a 125,71 px (≈ −0,016 em)
RULE_GAP = 32.5       # separación línea–HUB
RULE_Y = 730.5


def _ink_box(font, ch, scale, pen_x, baseline):
    x0, y0, x1, y1 = font.bounds(ch)
    return (pen_x + x0 * scale, baseline - y1 * scale, pen_x + x1 * scale, baseline - y0 * scale)


def _union(*boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))


def _solvers(font):
    """Letras de SOLVERS (sin la V) colocadas como en el arte: [(ch, pen_x)]."""
    s = SOLVERS_SIZE / font.upm
    out = []
    for key, ch in (("S1", "S"), ("O", "O"), ("L", "L"), ("E", "E"), ("R", "R"), ("S2", "S")):
        x0, _, x1, _ = font.bounds(ch)
        cx = SOLVERS_CENTERS[key] - AXIS_ORIG
        out.append((ch, cx - (x0 + x1) / 2 * s))
    return out


def _run(font, text, scale, pen, baseline, track):
    paths, boxes = [], []
    for ch in text:
        paths.append(font.path(ch, scale, pen, baseline))
        boxes.append(_ink_box(font, ch, scale, pen, baseline))
        pen += font.advance(ch) * scale + track
    return "".join(paths), _union(*boxes)


def wordmark_parts(font, lines=2):
    """Wordmark en coordenadas del isotipo.

    lines=2: SOLVERS arriba y — HUB — debajo (composición del logo definitivo).
    lines=1: SOLVERSHUB en una línea, HUB a la misma altura y con el tracking
    medido de SOLVERS.
    Devuelve paths ('solvers', 'v', 'hub', 'rules') y la caja de tinta 'box'.
    """
    s = SOLVERS_SIZE / font.upm
    letters, boxes = [], []
    for ch, pen_x in _solvers(font):
        letters.append(font.path(ch, s, pen_x, SOLVERS_BASELINE))
        boxes.append(_ink_box(font, ch, s, pen_x, SOLVERS_BASELINE))
    v_d, v_box = v_check_path()
    solvers_box = _union(*boxes, v_box)
    parts = {"solvers": "".join(letters), "v": v_d, "v_box": v_box,
             "solvers_box": solvers_box, "rules": ""}

    if lines == 1:
        pen_s2 = _solvers(font)[-1][1]
        pen = pen_s2 + font.advance("S") * s + SOLVERS_TRACK
        hub, hub_box = _run(font, "HUB", s, pen, SOLVERS_BASELINE, SOLVERS_TRACK)
        parts.update(hub=hub, hub_box=hub_box, box=_union(solvers_box, hub_box))
        return parts

    sh = HUB_SIZE / font.upm
    # centra la tinta de HUB (borde izq. de H → borde der. de B) en HUB_CENTER
    _, probe = _run(font, "HUB", sh, 0.0, HUB_BASELINE, HUB_TRACK)
    pen = (HUB_CENTER - AXIS_ORIG) - (probe[0] + probe[2]) / 2
    hub, hub_box = _run(font, "HUB", sh, pen, HUB_BASELINE, HUB_TRACK)
    left, right = solvers_box[0], solvers_box[2]
    rules = (f"M{f(left)} {f(RULE_Y)}H{f(hub_box[0] - RULE_GAP)}"
             f"M{f(hub_box[2] + RULE_GAP)} {f(RULE_Y)}H{f(right)}")
    rules_box = (left, RULE_Y - W_RULE / 2, right, RULE_Y + W_RULE / 2)
    parts.update(hub=hub, hub_box=hub_box, rules=rules,
                 box=_union(solvers_box, hub_box, rules_box))
    return parts


# Caja de tinta del isotipo (contorno exterior de los lóbulos laterales y la rosca)
def isotipo_box():
    side = max(dx + r + W_MAIN / 2 for dx, _, r in LOBES)
    top = min(cy - r - W_MAIN / 2 for _, cy, r in LOBES)
    bottom = BASE_LINES[-1][0] + W_MAIN / 2
    return (-side, top, side, bottom)
