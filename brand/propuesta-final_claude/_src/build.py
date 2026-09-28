#!/usr/bin/env python3
"""SolversHub · propuesta-final_claude — generador reproducible.

Genera desde cero todos los SVG (texto convertido a trazos, sin dependencias de
fuentes), los PNG a 2x y la lámina de revisión. Nada se edita a mano: se ajustan
los parámetros de este archivo y se vuelve a ejecutar.

    python3 _src/build.py

Referencias medidas (ver README.md):
  · brand/base/logo solvershub.png  → silueta del cerebro (cúspides y lóbulos).
  · brand/base/solvershub.jpeg      → geometría y luz de la V.
"""
from __future__ import annotations

import math
from pathlib import Path

import cairosvg
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

SRC = Path(__file__).resolve().parent
OUT = SRC.parent
VAR = OUT / "variantes"
PNG = OUT / "png"
FONTS = SRC / "fonts"

# ─────────────────────────────────────────────────────────────── paleta ──
NAVY950 = "#080F22"
NAVY900 = "#0B1733"
NAVY800 = "#11224D"
BLUE = "#2F6BFF"
CYAN = "#22C7E0"
PAPER = "#F7F9FC"
WHITE = "#FFFFFF"
PEARL = "#F6F5FA"      # blanco perla de las letras en solvershub.jpeg
HUB_BLUE = "#1B81E5"   # "HUB" en solvershub.jpeg
HUB_LINE = "#5BC9E4"   # líneas junto a HUB en solvershub.jpeg

# Luz de la V medida en solvershub.jpeg, de la punta del brazo largo (0) al vértice (1).
V_CORE = [(0, "#0EB9FF"), (.13, "#07A2FE"), (.19, "#008CF5"), (.26, "#037EF5"),
          (.37, "#0468FA"), (.47, "#025FFC"), (.55, "#005EF8"), (.64, "#0399F7"),
          (.71, "#07BDFE"), (.77, "#03CCFA"), (.84, "#0ECDFF"), (1, "#22D2FF")]
# Borde: mismo recorrido, menos saturado y más oscuro (#1364D9 / #1659CE medidos).
V_EDGE = [(0, "#1A8FCB"), (.25, "#1466CF"), (.5, "#1352C2"), (.7, "#1667C8"),
          (.86, "#1C9CD6"), (1, "#27B3D6")]


# ───────────────────────────────────────────────────────────── utilidades ──
def n(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def pt(p) -> str:
    return f"{n(p[0])} {n(p[1])}"


def stops(st) -> str:
    out = []
    for s in st:
        o, c = s[0], s[1]
        op = s[2] if len(s) > 2 else 1
        out.append(f'<stop offset="{n(o)}" stop-color="{c}"'
                   + (f' stop-opacity="{n(op)}"' if op != 1 else "") + "/>")
    return "".join(out)


def lin(gid, x1, y1, x2, y2, st) -> str:
    return (f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{n(x1)}" '
            f'y1="{n(y1)}" x2="{n(x2)}" y2="{n(y2)}">{stops(st)}</linearGradient>')


def rad(gid, cx, cy, rx, st, ry=None) -> str:
    tr = ""
    if ry is not None and abs(ry - rx) > 1e-6:
        tr = f' gradientTransform="translate({n(cx)} {n(cy)}) scale(1 {n(ry / rx)}) translate({n(-cx)} {n(-cy)})"'
    return (f'<radialGradient id="{gid}" gradientUnits="userSpaceOnUse" cx="{n(cx)}" '
            f'cy="{n(cy)}" r="{n(rx)}"{tr}>{stops(st)}</radialGradient>')


def doc(w, h, body, defs="", title="SolversHub", desc="") -> str:
    d = f"<desc>{desc}</desc>" if desc else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n(w)} {n(h)}" '
            f'width="{n(w)}" height="{n(h)}" role="img" aria-labelledby="t">'
            f'<title id="t">{title}</title>{d}'
            + (f"<defs>{defs}</defs>" if defs else "") + body + "</svg>\n")


def add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def mul(a, k):
    return (a[0] * k, a[1] * k)


def unit(a):
    L = math.hypot(*a) or 1
    return (a[0] / L, a[1] / L)


def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return (u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1])


def bez_d(p0, p1, p2, p3, t):
    u = 1 - t
    return (3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
            3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]))


def smooth(points, start_cmd=True) -> str:
    """Catmull-Rom → Bézier cúbica (curva suave con pocos nodos)."""
    p = points
    d = [f"M{pt(p[0])}"] if start_cmd else []
    for i in range(len(p) - 1):
        p0 = p[i - 1] if i > 0 else p[i]
        p3 = p[i + 2] if i + 2 < len(p) else p[i + 1]
        c1 = add(p[i], mul(sub(p[i + 1], p0), 1 / 6))
        c2 = sub(p[i + 1], mul(sub(p3, p[i]), 1 / 6))
        d.append(f"C{pt(c1)} {pt(c2)} {pt(p[i + 1])}")
    return "".join(d)


def taper(ctrl, w0, w1, wmid=None, k=14) -> str:
    """Trazo de grosor variable a lo largo de una cúbica (relleno, extremos redondos)."""
    L, R, ws = [], [], []
    for i in range(k + 1):
        t = i / k
        w = w0 + (w1 - w0) * t
        if wmid is not None:
            w += (wmid - (w0 + w1) / 2) * math.sin(math.pi * t)
        w = max(w, 0.001)
        p = bez(*ctrl, t)
        dx, dy = unit(bez_d(*ctrl, t))
        nx, ny = -dy, dx
        L.append((p[0] + nx * w / 2, p[1] + ny * w / 2))
        R.append((p[0] - nx * w / 2, p[1] - ny * w / 2))
        ws.append(w)
    d = smooth(L)
    r1 = ws[-1] / 2
    d += f"A{n(r1)} {n(r1)} 0 0 1 {pt(R[-1])}" if r1 > .05 else f"L{pt(R[-1])}"
    d += smooth(R[::-1], start_cmd=False)
    r0 = ws[0] / 2
    d += f"A{n(r0)} {n(r0)} 0 0 1 {pt(L[0])}Z" if r0 > .05 else "Z"
    return d


def arc3(p0, pm, p2) -> str:
    """Comando A (sin el M) para el arco que pasa por p0 → pm → p2."""
    ax, ay = p0
    bx, by = pm
    cx_, cy_ = p2
    dd = 2 * (ax * (by - cy_) + bx * (cy_ - ay) + cx_ * (ay - by))
    ux = ((ax**2 + ay**2) * (by - cy_) + (bx**2 + by**2) * (cy_ - ay) + (cx_**2 + cy_**2) * (ay - by)) / dd
    uy = ((ax**2 + ay**2) * (cx_ - bx) + (bx**2 + by**2) * (ax - cx_) + (cx_**2 + cy_**2) * (bx - ax)) / dd
    r = math.hypot(ax - ux, ay - uy)
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    sweep = 1 if cross(p0, pm, p2) > 0 else 0
    large = 1 if cross(p0, p2, pm) * cross(p0, p2, (ux, uy)) > 0 else 0
    return f"A{n(r)} {n(r)} 0 {large} {sweep} {pt(p2)}"


# ───────────────────────────────────────────────────────────── tipografía ──
class Font:
    def __init__(self, path: Path):
        self.tt = TTFont(path)
        self.gs = self.tt.getGlyphSet()
        self.cmap = self.tt.getBestCmap()
        self.upm = self.tt["head"].unitsPerEm
        self._kern = self._build_kern()

    def name(self, ch):
        return self.cmap[ord(ch)]

    def adv(self, ch):
        return self.tt["hmtx"][self.name(ch)][0]

    def bounds(self, ch):
        bp = BoundsPen(self.gs)
        self.gs[self.name(ch)].draw(bp)
        return bp.bounds

    def path(self, ch, x, base, s):
        pen = SVGPathPen(self.gs, ntos=n)
        self.gs[self.name(ch)].draw(TransformPen(pen, (s, 0, 0, -s, x, base)))
        return pen.getCommands()

    def _build_kern(self):
        gpos = self.tt["GPOS"].table
        idx = set()
        for fr in gpos.FeatureList.FeatureRecord:
            if fr.FeatureTag == "kern":
                idx.update(fr.Feature.LookupListIndex)
        subs = []
        for i in sorted(idx):
            lk = gpos.LookupList.Lookup[i]
            for st in lk.SubTable:
                if lk.LookupType == 9:
                    st = st.ExtSubTable
                if getattr(st, "Format", None) in (1, 2) and hasattr(st, "Coverage"):
                    subs.append(st)
        return subs

    def kern(self, a, b):
        ga, gb = self.name(a), self.name(b)
        for st in self._kern:
            cov = st.Coverage.glyphs
            if ga not in cov:
                continue
            if st.Format == 1:
                for pvr in st.PairSet[cov.index(ga)].PairValueRecord:
                    if pvr.SecondGlyph == gb:
                        return getattr(pvr.Value1, "XAdvance", 0) or 0
            else:
                c1 = st.ClassDef1.classDefs.get(ga, 0)
                c2 = st.ClassDef2.classDefs.get(gb, 0)
                v = getattr(st.Class1Record[c1].Class2Record[c2].Value1, "XAdvance", 0) or 0
                if v:
                    return v
        return 0


SEMI = Font(FONTS / "Montserrat-SemiBold.ttf")
BOLD = Font(FONTS / "Montserrat-Bold.ttf")
CAP = 700      # altura de mayúscula de Montserrat (unidades de fuente)
XH = 534       # altura de la "v" minúscula
STEM = SEMI.bounds("I")[2] - SEMI.bounds("I")[0]
STEM_LC = SEMI.bounds("l")[2] - SEMI.bounds("l")[0]


# ─────────────────────────────────────────────────────────────── V-check ──
class VCheck:
    """La V con ilusión de check (coordenadas de fuente, y hacia arriba, vértice en x=0).

    h     altura de referencia (mayúscula o x-height)
    t     grosor perpendicular del trazo
    kr    altura del brazo largo (derecho) respecto a h           → 1.20
    al0   ángulo del brazo corto en el vértice (° desde vertical) → 24
    al1   ángulo del brazo corto en el remate (se endereza = "se curva hacia arriba")
    ar    ángulo del brazo largo                                  → 31
    over  cuánto baja el vértice por debajo de la línea base (× h)
    """

    def __init__(self, h, t, kr=1.20, al0=24, al1=13, ar=31, over=.06, flat=.16):
        self.h, self.t, self.kr = h, t, kr
        self.al0, self.al1, self.ar = al0, al1, ar
        self.yb = -over * h
        self.flat = flat * t
        self.tr = math.tan(math.radians(ar))
        self.yB = self.yb - self.flat / (math.tan(math.radians(al0)) + self.tr)
        self.hl, self.hr = h, kr * h

    def _aL(self, y):
        u = min(max((y - self.yB) / (self.hl - self.yB), 0), 1) ** 2
        return math.radians(self.al0 + (self.al1 - self.al0) * u)

    def _xol(self, y, steps=48):
        hstep = (y - self.yB) / steps
        return -sum(math.tan(self._aL(self.yB + (i + .5) * hstep)) * hstep for i in range(steps))

    def edges(self, dl=0., dr=0.):
        ca = math.cos(math.radians(self.ar))
        xol = lambda y: self._xol(y) + dl / math.cos(self._aL(y))
        xil = lambda y: self._xol(y) + (self.t - dr) / math.cos(self._aL(y))
        xor_ = lambda y: (y - self.yB) * self.tr - dr / ca
        xir = lambda y: (y - self.yB) * self.tr - (self.t - dl) / ca
        return xol, xil, xir, xor_

    def polygon(self, dl=0., dr=0., dtop=0., dbot=0., k=9):
        xol, xil, xir, xor_ = self.edges(dl, dr)
        yb, hl, hr = self.yb + dbot, self.hl - dtop, self.hr - dtop
        lo, hi = self.yB, hl                       # cruce interior (entrepierna)
        for _ in range(60):
            m = (lo + hi) / 2
            lo, hi = (m, hi) if xil(m) - xir(m) > 0 else (lo, m)
        yk = (lo + hi) / 2
        left = [(xol(yb + (hl - yb) * i / k), yb + (hl - yb) * i / k) for i in range(k + 1)]
        inner = [(xil(hl - (hl - yk) * i / k), hl - (hl - yk) * i / k) for i in range(k + 1)]
        return left, inner, [(xir(hr), hr), (xor_(hr), hr), (xor_(yb), yb)]

    def path(self, X, Y, s, **kw):
        """Path SVG: (X, Y) = posición del vértice en x y de la línea base; s = escala."""
        left, inner, right = self.polygon(**kw)
        T = lambda p: (X + s * p[0], Y - s * p[1])
        d = smooth([T(p) for p in left])
        d += "L" + pt(T(inner[0])) + smooth([T(p) for p in inner], start_cmd=False)[0:]
        d += "".join("L" + pt(T(p)) for p in right) + "Z"
        return d

    def xmin_at(self, y):
        return self.edges()[0](y)

    def xmax_at(self, y):
        return self.edges()[3](y)


V_UP = VCheck(CAP, 1.22 * STEM)
V_LC = VCheck(XH, 1.16 * STEM_LC, kr=1.22)


def v_layers(v: VCheck, X, Y, s, uid, lit=True, halo=False, ink=None):
    """Capas de la V: borde (volumen) + núcleo luminoso + brillos, recortados a la forma."""
    top, bot = Y - s * v.hr, Y - s * v.yb
    shape = v.path(X, Y, s)
    if not lit:
        return "", f'<path fill="{ink}" d="{shape}"/>'
    t = v.t
    core = v.path(X, Y, s, dl=.05 * t, dr=.17 * t, dtop=.05 * t, dbot=.06 * t)
    xv = X + s * (v.xmin_at(0) + v.xmax_at(0)) / 2
    xt = X + s * (v.xmax_at(v.hr) - .45 * t)
    defs = (lin(f"{uid}e", 0, top, 0, bot, V_EDGE) + lin(f"{uid}c", 0, top, 0, bot, V_CORE)
            + rad(f"{uid}v", xv, bot - s * .10 * v.h, s * .42 * v.h,
                  [(0, "#B9F4FF", .55), (.45, "#5FDBFF", .2), (1, "#5FDBFF", 0)])
            + rad(f"{uid}t", xt, top + s * .06 * v.h, s * .26 * v.h,
                  [(0, "#C6F1FF", .22), (1, "#8FE3FF", 0)])
            + f'<clipPath id="{uid}k"><path d="{shape}"/></clipPath>')
    body = ""
    if halo:
        cx, cy = X + s * (v.xmax_at(v.h) + v.xmin_at(v.h)) / 2, Y - s * .55 * v.h
        defs += rad(f"{uid}h", cx, cy, s * 1.25 * v.h,
                    [(0, "#1F6BFF", .34), (.5, "#1F6BFF", .12), (1, "#1F6BFF", 0)], ry=s * .95 * v.h)
        body += (f'<ellipse fill="url(#{uid}h)" cx="{n(cx)}" cy="{n(cy)}" '
                 f'rx="{n(s * 1.25 * v.h)}" ry="{n(s * .95 * v.h)}"/>')
    body += (f'<path fill="url(#{uid}e)" d="{shape}"/>'
             f'<path fill="url(#{uid}c)" d="{core}"/>'
             f'<g clip-path="url(#{uid}k)"><rect fill="url(#{uid}v)" x="{n(X - s * v.h)}" y="{n(top)}" '
             f'width="{n(s * 2.4 * v.h)}" height="{n(bot - top)}"/>'
             f'<rect fill="url(#{uid}t)" x="{n(X - s * v.h)}" y="{n(top)}" width="{n(s * 2.4 * v.h)}" '
             f'height="{n(bot - top)}"/></g>')
    return defs, body


# ───────────────────────────────────────────────────── Propuesta 2: logotipo ──
def set_word(font: Font, word, x, base, s, track, vglyph=None):
    """Compone una palabra. Devuelve (paths de letras, info de la V, x final de tinta)."""
    paths, vinfo = [], None
    cur = x
    ink_l = ink_r = None
    for i, ch in enumerate(word):
        if vglyph is not None and ch.lower() == "v":
            v = vglyph
            h = v.h
            lsb = 12
            xv = cur + s * (lsb - v.xmin_at(h))          # vértice
            vinfo = (xv, base)
            left = cur + s * lsb
            right = xv + s * v.xmax_at(h)
            adv = (right - cur) / s + 12
            ink_l = left if ink_l is None else ink_l
            ink_r = right
        else:
            b = font.bounds(ch)
            paths.append(font.path(ch, cur, base, s))
            adv = font.adv(ch)
            ink_l = cur + s * b[0] if ink_l is None else ink_l
            ink_r = cur + s * b[2]
        nxt = word[i + 1] if i + 1 < len(word) else None
        k = font.kern(ch, nxt) if nxt and not (vglyph and (ch.lower() == "v" or nxt.lower() == "v")) else 0
        cur += s * (adv + k + (track if nxt else 0))
    return paths, vinfo, ink_l, ink_r


SCHEMES = {
    "positivo": dict(bg=PAPER, text=NAVY900, hub=HUB_BLUE, line=HUB_BLUE, lit=True, halo=False),
    "negativo": dict(bg=NAVY950, text=PEARL, hub=HUB_BLUE, line=HUB_LINE, lit=True, halo=True),
    "mono-navy": dict(bg=PAPER, text=NAVY900, hub=NAVY900, line=NAVY900, lit=False, halo=False),
    "mono-blanco": dict(bg=NAVY900, text=WHITE, hub=WHITE, line=WHITE, lit=False, halo=False),
}


def logotipo_apilado(scheme):
    c = SCHEMES[scheme]
    s = .2                              # cap = 140 px
    track = .18 * 1000
    m = 60
    base = m + s * V_UP.hr + 4
    paths, (xv, _), l, r = set_word(SEMI, "SOLVERS", m, base, s, track, vglyph=V_UP)
    # HUB (Bold, 0.42 × cap, tracking amplio), centrado bajo SOLVERS
    hs = s * .42
    htrack = .58 * 1000
    hb_paths, _, hl, hr = set_word(BOLD, "HUB", 0, 0, hs, htrack)
    hub_w = hr - hl
    hx = (l + r) / 2 - hub_w / 2 - hl
    hub_base = base + s * .5 * CAP + hs * CAP
    hb_paths, _, hl, hr = set_word(BOLD, "HUB", hx, hub_base, hs, htrack)
    ly = hub_base - hs * CAP / 2
    gap = hs * 520
    inset = .1 * (r - l)
    lw = s * .045 * CAP
    H = hub_base + m
    uid = f"v{scheme[:3]}"
    vdefs, vbody = v_layers(V_UP, xv, base, s, uid, lit=c["lit"], halo=c["halo"], ink=c["text"])
    halo_part, v_part = ("", vbody) if not c["halo"] else (vbody[:vbody.index("<path")], vbody[vbody.index("<path"):])
    lines = (f'<path stroke="{c["line"]}" stroke-width="{n(lw)}" stroke-linecap="round" '
             f'd="M{n(l + inset)} {n(ly)}H{n(hl - gap)}M{n(hr + gap)} {n(ly)}H{n(r - inset)}"/>')
    svg = doc(r + m, H,
              halo_part
              + f'<path fill="{c["text"]}" d="{"".join(paths)}"/>'
              + v_part
              + f'<path fill="{c["hub"]}" d="{"".join(hb_paths)}"/>' + lines,
              vdefs, title="SolversHub", desc=f"Logotipo SOLVERS / HUB, versión {scheme}")
    return svg, c["bg"]


def logotipo_linea(scheme):
    c = SCHEMES[scheme]
    s = .2
    m = 60
    base = m + s * 742 + 6
    track = 0
    p1, (xv, _), l, r1 = set_word(SEMI, "Solvers", m, base, s, track, vglyph=V_LC)
    # "Hub" pegado: kerning óptico entre s y H
    hx = r1 + s * 104 - s * SEMI.bounds("H")[0]   # ≈ espaciado natural s|H, un poco más ceñido
    p2, _, _, r = set_word(SEMI, "Hub", hx, base, s, track)
    uid = f"l{scheme[:3]}"
    vdefs, vbody = v_layers(V_LC, xv, base, s, uid, lit=c["lit"], halo=c["halo"], ink=c["text"])
    halo_part, v_part = ("", vbody) if not c["halo"] else (vbody[:vbody.index("<path")], vbody[vbody.index("<path"):])
    hub_fill = c["hub"]
    defs = vdefs
    if c["lit"]:
        top, bot = base - s * 742, base
        defs += lin(f"{uid}g", hx, top, r, bot, [(0, BLUE), (1, "#1FB6E6" if scheme == "positivo" else CYAN)])
        hub_fill = f"url(#{uid}g)"
    svg = doc(r + m, base + s * 12 + m, halo_part
              + f'<path fill="{c["text"]}" d="{"".join(p1)}"/>' + v_part
              + f'<path fill="{hub_fill}" d="{"".join(p2)}"/>',
              defs, title="SolversHub", desc=f"Logotipo SolversHub en una línea, versión {scheme}")
    return svg, c["bg"]


def v_favicon(size):
    """Monograma de la V-check para favicon (32) y apple-touch (180)."""
    S = 32 if size == 32 else 180
    v = V_UP if size != 32 else VCheck(CAP, 1.42 * STEM, kr=1.2, al1=16)
    hgt = (v.hr - v.yb)
    wid = v.xmax_at(v.hr) - v.xmin_at(v.hl)
    s = (S * (.62 if size == 32 else .56)) / max(hgt, wid)
    X = S / 2 - s * (v.xmax_at(v.hr) + v.xmin_at(v.hl)) / 2
    Y = S / 2 + s * (v.hr + v.yb) / 2
    if size == 32:
        defs = lin("f", 0, Y - s * v.hr, 0, Y - s * v.yb,
                   [(0, "#12C2FF"), (.5, "#1C6BFF"), (1, "#16D2FF")])
        body = (f'<rect width="32" height="32" rx="7" fill="{NAVY900}"/>'
                f'<path fill="url(#f)" d="{v.path(X, Y, s)}"/>')
    else:
        vd, vb = v_layers(v, X, Y, s, "a", halo=True)
        defs = vd + rad("bg", S / 2, S * .3, S * .9, [(0, "#16306E"), (1, NAVY950)])
        body = f'<rect width="{S}" height="{S}" fill="url(#bg)"/>' + vb
    return doc(S, S, body, defs, title="SolversHub", desc=f"Favicon {size}px (V-check)")


# ───────────────────────────────────────────────── Propuesta 1: cerebro-red ──
# Eje del contorno medido en logo solvershub.png (px, y hacia arriba, origen = centro
# del cerebro). Hemisferio derecho; el izquierdo es su espejo.
BR = {
    "N": (0, 90),                                    # hendidura superior (fisura)
    "L1": (44.7, 100.5), "C1": (70.3, 78.0),         # lóbulo superior · cúspide 1
    "L2": (113.0, 60.1), "C2": (117.3, 33.6),        # lóbulo superolateral · cúspide 2
    "L3": (142.0, 0.0), "C3": (121.2, -44.1),        # lóbulo lateral · cúspide 3
    "L4": (114.1, -82.9), "C4": (63.2, -93.7),       # lóbulo inferior · encuentro con bombillo
}
BULB_C, BULB_R, SW_REF = (0, -52), 74, 12            # anillo del bombillo y trazo de referencia
NECK = 38

# Surcos (membranas): cúbicas que nacen en las cúspides y convergen hacia el bombillo.
SULCI = {
    "S1": [(70.3, 78.0), (61, 62), (50, 45), (33, 31)],
    "S2": [(117.3, 33.6), (102, 26), (80, 13), (60.5, -7.5)],
    "S3": [(121.2, -44.1), (110, -41), (99, -37), (88, -31)],
}


def mir(p):
    return (-p[0], p[1])


def ring_pt(ang):
    return (BULB_C[0] + BULB_R * math.cos(math.radians(ang)),
            BULB_C[1] + BULB_R * math.sin(math.radians(ang)))


def brain_parts(S, ox, oy, level="full"):
    """Geometría del cerebro+bombillo en coordenadas de lienzo."""
    T = lambda p: (ox + S * p[0], oy - S * p[1])
    sw = SW_REF * S
    c4 = sub(BR["C4"], BULB_C)
    J = add(BULB_C, mul(unit(c4), BULB_R))
    R = [BR["N"], BR["L1"], BR["C1"], BR["L2"], BR["C2"], BR["L3"], BR["C3"], BR["L4"], J]
    Lh = [mir(p) for p in R]
    # contorno abierto: J izquierdo → hendidura → J derecho
    d = f"M{pt(T(Lh[-1]))}"
    for i in range(8, 0, -2):
        d += arc3(T(Lh[i]), T(Lh[i - 1]), T(Lh[i - 2]))
    for i in range(0, 8, 2):
        d += arc3(T(R[i]), T(R[i + 1]), T(R[i + 2]))
    outline = d
    fill = d + arc3(T(J), T((0, BULB_C[1] + BULB_R)), T(mir(J))) + "Z"

    # bombillo
    ny = BULB_C[1] - math.sqrt(BULB_R**2 - NECK**2)
    bulb = (f"M{pt(T((-34, -132)))}L{pt(T((-NECK, ny)))}"
            + arc3(T((-NECK, ny)), T((0, BULB_C[1] + BULB_R)), T((NECK, ny)))
            + f"L{pt(T((34, -132)))}")
    rosca = "".join(f"M{pt(T((-hw, y)))}H{n(T((hw, y))[0])}"
                    for y, hw in ((-150, 35), (-170, 28), (-189, 15)))
    core_r = (BULB_R - SW_REF / 2 - 10.5) * S
    core_c = T(BULB_C)
    fil = "".join(f"M{pt(T((x, -107)))}V{n(T((x, -128))[1])}" for x in (-10, 10))

    # membranas
    mem = []
    fis0, fis1 = T(BR["N"]), T((0, BULB_C[1] + BULB_R))
    mem.append(taper([fis0, add(fis0, (0, (fis1[1] - fis0[1]) * .33)),
                      add(fis0, (0, (fis1[1] - fis0[1]) * .66)), fis1], .78 * sw, .42 * sw))
    names = {"full": ["S1", "S2", "S3"], "mid": ["S2"], "min": []}[level]
    for key in names:
        for side in (1, -1):
            cp = [T(p if side == 1 else mir(p)) for p in SULCI[key]]
            if key == "S2":
                mem.append(taper(cp, .64 * sw, .44 * sw, wmid=.6 * sw))
            else:
                mem.append(taper(cp, .62 * sw, .02 * sw, wmid=.44 * sw))
    attach = {   # (punto en lienzo, dirección de salida) — prolonga el surco hacia fuera
        "C1": (T(BR["C1"]), unit((.49, -.87))),
        "C2": (T(BR["C2"]), unit((.89, -.45))),
        "C3": (T(BR["C3"]), unit((.96, .27))),
    }
    return dict(outline=outline, fill=fill, bulb=bulb, rosca=rosca, fil=fil, mem=mem,
                core_c=core_c, core_r=core_r, sw=sw, attach=attach, T=T)


GLYPHS = {   # iconos propios en caja 24 × 24, trazo 2 con extremos redondos
    "avatar": '<circle cx="12" cy="8.6" r="3.7"/><path d="M5.2 19.6c.9-3.7 3.5-5.7 6.8-5.7s5.9 2 6.8 5.7"/>',
    "chat": ('<path d="M5.4 5.6h13.2a1.8 1.8 0 0 1 1.8 1.8v7.4a1.8 1.8 0 0 1-1.8 1.8h-6.4l-4.1 3.2v-3.2H5.4'
             'a1.8 1.8 0 0 1-1.8-1.8V7.4a1.8 1.8 0 0 1 1.8-1.8Z"/><path d="M8.3 10.1h7.4M8.3 13.3h4.4"/>'),
    "agenda": ('<rect x="4" y="5.6" width="16" height="14.6" rx="2.2"/><path d="M4 10.2h16M8.4 3.6v4M15.6 3.6v4'
               'M8.6 14.6h.01M12 14.6h.01M15.4 14.6h.01"/>'),
    "carrito": ('<path d="M3.2 4.8h2.4l2.2 10.1h9.8l2.1-7.2H6.7"/><circle cx="9.3" cy="18.9" r="1.3"/>'
                '<circle cx="16.4" cy="18.9" r="1.3"/>'),
    "documento": ('<path d="M7.1 3.6h6.8l4.7 4.7v11a1.4 1.4 0 0 1-1.4 1.4H7.1a1.4 1.4 0 0 1-1.4-1.4V5'
                  'a1.4 1.4 0 0 1 1.4-1.4Z"/><path d="M13.6 3.8v4.7h4.8M8.9 13h6.2M8.9 16.4h4"/>'),
    "pago": '<rect x="3.2" y="5.8" width="17.6" height="12.4" rx="2.2"/><path d="M3.2 10h17.6M6.9 14.6h3.6"/>',
}

# Nodos: (icono, cúspide, lado, ángulo°, radio) en polar desde el centro del cerebro.
# Corona de 6 apps; leves diferencias de ángulo y radio entre lados = red viva, no diagrama.
NODES = [   # (icono, cúspide, lado, ángulo°, radio, curvatura de la sinapsis)
    ("avatar", "C1", 1, 57, 186, -9),
    ("chat", "C2", 1, 19, 201, 7),
    ("agenda", "C3", 1, -23, 193, -8),
    ("documento", "C1", -1, 121, 190, 8),
    ("carrito", "C2", -1, 159, 197, -6),
    ("pago", "C3", -1, 205, 189, 9),
]
BR_SCHEMES = {
    "positivo": dict(bg=PAPER, line=NAVY900, fill=("#4A8BFF", "#35C8E4", 1), node_bg=WHITE,
                     glyph=BLUE, check=WHITE, lit=True, halo=False),
    "negativo": dict(bg=NAVY950, line=WHITE, fill=("#2F6BFF", "#22C7E0", .5), node_bg=NAVY800,
                     glyph="#8FE6F4", check=WHITE, lit=True, halo=True),
    "mono-navy": dict(bg=PAPER, line=NAVY900, fill=None, node_bg=None, glyph=NAVY900,
                      check=None, lit=False, halo=False),
    "mono-blanco": dict(bg=NAVY900, line=WHITE, fill=None, node_bg=None, glyph=WHITE,
                        check=None, lit=False, halo=False),
}


def bulb_core(b, c, uid, check_scale=1.0):
    """Núcleo del bombillo (hub = cliente final) con la V-check dentro."""
    cx, cy = b["core_c"]
    r = b["core_r"]
    v = VCheck(CAP, 1.3 * STEM, kr=1.2)
    s = r * 1.14 * check_scale / (v.xmax_at(v.hr) - v.xmin_at(v.hl))
    X = cx - s * (v.xmax_at(v.hr) + v.xmin_at(v.hl)) / 2 - r * .02
    Y = cy + s * (v.hr + v.yb) / 2
    vpath = v.path(X, Y, s)
    circ = (f"M{n(cx - r)} {n(cy)}a{n(r)} {n(r)} 0 1 0 {n(2 * r)} 0a{n(r)} {n(r)} 0 1 0 {n(-2 * r)} 0Z")
    if not c["lit"]:
        return "", f'<path fill="{c["line"]}" fill-rule="evenodd" d="{circ}{vpath}"/>'
    defs = (lin(f"{uid}b", 0, cy - r, 0, cy + r, [(0, "#0EB9FF"), (.3, "#0468FA"), (.55, "#005EF8"),
                                                  (.82, "#07BDFE"), (1, "#0ECDFF")])
            + rad(f"{uid}s", cx - r * .3, cy - r * .35, r * .9, [(0, "#D5F6FF", .55), (1, "#D5F6FF", 0)]))
    body = (f'<circle fill="url(#{uid}b)" cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}"/>'
            f'<circle fill="url(#{uid}s)" cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}"/>'
            f'<path fill="{c["check"]}" d="{vpath}"/>')
    return defs, body


def synapse(A, dout, center, rn, sw, bend):
    u = unit(sub(center, A))
    L = math.hypot(*sub(center, A))
    br = .5 * sw
    E = sub(center, mul(u, rn + .55 * sw + br))
    perp = (-u[1], u[0])
    p1 = add(A, mul(dout, L * .38))
    p2 = add(sub(E, mul(u, L * .22)), mul(perp, bend))
    path = taper([A, p1, p2, E], .66 * sw, .36 * sw, k=12)
    bouton = f"M{n(E[0] - br)} {n(E[1])}a{n(br)} {n(br)} 0 1 0 {n(2 * br)} 0a{n(br)} {n(br)} 0 1 0 {n(-2 * br)} 0Z"
    return path + bouton


def cerebro_red(scheme, size=512):
    c = BR_SCHEMES[scheme]
    S = .8
    O = (256, 268)
    b = brain_parts(S, *O)
    sw = b["sw"]
    uid = f"b{scheme[:3]}"
    defs, body = "", ""
    if c["halo"]:
        cx, cy = b["core_c"]
        defs += rad(f"{uid}h", cx, cy - 30, 250, [(0, "#1F6BFF", .38), (.45, "#1F6BFF", .12), (1, "#1F6BFF", 0)])
        body += f'<circle fill="url(#{uid}h)" cx="{n(cx)}" cy="{n(cy - 30)}" r="250"/>'
    if c["fill"]:
        a, z, op = c["fill"]
        defs += lin(f"{uid}f", 140, 170, 372, 360, [(0, a, op), (1, z, op)])
        body += f'<path fill="url(#{uid}f)" d="{b["fill"]}"/>'
    # red: sinapsis (prolongan los surcos) + nodos con icono
    rn = 23
    syn = nodes = ""
    for icon, att, side, ang, rad_, bend in NODES:
        ctr = (O[0] + rad_ * math.cos(math.radians(ang)), O[1] - rad_ * math.sin(math.radians(ang)))
        A, dout = b["attach"][att]
        if side == -1:
            A = (2 * O[0] - A[0], A[1])
            dout = (-dout[0], dout[1])
        syn += synapse(A, dout, ctr, rn, sw, bend)
        k = rn * 1.2 / 24
        gx, gy = ctr[0] - 12 * k, ctr[1] - 12 * k
        nodes += (f'<circle cx="{n(ctr[0])}" cy="{n(ctr[1])}" r="{rn}"'
                  + (f' fill="{c["node_bg"]}"' if c["node_bg"] else ' fill="none"')
                  + f' stroke="{c["line"]}" stroke-width="{n(.48 * sw)}"/>'
                  f'<g transform="translate({n(gx)} {n(gy)}) scale({n(k)})" fill="none" stroke="{c["glyph"]}" '
                  f'stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">{GLYPHS[icon]}</g>')
    cd, cb = bulb_core(b, c, uid, check_scale=.86)
    defs += cd
    body += (f'<path fill="{c["line"]}" d="{syn}"/>'
             f'<g fill="none" stroke="{c["line"]}" stroke-width="{n(sw)}" stroke-linecap="round" '
             f'stroke-linejoin="round"><path d="{b["outline"]}"/><path d="{b["bulb"]}"/>'
             f'<path d="{b["rosca"]}"/><path stroke-width="{n(.72 * sw)}" d="{b["fil"]}"/></g>'
             f'<path fill="{c["line"]}" d="{"".join(b["mem"])}"/>' + cb + nodes)
    return doc(512, 512, body, defs, title="SolversHub · cerebro en red",
               desc=f"Isotipo cerebro con red de nodos, versión {scheme}"), c["bg"]


def cerebro_favicon(size):
    """Dibujo propio para tamaños mínimos (no es un reescalado)."""
    if size == 32:
        S = 32 / 330
        b = brain_parts(S, 16, 13.4, level="min")
        sw = 1.55
        defs = lin("f", 5, 5, 27, 22, [(0, "#4A8BFF"), (1, "#35C8E4")])
        cx, cy = b["core_c"]
        r = b["core_r"] * 1.12
        v = VCheck(CAP, 1.6 * STEM, kr=1.18, al1=17)
        s = r * 1.25 / (v.xmax_at(v.hr) - v.xmin_at(v.hl))
        X = cx - s * (v.xmax_at(v.hr) + v.xmin_at(v.hl)) / 2
        Y = cy + s * (v.hr + v.yb) / 2
        dots = ""
        body = (f'<rect width="32" height="32" rx="7" fill="{NAVY900}"/>'
                f'<path fill="url(#f)" d="{b["fill"]}"/>'
                f'<g fill="none" stroke="{WHITE}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">'
                f'<path d="{b["outline"]}"/><path d="{b["bulb"]}"/>'
                f'<path d="M{n(16 - 2.6)} {n(26.3)}h5.2M{n(16 - 1.4)} {n(28.4)}h2.8"/></g>'
                f'<path stroke="{WHITE}" stroke-width="1.2" stroke-linecap="round" d="M16 {n(b["T"]((0, 90))[1])}V{n(b["T"]((0, 22))[1])}"/>'
                f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{WHITE}"/>'
                f'<path fill="{BLUE}" d="{v.path(X, Y, s)}"/>' + dots)
        return doc(32, 32, body, defs, title="SolversHub", desc="Favicon 32px cerebro en red")
    # 180: apple-touch (cuadrado completo; iOS redondea). Nodos = puntos, misma corona.
    S = .34
    O = (90, 92)
    b = brain_parts(S, *O, level="mid")
    sw = b["sw"] * 1.25
    c = dict(BR_SCHEMES["negativo"])
    defs = (rad("bg", 90, 70, 150, [(0, "#16306E"), (1, NAVY950)])
            + lin("f", 40, 40, 140, 130, [(0, "#2F6BFF", .62), (1, "#22C7E0", .62)]))
    cd, cb = bulb_core(b, c, "a", check_scale=.9)
    defs += cd
    dots = syn = ""
    kpos = S / .8 * .85
    for _icon, att, side, ang, rad_, bend in NODES:
        ctr = (O[0] + kpos * rad_ * math.cos(math.radians(ang)), O[1] - kpos * rad_ * math.sin(math.radians(ang)))
        A, dout = b["attach"][att]
        if side == -1:
            A = (2 * O[0] - A[0], A[1])
            dout = (-dout[0], dout[1])
        syn += synapse(A, dout, ctr, 7.5, sw, bend * kpos)
        dots += f'<circle cx="{n(ctr[0])}" cy="{n(ctr[1])}" r="7.5" fill="{CYAN}"/>'
    body = (f'<rect width="180" height="180" fill="url(#bg)"/>'
            f'<path fill="url(#f)" d="{b["fill"]}"/><path fill="{WHITE}" d="{syn}"/>'
            f'<g fill="none" stroke="{WHITE}" stroke-width="{n(sw)}" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="{b["outline"]}"/><path d="{b["bulb"]}"/><path d="{b["rosca"]}"/></g>'
            f'<path fill="{WHITE}" d="{"".join(b["mem"])}"/>' + cb + dots)
    return doc(180, 180, body, defs, title="SolversHub", desc="Icono 180px cerebro en red")


# ───────────────────────────────────────────────────────────────── salida ──
def write(path: Path, svg: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg, encoding="utf-8")


def render(svg: str, out: Path, scale=2.0, bg=None, size=None):
    out.parent.mkdir(parents=True, exist_ok=True)
    kw = dict(bytestring=svg.encode(), write_to=str(out), background_color=bg)
    if size:
        kw.update(output_width=size, output_height=size)
    else:
        kw.update(scale=scale)
    cairosvg.svg2png(**kw)


def lamina(path: Path):
    """Lámina de revisión: todas las variantes + favicons a tamaño real sobre claro y oscuro."""
    Wd = 2400
    f_t = ImageFont.truetype(str(FONTS / "Montserrat-SemiBold.ttf"), 46)
    f_h = ImageFont.truetype(str(FONTS / "Montserrat-Bold.ttf"), 24)
    f_s = ImageFont.truetype(str(FONTS / "Montserrat-SemiBold.ttf"), 20)
    rows = []

    def tile(png, w, h, bg, label, fit=.86):
        t = Image.new("RGB", (w, h), bg)
        im = Image.open(png).convert("RGBA")
        k = min(w * fit / im.width, (h - 60) * fit / im.height)
        im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
        t.paste(im, ((w - im.width) // 2, (h - 50 - im.height) // 2 + 6), im)
        d = ImageDraw.Draw(t)
        light = sum(int(bg[i:i + 2], 16) for i in (1, 3, 5)) > 380
        d.text((24, h - 44), label.upper(), font=f_s, fill="#5A6B85" if light else "#C9D2E3")
        return t

    def favs(prefix, bg):
        t = Image.new("RGB", (560, 420), bg)
        d = ImageDraw.Draw(t)
        light = sum(int(bg[i:i + 2], 16) for i in (1, 3, 5)) > 380
        big = Image.open(PNG / f"{prefix}-180.png").convert("RGBA")
        t.paste(big, (30, 40), big)
        x = 250
        for sz in (64, 32, 16):
            im = Image.open(PNG / f"{prefix}-32@2x.png" if sz == 64 else PNG / f"{prefix}-32.png").convert("RGBA")
            im = im.resize((sz, sz), Image.LANCZOS)
            t.paste(im, (x, 40 + (64 - sz) // 2), im)
            d.text((x, 118), f"{sz}", font=f_s, fill="#5A6B85" if light else "#C9D2E3")
            x += sz + 40
        z = Image.open(PNG / f"{prefix}-32.png").convert("RGBA").resize((192, 192), Image.NEAREST)
        t.paste(z, (250, 170), z)
        d.text((30, 380), "FAVICON 180 · 64 · 32 · 16 · ZOOM 32PX", font=f_s, fill="#5A6B85" if light else "#C9D2E3")
        return t

    def heading(txt, sub):
        t = Image.new("RGB", (Wd, 150), PAPER)
        d = ImageDraw.Draw(t)
        d.text((60, 36), txt, font=f_t, fill=NAVY900)
        d.text((62, 100), sub, font=f_s, fill="#5A6B85")
        return t

    rows.append(heading("Propuesta 1 · Cerebro con red de nodos",
                        "Silueta del logo base · membranas de grosor variable · 6 apps conectadas por sinapsis · hub = cliente final"))
    r = Image.new("RGB", (Wd, 620), PAPER)
    for i, (sc, bg) in enumerate([("positivo", PAPER), ("negativo", NAVY950), ("mono-navy", PAPER), ("mono-blanco", NAVY900)]):
        r.paste(tile(PNG / f"cerebro-red-{sc}@2x.png", 570, 600, bg, sc), (30 + i * 590, 0))
    rows.append(r)
    r = Image.new("RGB", (Wd, 440), PAPER)
    r.paste(favs("cerebro-red-favicon", "#FFFFFF"), (30, 0))
    r.paste(favs("cerebro-red-favicon", "#202124"), (610, 0))
    rows.append(r)
    rows.append(heading("Propuesta 2 · Logotipo SolversHub con V-check",
                        "Montserrat SemiBold a trazos · V asimétrica (brazo largo 120 %) · luz medida de solvershub.jpeg"))
    for kind in ("", "-linea"):
        r = Image.new("RGB", (Wd, 380), PAPER)
        for i, (sc, bg) in enumerate([("positivo", PAPER), ("negativo", NAVY950), ("mono-navy", PAPER), ("mono-blanco", NAVY900)]):
            r.paste(tile(PNG / f"solvershub-logotipo{kind}-{sc}@2x.png", 570, 360, bg,
                         ("apilado · " if not kind else "una línea · ") + sc, fit=.9), (30 + i * 590, 0))
        rows.append(r)
    r = Image.new("RGB", (Wd, 440), PAPER)
    r.paste(favs("solvershub-favicon", "#FFFFFF"), (30, 0))
    r.paste(favs("solvershub-favicon", "#202124"), (610, 0))
    rows.append(r)
    H = sum(x.height for x in rows) + 40
    sheet = Image.new("RGB", (Wd, H), PAPER)
    y = 20
    for x in rows:
        sheet.paste(x, (0, y))
        y += x.height
    sheet.save(path, optimize=True)


def main():
    made = []
    for sc in SCHEMES:
        svg, bg = cerebro_red(sc)
        write(VAR / f"cerebro-red-{sc}.svg", svg)
        render(svg, PNG / f"cerebro-red-{sc}@2x.png", bg=bg)
        if sc == "positivo":
            write(OUT / "cerebro-red.svg", svg)
        made.append(f"cerebro-red-{sc}")

        svg, bg = logotipo_apilado(sc)
        write(VAR / f"solvershub-logotipo-{sc}.svg", svg)
        render(svg, PNG / f"solvershub-logotipo-{sc}@2x.png", bg=bg)
        if sc == "positivo":
            write(OUT / "solvershub-logotipo.svg", svg)

        svg, bg = logotipo_linea(sc)
        write(VAR / f"solvershub-logotipo-linea-{sc}.svg", svg)
        render(svg, PNG / f"solvershub-logotipo-linea-{sc}@2x.png", bg=bg)

    for size in (32, 180):
        svg = cerebro_favicon(size)
        write(VAR / f"cerebro-red-favicon-{size}.svg", svg)
        render(svg, PNG / f"cerebro-red-favicon-{size}.png", size=size)
        render(svg, PNG / f"cerebro-red-favicon-{size}@2x.png", size=size * 2)
        svg = v_favicon(size)
        write(VAR / f"solvershub-favicon-{size}.svg", svg)
        render(svg, PNG / f"solvershub-favicon-{size}.png", size=size)
        render(svg, PNG / f"solvershub-favicon-{size}@2x.png", size=size * 2)
    lamina(OUT / "lamina-revision.png")
    print("ok")


if __name__ == "__main__":
    main()
