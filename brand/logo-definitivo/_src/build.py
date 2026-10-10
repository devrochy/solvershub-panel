#!/usr/bin/env python3
"""Genera el set de marca de SolversHub a partir de geometry.py.

Salidas (en brand/logo-definitivo/):
  svg/<pieza>/solvershub-<pieza>-<tema>.svg   vectores maestros
  png/<pieza>/solvershub-<pieza>-<tema>.png   exportaciones con fondo transparente
  favicon/                                     favicon.svg/.ico, PNG, apple-touch, PWA, manifest
  app/                                         íconos de la app Expo (iOS y Android adaptativo)
  index.html                                   lámina de previsualización del set

Uso:  python3 _src/build.py
Requiere fontTools y Pillow (Python) y node con sharp (ver render.mjs).
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

import geometry as g
import preview

HERE = Path(__file__).resolve().parent
OUT = HERE.parent

# ------------------------------------------------- paleta (manual §5.1)
NAVY_950 = "#080F22"
NAVY_900 = "#0B1733"
NAVY_800 = "#11224D"
NAVY_700 = "#172F6C"
BLUE_500 = "#2F6BFF"
CYAN_400 = "#22C7E0"
WHITE = "#FFFFFF"
PAPER = "#F7F9FC"

GRADIENT = "gradient"   # el núcleo y la V van en el degradado de marca
KNOCKOUT = "knockout"   # en monocromo el check del núcleo se cala (transparente)

THEMES = {
    # para fondos oscuros (navy): tinta blanca, HUB cian
    "tema-oscuro": dict(ink=WHITE, hub=CYAN_400, core=GRADIENT, v=GRADIENT, check=WHITE),
    # para fondos claros: tinta navy 900, HUB azul 500 (el cian no da contraste sobre blanco)
    "tema-claro": dict(ink=NAVY_900, hub=BLUE_500, core=GRADIENT, v=GRADIENT, check=WHITE),
    # una sola tinta: sellos, grabados, sobre fotografía, impresión a un color
    "mono-blanco": dict(ink=WHITE, hub=WHITE, core=WHITE, v=WHITE, check=KNOCKOUT),
    "mono-navy": dict(ink=NAVY_900, hub=NAVY_900, core=NAVY_900, v=NAVY_900, check=KNOCKOUT),
}
PREVIEW_BG = {"tema-oscuro": NAVY_900, "tema-claro": PAPER, "mono-blanco": NAVY_700, "mono-navy": WHITE}

FONT = g.Font()
WM2 = g.wordmark_parts(FONT, lines=2)
WM1 = g.wordmark_parts(FONT, lines=1)
BRAIN, _ = g.brain_outline_path()
ISO_BOX = g.isotipo_box()
ISO_CY = (ISO_BOX[1] + ISO_BOX[3]) / 2
ISO_H = ISO_BOX[3] - ISO_BOX[1]
# radio del círculo que contiene todo el isotipo (para zonas seguras de íconos)
ISO_RADIUS = 189.0

f = g.f


# --------------------------------------------------------------- piezas
class Art:
    """Acumula <defs> y cuerpo de un SVG con ids únicos por archivo."""

    def __init__(self, uid):
        self.uid = uid
        self.defs = []
        self.body = []
        self._ids = set()

    def gradient(self, kind):
        gid = f"{self.uid}-{kind}"
        if gid not in self._ids:
            # núcleo: 135° (arriba-izq. → abajo-der.); V: de izquierda a derecha
            x2, y2 = ("1", "1") if kind == "nucleo" else ("1", "0")
            self.defs.append(
                f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">'
                f'<stop offset="0" stop-color="{BLUE_500}"/>'
                f'<stop offset="1" stop-color="{CYAN_400}"/></linearGradient>')
            self._ids.add(gid)
        return f"url(#{gid})"

    def knockout_mask(self):
        mid = f"{self.uid}-calado"
        if mid not in self._ids:
            cx, cy, r = g.CORE
            x, y, s = cx - r - 2, cy - r - 2, 2 * r + 4
            self.defs.append(
                f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="{f(x)}" y="{f(y)}" '
                f'width="{f(s)}" height="{f(s)}">'
                f'<rect x="{f(x)}" y="{f(y)}" width="{f(s)}" height="{f(s)}" fill="#fff"/>'
                f'<path d="{g.check_path()}" fill="none" stroke="#000" '
                f'stroke-width="{f(g.W_CHECK)}" stroke-linecap="round" stroke-linejoin="round"/>'
                f'</mask>')
            self._ids.add(mid)
        return f"url(#{mid})"

    def paint(self, value, kind):
        return self.gradient(kind) if value == GRADIENT else value

    def svg(self, box, pad, title, size=None):
        x0, y0, x1, y1 = box
        vb = (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)
        w, h = size if size else (vb[2], vb[3])
        defs = f"<defs>{''.join(self.defs)}</defs>" if self.defs else ""
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(f(v) for v in vb)}" '
            f'width="{f(w)}" height="{f(h)}" role="img" aria-labelledby="{self.uid}-t">'
            f'<title id="{self.uid}-t">{title}</title>{defs}{"".join(self.body)}</svg>\n')


def isotipo(art, t, detail=True, transform=None):
    ink = t["ink"]
    b = [f'<g transform="{transform}">' if transform else "<g>"]
    b.append(f'<g fill="none" stroke="{ink}" stroke-linecap="round" stroke-linejoin="round">')
    b.append(f'<path d="{BRAIN}" stroke-width="{f(g.W_MAIN)}"/>')
    b.append(f'<path d="{g.fissure_path()}{g.rays_path()}{g.base_path()}" stroke-width="{f(g.W_MAIN)}"/>')
    if detail:
        b.append(f'<path d="{g.icons_outline()}" stroke-width="{f(g.W_ICON)}"/>')
        b.append(f'<path d="{g.icons_detail()}" stroke-width="{f(g.W_ICON_DETAIL)}"/>')
    b.append("</g>")
    if detail:
        b.append(f'<path d="{g.icons_fill()}" fill="{ink}"/>')
    cx, cy, r = g.CORE
    if t["check"] == KNOCKOUT:
        b.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{t["core"]}" mask="{art.knockout_mask()}"/>')
    else:
        b.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{art.paint(t["core"], "nucleo")}"/>')
        b.append(f'<path d="{g.check_path()}" fill="none" stroke="{t["check"]}" stroke-width="{f(g.W_CHECK)}" '
                 f'stroke-linecap="round" stroke-linejoin="round"/>')
    b.append("</g>")
    art.body.append("".join(b))


def wordmark(art, t, wm, transform=None):
    b = [f'<g transform="{transform}">' if transform else "<g>"]
    b.append(f'<path d="{wm["solvers"]}" fill="{t["ink"]}"/>')
    b.append(f'<path d="{wm["v"]}" fill="{art.paint(t["v"], "v")}"/>')
    b.append(f'<path d="{wm["hub"]}" fill="{t["hub"]}"/>')
    if wm["rules"]:
        b.append(f'<path d="{wm["rules"]}" fill="none" stroke="{t["hub"]}" stroke-width="{f(g.W_RULE)}"/>')
    b.append("</g>")
    art.body.append("".join(b))


def iso_transform(k, cx, cy):
    """Escala el isotipo k veces y lleva su centro de caja a (cx, cy)."""
    tx, ty = cx, cy - ISO_CY * k
    # la escala no se redondea a 2 decimales: 0,786 → 0,79 desplaza la rosca ~2 unidades
    return f"translate({tx:.3f} {ty:.3f}) scale({k:.5f})", (
        cx + ISO_BOX[0] * k, cy - ISO_H * k / 2, cx + ISO_BOX[2] * k, cy + ISO_H * k / 2)


def union(*boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))


# ------------------------------------------------------------ lockups
# Horizontal: el isotipo va de la punta de la V al pie de HUB (2 líneas) o
# ocupa 1,6× la altura de tinta de la línea (1 línea).
H2_GAP = 56.0
H1_GAP = 48.0
H1_ISO_H = 1.6 * (WM1["box"][3] - WM1["box"][1])
PAD = 6.0


def build_logo(name, t, uid):
    art = Art(uid)
    # las variantes "-simple" usan el isotipo sin mini-iconos (tamaños pequeños)
    detail = not name.endswith("-simple")
    base = name.removesuffix("-simple")
    if base == "logo-vertical":
        isotipo(art, t, detail=detail)
        wordmark(art, t, WM2)
        box = union(ISO_BOX, WM2["box"])
    elif base == "logo-horizontal":
        bx = WM2["box"]
        k = (bx[3] - bx[1]) / ISO_H
        cx = bx[0] - H2_GAP - (ISO_BOX[2] * k)
        tr, ibox = iso_transform(k, cx, (bx[1] + bx[3]) / 2)
        isotipo(art, t, detail=detail, transform=tr)
        wordmark(art, t, WM2)
        box = union(ibox, bx)
    elif base == "logo-horizontal-1-linea":
        bx = WM1["box"]
        k = H1_ISO_H / ISO_H
        cx = bx[0] - H1_GAP - (ISO_BOX[2] * k)
        # centra el isotipo en la altura de mayúsculas (la V sobresale arriba)
        cap_mid = g.SOLVERS_BASELINE - 60.0
        tr, ibox = iso_transform(k, cx, cap_mid - 8.0)
        isotipo(art, t, detail=detail, transform=tr)
        wordmark(art, t, WM1)
        box = union(ibox, bx)
    elif name == "wordmark-2-lineas":
        wordmark(art, t, WM2)
        box = WM2["box"]
    elif name == "wordmark-1-linea":
        wordmark(art, t, WM1)
        box = WM1["box"]
    elif name in ("isotipo", "isotipo-simple"):
        isotipo(art, t, detail=(name == "isotipo"))
        # mesa cuadrada centrada en el isotipo
        side = max(ISO_BOX[2] - ISO_BOX[0], ISO_H)
        box = (-side / 2, ISO_CY - side / 2, side / 2, ISO_CY + side / 2)
    else:
        raise ValueError(name)
    return art.svg(box, PAD, "SolversHub")


PIECES = ["logo-vertical", "logo-horizontal", "logo-horizontal-1-linea",
          "logo-horizontal-simple", "logo-horizontal-1-linea-simple",
          "wordmark-2-lineas", "wordmark-1-linea", "isotipo", "isotipo-simple"]


# ------------------------------------------------- íconos de app y favicon
APP = 1024


def app_icon(theme, shape="cuadrado", content_radius=0.34, background=True, uid="app"):
    """Ícono 1024×1024 con el isotipo simple centrado.

    shape: 'cuadrado' (a sangre, para iOS / maskable / Expo) o 'redondeado'
    (esquinas al 22 %, transparente fuera, para PWA "any", escritorio y redes).
    content_radius: radio del círculo que ocupa el isotipo, en fracción del lado.
    """
    art = Art(uid)
    t = THEMES[theme]
    if background:
        if theme == "tema-oscuro":
            gid = f"{uid}-fondo"
            art.defs.append(
                f'<radialGradient id="{gid}" cx="0.5" cy="0.42" r="0.75">'
                f'<stop offset="0" stop-color="{NAVY_700}"/>'
                f'<stop offset="0.55" stop-color="{NAVY_800}"/>'
                f'<stop offset="1" stop-color="{NAVY_900}"/></radialGradient>')
            fill = f"url(#{gid})"
        else:
            fill = WHITE
        rx = f' rx="{f(APP * 0.2237)}"' if shape == "redondeado" else ""
        art.body.append(f'<rect width="{APP}" height="{APP}"{rx} fill="{fill}"/>')
    k = content_radius * APP / ISO_RADIUS
    tr, _ = iso_transform(k, APP / 2, APP / 2)
    isotipo(art, t, detail=False, transform=tr)
    return art.svg((0, 0, APP, APP), 0, "SolversHub", size=(APP, APP))


def android_foreground(theme="tema-oscuro", uid="fg"):
    # zona segura de los íconos adaptativos: círculo de 66/108 del lienzo
    return app_icon(theme, content_radius=0.29, background=False, uid=uid)


def android_background(uid="bg"):
    """Capa de fondo del ícono adaptativo: el mismo radial navy del ícono de app."""
    art = Art(uid)
    art.defs.append(
        f'<radialGradient id="{uid}-fondo" cx="0.5" cy="0.42" r="0.75">'
        f'<stop offset="0" stop-color="{NAVY_700}"/><stop offset="0.55" stop-color="{NAVY_800}"/>'
        f'<stop offset="1" stop-color="{NAVY_900}"/></radialGradient>')
    art.body.append(f'<rect width="{APP}" height="{APP}" fill="url(#{uid}-fondo)"/>')
    return art.svg((0, 0, APP, APP), 0, "SolversHub", size=(APP, APP))


def android_monochrome(uid="mono"):
    return app_icon("mono-blanco", content_radius=0.29, background=False, uid=uid)


def favicon_svg(uid="fav"):
    """Favicon: silueta sólida del cerebro-foco en el degradado y check calado en blanco.

    Pensado para leerse a 16–32 px en pestañas claras y oscuras: sin mini-iconos,
    rosca reducida a dos líneas gruesas y check más grande.
    """
    art = Art(uid)
    gid = f"{uid}-degradado"
    art.defs.append(
        f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="-170" y1="120" x2="170" y2="470">'
        f'<stop offset="0" stop-color="{BLUE_500}"/><stop offset="1" stop-color="{CYAN_400}"/>'
        f'</linearGradient>')
    paint = f"url(#{gid})"
    w_base = 26.0
    art.body.append(
        f'<path d="{BRAIN}" fill="{paint}" stroke="{paint}" stroke-width="{f(g.W_MAIN)}" stroke-linejoin="round"/>'
        f'<path d="M-46 437H46M-26 476H26" fill="none" stroke="{paint}" stroke-width="{f(w_base)}" '
        f'stroke-linecap="round"/>')
    # check grande, centrado en la parte ancha del cerebro
    cx, cy = 0.0, 300.0
    k = 1.75
    a, b, c = g.CHECK
    pts = [((p[0] - g.CORE[0]) * k + cx, (p[1] - g.CORE[1]) * k + cy) for p in (a, b, c)]
    d = f"M{g.pt(pts[0])}L{g.pt(pts[1])}L{g.pt(pts[2])}"
    art.body.append(f'<path d="{d}" fill="none" stroke="{WHITE}" stroke-width="{f(g.W_CHECK * k)}" '
                    f'stroke-linecap="round" stroke-linejoin="round"/>')
    top = ISO_BOX[1]
    bottom = 476 + w_base / 2
    side = max(ISO_BOX[2] - ISO_BOX[0], bottom - top)
    mid = (top + bottom) / 2
    return art.svg((-side / 2, mid - side / 2, side / 2, mid + side / 2), 4, "SolversHub")


# --------------------------------------------------------------- salida
def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def render(jobs):
    tmp = HERE / ".jobs.json"
    tmp.write_text(json.dumps(jobs), encoding="utf-8")
    try:
        subprocess.run(["node", str(HERE / "render.mjs"), f"@{tmp}"], check=True)
    finally:
        tmp.unlink(missing_ok=True)


def main():
    for d in ("svg", "png", "favicon", "app"):
        shutil.rmtree(OUT / d, ignore_errors=True)

    jobs = []
    count = 0
    for piece in PIECES:
        for theme in THEMES:
            name = f"solvershub-{piece}-{theme}"
            svg_path = OUT / "svg" / piece / f"{name}.svg"
            write(svg_path, build_logo(piece, THEMES[theme], uid=f"sh-{piece}-{theme}"))
            long_side = 1024 if piece.startswith("isotipo") else 2048
            vb = svg_path.read_text().split('viewBox="')[1].split('"')[0].split()
            w, h = float(vb[2]), float(vb[3])
            size = {"width": long_side} if w >= h else {"height": long_side}
            jobs.append({"in": str(svg_path), "out": str(OUT / "png" / piece / f"{name}.png"), **size})
            count += 1

    # íconos de app (SVG maestros)
    icons = OUT / "svg" / "app-icon"
    for theme in ("tema-oscuro", "tema-claro"):
        write(icons / f"solvershub-appicon-{theme}.svg", app_icon(theme, uid=f"sh-app-{theme}"))
        write(icons / f"solvershub-appicon-redondeado-{theme}.svg",
              app_icon(theme, shape="redondeado", uid=f"sh-appr-{theme}"))
    write(icons / "solvershub-appicon-android-foreground.svg", android_foreground(uid="sh-fg"))
    write(icons / "solvershub-appicon-android-monochrome.svg", android_monochrome(uid="sh-mono"))
    write(icons / "solvershub-appicon-android-background.svg", android_background(uid="sh-bg"))
    write(OUT / "svg" / "favicon" / "solvershub-favicon.svg", favicon_svg(uid="sh-fav"))

    # favicon web
    fav = OUT / "favicon"
    fav.mkdir(parents=True, exist_ok=True)
    shutil.copy(OUT / "svg" / "favicon" / "solvershub-favicon.svg", fav / "favicon.svg")
    for s in (16, 32, 48, 64, 96):
        jobs.append({"in": str(fav / "favicon.svg"), "out": str(fav / f"favicon-{s}.png"), "width": s, "height": s})
    dark_sq = icons / "solvershub-appicon-tema-oscuro.svg"
    dark_rd = icons / "solvershub-appicon-redondeado-tema-oscuro.svg"
    jobs += [
        {"in": str(dark_sq), "out": str(fav / "apple-touch-icon.png"), "width": 180, "height": 180},
        {"in": str(dark_rd), "out": str(fav / "icon-192.png"), "width": 192, "height": 192},
        {"in": str(dark_rd), "out": str(fav / "icon-512.png"), "width": 512, "height": 512},
        {"in": str(dark_sq), "out": str(fav / "icon-maskable-512.png"), "width": 512, "height": 512},
    ]

    # app Expo (nombres que usa solvershub-apk/app.json)
    app = OUT / "app"
    jobs += [
        {"in": str(dark_sq), "out": str(app / "icon.png"), "width": 1024, "height": 1024},
        {"in": str(icons / "solvershub-appicon-tema-claro.svg"), "out": str(app / "icon-tema-claro.png"),
         "width": 1024, "height": 1024},
        {"in": str(icons / "solvershub-appicon-android-foreground.svg"),
         "out": str(app / "android-icon-foreground.png"), "width": 1024, "height": 1024},
        {"in": str(icons / "solvershub-appicon-android-monochrome.svg"),
         "out": str(app / "android-icon-monochrome.png"), "width": 1024, "height": 1024},
        {"in": str(icons / "solvershub-appicon-android-background.svg"),
         "out": str(app / "android-icon-background.png"), "width": 1024, "height": 1024},
        # splash y pantalla de login (fondo navy): logo vertical en tema oscuro, lienzo cuadrado
        {"in": str(OUT / "svg" / "logo-vertical" / "solvershub-logo-vertical-tema-oscuro.svg"),
         "out": str(app / "logo-transparente.png"), "width": 1024, "height": 1024},
        {"in": str(fav / "favicon.svg"), "out": str(app / "favicon.png"), "width": 48, "height": 48},
    ]
    render(jobs)

    # iOS y maskable: sin transparencia
    for p in (fav / "apple-touch-icon.png", fav / "icon-maskable-512.png", app / "icon.png",
              app / "icon-tema-claro.png", app / "android-icon-background.png"):
        Image.open(p).convert("RGB").save(p)
    # favicon.ico con 16, 32 y 48 px
    sizes = [Image.open(fav / f"favicon-{s}.png").convert("RGBA") for s in (16, 32, 48)]
    sizes[2].save(fav / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)],
                  append_images=sizes[:2])

    write(fav / "site.webmanifest", json.dumps({
        "name": "SolversHub — Centro de soluciones impulsado con IA",
        "short_name": "SolversHub",
        "start_url": "/",
        "display": "standalone",
        "background_color": NAVY_900,
        "theme_color": NAVY_700,
        "icons": [
            {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }, ensure_ascii=False, indent=2) + "\n")
    head = (
        '<link rel="icon" href="/favicon.ico" sizes="48x48">\n'
        '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
        '<link rel="manifest" href="/site.webmanifest">\n'
        f'<meta name="theme-color" content="{NAVY_900}" media="(prefers-color-scheme: dark)">\n'
        f'<meta name="theme-color" content="{PAPER}" media="(prefers-color-scheme: light)">\n')
    write(fav / "head.html", head)
    write(OUT / "index.html", preview.render_index(list(THEMES), head))

    print(f"SVG: {count + 8}  ·  PNG: {len(jobs)}  ·  favicon.ico listo")


if __name__ == "__main__":
    sys.exit(main())
