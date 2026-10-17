"""Build the Caravan "Route C" logo system as exact SVG geometry.

Usage: python build.py <repo_root> <out_dir>
"""
import io, json, math, sys, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

ROOT = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
PN = ROOT / "node_modules/.pnpm"
INTER = PN / "@fontsource-variable+inter@5.3.0/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"
PLEX = PN / "@fontsource+ibm-plex-sans-arabic@5.3.0/node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2"

INK, GREEN, CORAL, PAPER = "#20231F", "#3F5A45", "#E8765A", "#F3F0E7"

# ---- Mark geometry (100-unit design box) -------------------------------------------------
CX = CY = 50.0
R = 34.0            # centreline radius
S = 14.0            # stroke width  -> stroke : outer diameter = 14 : 82
START = -40.0       # degrees, SVG coords (y down); route starts upper right
SWEEP = 280.0       # travels anticlockwise over the top, round the left, to lower right
WAY_T = (0.25, 0.5, 0.75)
WAY_D = S * 0.62    # waypoint dot diameter (sits inside the stroke)
TERM_D = S * 1.5    # terminal dot diameter


def pt(t, r=R):
    a = math.radians(START - t * SWEEP)
    return CX + r * math.cos(a), CY + r * math.sin(a)


def route_d(r=R):
    x0, y0 = pt(0, r); x1, y1 = pt(1, r)
    # large-arc=1, sweep-flag=0 (anticlockwise in SVG)
    return f"M{x0:.3f} {y0:.3f}A{r} {r} 0 1 0 {x1:.3f} {y1:.3f}"


def mark_group(route=GREEN, dots=CORAL, waypoints=True, stroke=S, term=TERM_D, ids=False, tx=0, ty=0, scale=1, knockout=False, mid="m"):
    idr = ' id="route"' if ids else ""
    g = [f'<g transform="translate({tx:.3f} {ty:.3f}) scale({scale:.5f})">']
    if knockout:
        holes = "".join(f'<circle cx="{pt(t)[0]:.3f}" cy="{pt(t)[1]:.3f}" r="{WAY_D/2:.3f}" fill="black"/>' for t in WAY_T)
        g.append(f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="white"/>{holes}</mask>')
        g.append(f'<path{idr} d="{route_d()}" fill="none" stroke="{route}" stroke-width="{stroke}" stroke-linecap="round" mask="url(#{mid})"/>')
        waypoints = False
    else:
        g.append(f'<path{idr} d="{route_d()}" fill="none" stroke="{route}" stroke-width="{stroke}" stroke-linecap="round"/>')
    if waypoints:
        for i, t in enumerate(WAY_T, 1):
            x, y = pt(t)
            idw = f' id="waypoint-{i}"' if ids else ""
            g.append(f'<circle{idw} cx="{x:.3f}" cy="{y:.3f}" r="{WAY_D/2:.3f}" fill="{dots}"/>')
    x, y = pt(1)
    idt = ' id="terminal"' if ids else ""
    g.append(f'<circle{idt} cx="{x:.3f}" cy="{y:.3f}" r="{term/2:.3f}" fill="{dots}"/>')
    g.append("</g>")
    return "".join(g)


def svg(w, h, body, bg=None, extra=""):
    rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{extra}{rect}{body}</svg>\n'


# ---- Text outlining ------------------------------------------------------------------------
def load_font(path, wght=None):
    f = TTFont(str(path))
    if wght is not None and "fvar" in f:
        f = instantiateVariableFont(f, {"wght": wght})
    buf = io.BytesIO(); f.flavor = None; f.save(buf)
    return f, buf.getvalue()


INTER_F, INTER_B = load_font(INTER, 600)
PLEX_F, PLEX_B = load_font(PLEX)


def shape(text, font, blob, size, x, baseline, direction="ltr", fill=INK, tracking=0.0):
    """Return (svg path markup, advance width in px) for shaped text, outlined."""
    face = hb.Face(blob); hbf = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    buf.direction = direction
    hb.shape(hbf, buf, {"kern": True, "liga": True})
    upem = font["head"].unitsPerEm; k = size / upem
    gs = font.getGlyphSet(); order = font.getGlyphOrder()
    pen_x = 0.0; parts = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        sp = SVGPathPen(gs)
        tp = TransformPen(sp, (k, 0, 0, -k, x + (pen_x + pos.x_offset) * k, baseline - pos.y_offset * k))
        gs[name].draw(tp)
        d = sp.getCommands()
        if d: parts.append(d)
        pen_x += pos.x_advance + tracking * upem
    return f'<path d="{" ".join(parts)}" fill="{fill}"/>', pen_x * k


def metrics(font):
    os2 = font["OS/2"]; upem = font["head"].unitsPerEm
    return os2.sCapHeight / upem, os2.sxHeight / upem


CAP, XH = metrics(INTER_F)

# ---- Wordmark: mark as the "C" -------------------------------------------------------------
OUTER = 2 * R + S                     # 82 units outer diameter
FS = 200.0                            # font size px
cap_px = CAP * FS
mark_scale = (cap_px * 1.06) / OUTER  # round-letter overshoot ~6%
mark_h = OUTER * mark_scale
BASE = 40.0 + cap_px + (mark_h - cap_px) / 2
mark_top = BASE - cap_px - (mark_h - cap_px) / 2
mark_left = 40.0
mtx = mark_left - (CX - R - S / 2) * mark_scale
mty = mark_top - (CY - R - S / 2) * mark_scale
mark_right = mark_left + OUTER * mark_scale
GAP = FS * 0.045
txt, adv = shape("aravan", INTER_F, INTER_B, FS, mark_right + GAP, BASE, tracking=-0.01)
W = int(mark_right + GAP + adv + 40); H = int(BASE + (mark_h - cap_px) / 2 + 40)
wordmark_body = mark_group(tx=mtx, ty=mty, scale=mark_scale) + txt
files = {}
files["wordmark-c-as-mark.svg"] = svg(W, H, wordmark_body)
files["wordmark-c-as-mark-reversed.svg"] = svg(W, H, mark_group(route=PAPER, tx=mtx, ty=mty, scale=mark_scale) + txt.replace(INK, PAPER), bg=GREEN)

# ---- Horizontal lockup: mark + full word -----------------------------------------------------
LS = 1.1
lt = 30 / 1; lscale = 1.6
lock_mark = mark_group(tx=20, ty=20, scale=lscale)
lw_txt, ladv = shape("Caravan", INTER_F, INTER_B, 120, 20 + 100 * lscale + 18, 20 + 50 * lscale + CAP * 120 / 2, tracking=-0.01)
files["lockup-horizontal.svg"] = svg(int(20 + 100 * lscale + 18 + ladv + 30), int(100 * lscale + 40), lock_mark + lw_txt)

# Stacked
st_txt, sadv = shape("Caravan", INTER_F, INTER_B, 72, 0, 0, tracking=-0.01)
SW = int(max(sadv, 160) + 80)
st_txt, _ = shape("Caravan", INTER_F, INTER_B, 72, (SW - sadv) / 2, 260, tracking=-0.01)
files["lockup-stacked.svg"] = svg(SW, 300, mark_group(tx=(SW - 160) / 2, ty=20, scale=1.6) + st_txt)

# ---- Arabic lockup (Arabic-first, RTL: mark on the right) ------------------------------------
ar_txt, aradv = shape("كارافان", PLEX_F, PLEX_B, 120, 30, 20 + 50 * lscale + 40, direction="rtl")
AW = int(30 + aradv + 22 + 100 * lscale + 20)
ar_mark = mark_group(tx=30 + aradv + 22, ty=20, scale=lscale)
files["lockup-arabic.svg"] = svg(AW, int(100 * lscale + 40), ar_txt + ar_mark)
ar_only, aro = shape("كارافان", PLEX_F, PLEX_B, 120, 20, 150, direction="rtl")
files["wordmark-arabic.svg"] = svg(int(aro + 40), 220, ar_only)

# Bilingual side by side: [mark Caravan | كارافان]
bi_en, bien = shape("Caravan", INTER_F, INTER_B, 96, 20 + 100 * 1.3 + 16, 20 + 50 * 1.3 + CAP * 96 / 2, tracking=-0.01)
x_ar = 20 + 100 * 1.3 + 16 + bien + 60
bi_ar, biar = shape("كارافان", PLEX_F, PLEX_B, 96, x_ar, 20 + 50 * 1.3 + CAP * 96 / 2 + 6, direction="rtl")
divider = f'<rect x="{x_ar - 30:.1f}" y="40" width="2" height="{100*1.3-40:.1f}" fill="{INK}" opacity=".25"/>'
files["lockup-bilingual.svg"] = svg(int(x_ar + biar + 30), int(100 * 1.3 + 40), mark_group(tx=20, ty=20, scale=1.3) + bi_en + divider + bi_ar)

# ---- Mark variants ------------------------------------------------------------------------------
files["mark.svg"] = svg(100, 100, mark_group())
files["mark-mono-ink.svg"] = svg(100, 100, mark_group(route=INK, dots=INK, knockout=True, mid="mk1"))
files["mark-paper-on-green.svg"] = svg(100, 100, mark_group(route=PAPER), bg=GREEN)
files["mark-paper-on-ink.svg"] = svg(100, 100, mark_group(route=PAPER, dots=PAPER, knockout=True, mid="mk2"), bg=INK)

# Animation-ready mark: open route path + separately named dots
files["route-stroke.svg"] = svg(100, 100, mark_group(ids=True))

# ---- App icon & favicons ------------------------------------------------------------------------
def app_icon(bg, route, dots):
    s = 1024; inner = s * 0.62 / 100
    off = (s - 100 * inner) / 2
    return svg(s, s, f'<rect width="{s}" height="{s}" rx="{s*0.225:.1f}" fill="{bg}"/>' + mark_group(route=route, dots=dots, tx=off, ty=off, scale=inner))

files["app-icon-1024.svg"] = app_icon(GREEN, PAPER, CORAL)
files["app-icon-1024-light.svg"] = app_icon(PAPER, GREEN, CORAL)

# Favicon: C + terminal dot only, heavier stroke, slightly smaller sweep so the opening stays clear
def favicon(size, bg=GREEN, route=PAPER, dots=CORAL):
    fstroke = 20.0; fterm = 26.0
    sc = size / 100
    body = (f'<rect width="{size}" height="{size}" rx="{size*0.22:.2f}" fill="{bg}"/>'
            + mark_group(route=route, dots=dots, waypoints=False, stroke=fstroke, term=fterm, tx=0, ty=0, scale=sc * 0.92).replace(
                "translate(0.000 0.000)", f"translate({size*0.04:.3f} {size*0.04:.3f})"))
    return svg(size, size, body)

files["favicon-32.svg"] = favicon(32)
files["favicon-16.svg"] = favicon(16)

# ---- Animated preview (CSS, respects reduced motion) --------------------------------------------
route_len = R * math.radians(SWEEP)
css = f"""<style>
#route{{stroke-dasharray:{route_len:.2f};stroke-dashoffset:{route_len:.2f};animation:draw .6s cubic-bezier(.2,.8,.2,1) forwards}}
#waypoint-1,#waypoint-2,#waypoint-3,#terminal{{transform-box:fill-box;transform-origin:center;transform:scale(0);animation:pop .28s cubic-bezier(.3,1.6,.5,1) forwards}}
#waypoint-1{{animation-delay:.25s}}#waypoint-2{{animation-delay:.37s}}#waypoint-3{{animation-delay:.49s}}#terminal{{animation-delay:.62s}}
@keyframes draw{{to{{stroke-dashoffset:0}}}}@keyframes pop{{to{{transform:scale(1)}}}}
@media (prefers-reduced-motion:reduce){{#route{{animation:none;stroke-dashoffset:0}}#waypoint-1,#waypoint-2,#waypoint-3,#terminal{{animation:none;transform:none}}}}
</style>"""
files["mark-animated.svg"] = svg(100, 100, mark_group(ids=True), extra=css)

for name, content in files.items():
    (OUT / name).write_text(content)

spec = {
    "designBox": 100, "centre": [CX, CY], "centrelineRadius": R, "strokeWidth": S,
    "outerDiameter": OUTER, "strokeToOuterDiameter": round(S / OUTER, 3),
    "startAngleDeg": START, "sweepDeg": SWEEP, "opening": "right, 80 degrees",
    "waypoints": {"t": WAY_T, "anglesFromStartDeg": [t * SWEEP for t in WAY_T], "diameter": WAY_D},
    "terminalDiameter": TERM_D, "clearSpace": f"terminal diameter x2 = {TERM_D*2} units",
    "routeLength": round(route_len, 2),
    "wordmark": {"font": "Inter Variable instanced at wght 600 (OFL)", "markHeightToCapHeight": 1.06, "gapEm": 0.045, "trackingEm": -0.01},
    "arabic": {"font": "IBM Plex Sans Arabic 600 (OFL)", "text": "كارافان", "review": "native Arabic review required"},
    "favicon": {"waypoints": False, "strokeWidth": 20, "terminalDiameter": 26},
    "palette": {"ink": INK, "green": GREEN, "coral": CORAL, "paper": PAPER},
    "files": sorted(files),
}
(OUT / "spec.json").write_text(json.dumps(spec, indent=1, ensure_ascii=False))
print("wrote", len(files), "svgs")
