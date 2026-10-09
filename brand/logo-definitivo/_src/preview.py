"""Lámina de previsualización del set (brand/logo-definitivo/index.html)."""
from html import escape

THEME_LABEL = {
    "tema-oscuro": "Tema oscuro",
    "tema-claro": "Tema claro",
    "mono-blanco": "Mono blanco",
    "mono-navy": "Mono navy",
}
THEME_NOTE = {
    "tema-oscuro": "Sobre navy 900/950",
    "tema-claro": "Sobre blanco o paper",
    "mono-blanco": "Fotos y fondos de color",
    "mono-navy": "Impresión a una tinta",
}
TILE_BG = {"tema-oscuro": "dark", "tema-claro": "light", "mono-blanco": "brand", "mono-navy": "white"}

SECTIONS = [
    ("logos", "Logo", [
        ("logo-vertical", "Vertical · logo principal",
         "El logo definitivo. Portadas, splash de la app, presentaciones, redes y merchandising."),
        ("logo-horizontal", "Horizontal · 2 líneas",
         "Cabeceras de la landing y del panel, documentos y propuestas."),
        ("logo-horizontal-1-linea", "Horizontal · 1 línea",
         "Espacios bajos: barras de navegación, pies de página y banners."),
    ]),
    ("pequenos", "Logo para tamaños pequeños", [
        ("logo-horizontal-simple", "Horizontal simple · 2 líneas",
         "Por debajo de 240 px de ancho: usa el isotipo sin mini-iconos para que no se empaste."),
        ("logo-horizontal-1-linea-simple", "Horizontal simple · 1 línea",
         "Firmas de correo, barra lateral del panel, cabecera de la app."),
    ]),
    ("wordmarks", "Wordmark (solo texto)", [
        ("wordmark-2-lineas", "Wordmark · 2 líneas",
         "SOLVERS sobre — HUB —, como en el logo. Cuando el isotipo ya aparece cerca."),
        ("wordmark-1-linea", "Wordmark · 1 línea",
         "SOLVERSHUB en una línea; HUB se distingue por color, nunca por un espacio."),
    ]),
    ("isotipos", "Isotipo", [
        ("isotipo", "Isotipo completo",
         "Cerebro-foco con los mini-iconos. Desde 96 px."),
        ("isotipo-simple", "Isotipo simple",
         "Sin mini-iconos. De 24 a 96 px, avatares y espacios reducidos."),
    ]),
]

APP_ICONS = [
    ("svg/app-icon/solvershub-appicon-tema-oscuro.svg", "Cuadrado · oscuro",
     "iOS, Expo icon.png, apple-touch-icon, maskable"),
    ("svg/app-icon/solvershub-appicon-tema-claro.svg", "Cuadrado · claro", "Variante clara (iOS 18 claro)"),
    ("svg/app-icon/solvershub-appicon-redondeado-tema-oscuro.svg", "Redondeado · oscuro",
     "PWA “any”, escritorio, avatar de redes"),
    ("svg/app-icon/solvershub-appicon-redondeado-tema-claro.svg", "Redondeado · claro",
     "PWA y escritorio en tema claro"),
    ("svg/app-icon/solvershub-appicon-android-foreground.svg", "Android · primer plano",
     "Ícono adaptativo sobre #172F6C (zona segura 66/108)"),
    ("svg/app-icon/solvershub-appicon-android-monochrome.svg", "Android · monocromo",
     "Íconos temáticos de Android 13+"),
]
# capas transparentes de Android: se muestran sobre el fondo del ícono adaptativo
ON_NAVY = {"svg/app-icon/solvershub-appicon-android-foreground.svg",
           "svg/app-icon/solvershub-appicon-android-monochrome.svg"}

PALETTE = [
    ("--sh-navy-950", "#080F22", "Fondos profundos, hero"),
    ("--sh-navy-900", "#0B1733", "Fondo base oscuro · tinta del logo en claro"),
    ("--sh-navy-800", "#11224D", "Superficies en oscuro"),
    ("--sh-navy-700", "#172F6C", "Primario de marca"),
    ("--sh-navy-600", "#21408A", "Hover, bordes"),
    ("--sh-blue-500", "#2F6BFF", "Inicio del degradado · HUB en tema claro"),
    ("--sh-cyan-400", "#22C7E0", "Fin del degradado · HUB en tema oscuro"),
    ("--sh-paper", "#F7F9FC", "Fondo claro principal"),
    ("--sh-white", "#FFFFFF", "Tinta del logo en oscuro"),
]

CSS = """
:root{--bg:#EEF2F8;--surface:#FFFFFF;--text:#0B1733;--muted:#5A6B85;--line:#E2E8F2;--accent:#2560E6;
--dark:#0B1733;--light:#F7F9FC;--brand:#172F6C;--white:#FFFFFF;--radius:16px}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#080F22;--surface:#11224D;--text:#E8EDF7;
--muted:#A9B6CC;--line:rgba(201,210,227,.12);--accent:#22C7E0}}
:root[data-theme=dark]{--bg:#080F22;--surface:#11224D;--text:#E8EDF7;--muted:#A9B6CC;
--line:rgba(201,210,227,.12);--accent:#22C7E0}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font:400 16px/1.6 Inter,"Segoe UI",system-ui,sans-serif}
h1,h2,h3{font-family:Montserrat,"Century Gothic",system-ui,sans-serif;letter-spacing:-.02em;margin:0}
a{color:var(--accent)}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}
header.top{padding:40px 0 24px}
.brandbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.brandbar img{height:56px;width:auto}
.lead{color:var(--muted);max-width:68ch;margin:16px 0 0}
nav{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding-top:8px;padding-bottom:8px}
nav .wrap::-webkit-scrollbar{display:none}
nav a{white-space:nowrap;text-decoration:none;color:var(--muted);font-weight:500;font-size:14px;
padding:6px 12px;border-radius:999px}
nav a:hover,nav a:focus-visible{color:var(--text);background:var(--surface);outline:none}
section{padding:40px 0 8px}
section>h2{font-size:28px;font-weight:700;margin-bottom:8px}
.piece{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:20px;margin:20px 0}
.piece h3{font-size:19px;font-weight:600}
.piece p{color:var(--muted);margin:4px 0 16px;max-width:75ch}
.grid{display:grid;gap:12px;grid-template-columns:1fr}
@media (min-width:560px){.grid{grid-template-columns:repeat(2,1fr)}}
@media (min-width:1000px){.grid:not(.wide){grid-template-columns:repeat(4,1fr)}}
.tile{border-radius:12px;overflow:hidden;border:1px solid var(--line);display:flex;flex-direction:column}
.stage{display:flex;align-items:center;justify-content:center;padding:28px 20px;min-height:200px}
.stage img{max-width:100%;max-height:220px;height:auto}
.wide .stage img{max-height:150px}
.stage.dark{background:#0B1733}.stage.light{background:#F7F9FC}.stage.brand{background:#172F6C}
.stage.white{background:#FFFFFF}
.meta{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 14px;
background:var(--surface);font-size:13px;border-top:1px solid var(--line)}
.meta b{font-weight:600}.meta span{color:var(--muted)}
.dl{display:flex;gap:10px}.dl a{font-weight:600;text-decoration:none}
.dl a:hover{text-decoration:underline}
.apps{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
.app{text-align:center}
.app .stage{min-height:0;padding:20px;background:repeating-conic-gradient(#E2E8F2 0 25%,#fff 0 50%) 0 0/16px 16px}
.app img{width:120px;height:120px}
.app .stage.navy{background:#172F6C}
.app .cap{font-size:13px;padding:10px 8px}
.app .cap b{display:block;font-weight:600}.app .cap span{color:var(--muted)}
.tabs{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.tabbar{border-radius:12px;padding:12px 12px 0;border:1px solid var(--line)}
.tabbar.d{background:#202124}.tabbar.l{background:#DEE1E6}
.tab{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px 10px 0 0;
font:400 13px/1 system-ui,sans-serif}
.tabbar.d .tab{background:#35363A;color:#E8EAED}.tabbar.l .tab{background:#fff;color:#202124}
.px{display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap;margin-top:16px}
.px figure{margin:0;text-align:center;font-size:12px;color:var(--muted)}
.px img{image-rendering:pixelated;display:block;margin:0 auto 6px;background:#fff;
border:1px solid var(--line);border-radius:6px}
.swatches{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
.sw{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface)}
.sw i{display:block;height:72px}
.sw div{padding:10px 12px;font-size:13px}
.sw code{font:500 12px/1.4 "JetBrains Mono",ui-monospace,monospace}
.sw span{display:block;color:var(--muted)}
.rules{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.rule{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px}
.rule h3{font-size:16px;margin-bottom:6px}
.rule ul{margin:0;padding-left:18px;color:var(--muted)}
pre{background:#0B1733;color:#E8EDF7;border-radius:12px;padding:16px;overflow-x:auto;
font:500 13px/1.6 "JetBrains Mono",ui-monospace,monospace}
footer{padding:40px 0;color:var(--muted);font-size:14px}
"""


def _tile(piece, theme):
    svg = f"svg/{piece}/solvershub-{piece}-{theme}.svg"
    png = f"png/{piece}/solvershub-{piece}-{theme}.png"
    return (
        f'<div class="tile"><div class="stage {TILE_BG[theme]}">'
        f'<img src="{svg}" alt="SolversHub · {escape(THEME_LABEL[theme])}" loading="lazy"></div>'
        f'<div class="meta"><div><b>{THEME_LABEL[theme]}</b><br><span>{THEME_NOTE[theme]}</span></div>'
        f'<div class="dl"><a href="{svg}" download>SVG</a><a href="{png}" download>PNG</a></div></div></div>')


def render_index(themes, head_html):
    nav = "".join(f'<a href="#{sid}">{escape(title)}</a>' for sid, title, _ in SECTIONS)
    nav += ('<a href="#app">Íconos de app</a><a href="#favicon">Favicon</a>'
            '<a href="#color">Color</a><a href="#uso">Uso</a>')
    body = []
    for sid, title, pieces in SECTIONS:
        body.append(f'<section id="{sid}"><h2>{escape(title)}</h2>')
        for piece, name, note in pieces:
            tiles = "".join(_tile(piece, t) for t in themes)
            wide = " wide" if piece.startswith(("logo-horizontal", "wordmark")) else ""
            body.append(f'<div class="piece"><h3>{escape(name)}</h3><p>{escape(note)}</p>'
                        f'<div class="grid{wide}">{tiles}</div></div>')
        body.append("</section>")

    apps = "".join(
        f'<div class="tile app"><div class="stage{" navy" if p in ON_NAVY else ""}">'
        f'<img src="{p}" alt="{escape(n)}" loading="lazy"></div>'
        f'<div class="cap"><b>{escape(n)}</b><span>{escape(u)}</span></div></div>'
        for p, n, u in APP_ICONS)
    body.append(
        '<section id="app"><h2>Íconos de app</h2><div class="piece">'
        '<p>Isotipo simple sobre navy (radial #172F6C → #0B1733) o blanco. Los PNG listos para la app '
        'Expo están en <code>app/</code> con los nombres que usa <code>app.json</code>.</p>'
        f'<div class="apps">{apps}</div></div></section>')

    px = "".join(
        f'<figure><img src="favicon/favicon-{s}.png" width="{s * 3}" height="{s * 3}" alt="">{s} px</figure>'
        for s in (16, 32, 48))
    tab = ('<span class="tab"><img src="favicon/favicon.svg" width="16" height="16" alt="">'
           'SolversHub — Panel</span>')
    body.append(
        '<section id="favicon"><h2>Favicon</h2><div class="piece">'
        '<p>Silueta sólida del cerebro-foco en el degradado de marca con el check en blanco. '
        'Se lee igual en pestañas claras y oscuras, así que un solo archivo sirve para ambos temas.</p>'
        f'<div class="tabs"><div class="tabbar d">{tab}</div><div class="tabbar l">{tab}</div></div>'
        f'<div class="px">{px}</div>'
        f'<p style="margin-top:20px">Etiquetas para el <code>&lt;head&gt;</code> '
        f'(archivos en <code>favicon/</code>):</p><pre>{escape(head_html)}</pre></div></section>')

    sw = "".join(
        f'<div class="sw"><i style="background:{hx}"></i><div><code>{hx}</code>'
        f'<span>{escape(tok)}</span><span>{escape(use)}</span></div></div>' for tok, hx, use in PALETTE)
    sw += ('<div class="sw"><i style="background:linear-gradient(135deg,#2F6BFF,#22C7E0)"></i><div>'
           '<code>#2F6BFF → #22C7E0</code><span>Degradado de marca</span>'
           '<span>Núcleo del isotipo (135°) y V-check (horizontal)</span></div></div>')
    body.append(f'<section id="color"><h2>Color</h2><div class="piece"><p>Solo la paleta del manual '
                f'(§5.1). El cian no se usa como texto sobre blanco: en el tema claro HUB pasa a azul 500.</p>'
                f'<div class="swatches">{sw}</div></div></section>')

    body.append(
        '<section id="uso"><h2>Uso</h2><div class="rules">'
        '<div class="rule"><h3>Área de respeto</h3><ul><li>Deja libre alrededor del logo el radio del '
        'núcleo del isotipo (≈ 1/5 de su altura) por cada lado.</li></ul></div>'
        '<div class="rule"><h3>Tamaños mínimos</h3><ul><li>Horizontal: 120 px de ancho (versión simple '
        'por debajo de 240 px).</li><li>Isotipo simple: 24 px. Isotipo completo: 96 px.</li>'
        '<li>Por debajo de 24 px, el favicon.</li></ul></div>'
        '<div class="rule"><h3>Elige el tema por el fondo</h3><ul><li>Fondos navy u oscuros: tema oscuro.</li>'
        '<li>Blanco o paper: tema claro.</li><li>Fotos o una sola tinta: monocromo.</li></ul></div>'
        '<div class="rule"><h3>Nunca</h3><ul><li>Deformar, rotar ni cambiar proporciones.</li>'
        '<li>Recolorear fuera de la paleta o cambiar el degradado.</li>'
        '<li>Quitar el check de la V ni separar SOLVERS de HUB.</li></ul></div></div></section>')

    return (
        '<!doctype html><html lang="es"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>SolversHub · Set de marca</title>'
        '<link rel="icon" href="favicon/favicon.svg" type="image/svg+xml">'
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&'
        'family=Montserrat:wght@600;700&display=swap" rel="stylesheet">'
        f'<style>{CSS}</style></head><body>'
        '<header class="top"><div class="wrap"><div class="brandbar">'
        '<picture><source srcset="svg/logo-horizontal/solvershub-logo-horizontal-tema-oscuro.svg" '
        'media="(prefers-color-scheme: dark)"><img src="svg/logo-horizontal/solvershub-logo-horizontal-tema-claro.svg" '
        'alt="SolversHub"></picture></div>'
        '<h1 style="font-size:clamp(2rem,4vw,3rem);font-weight:700;margin-top:28px">Set de marca</h1>'
        '<p class="lead">Logo definitivo vectorizado: logos, wordmarks de 1 y 2 líneas, isotipos, íconos de '
        'app y favicon, en tema oscuro, tema claro y monocromo. Colores y tipografía del manual de marca '
        '(Montserrat Bold; degradado #2F6BFF → #22C7E0). Cada pieza descarga en SVG (maestro) y PNG.</p>'
        f'</div></header><nav aria-label="Secciones"><div class="wrap">{nav}</div></nav>'
        f'<main class="wrap">{"".join(body)}</main>'
        '<footer class="wrap">SolversHub — Centro de soluciones impulsado con IA. Un producto de Roshi. '
        'Generado con <code>_src/build.py</code>.</footer></body></html>\n')
