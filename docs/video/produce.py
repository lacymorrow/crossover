#!/usr/bin/env python3
"""
CrossOver Promo Video Production — LAC-309
35-second motion-graphics promo using CrossOver's own crosshair library.
Pillow handles all frame generation/text; ffmpeg handles video encoding.

Output: docs/video/crossover-promo-{9x16,16x9,1x1}-draft.mp4
"""
import subprocess
import sys
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ── Config ───────────────────────────────────────────────────────────────────
REPO = Path("/Users/lacy/repo/crossover")
XH   = REPO / "src/static/crosshairs"
ICON = REPO / "build/icon.png"
OUT  = REPO / "docs/video"
TMP  = Path("/tmp/xover-v")
W, H, FPS = 1080, 1920, 30

OUT.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)

# ── Font setup ───────────────────────────────────────────────────────────────
_TTC   = "/System/Library/Fonts/HelveticaNeue.ttc"
_BOLD  = 1
_REG   = 0

def fnt(size, bold=True):
    return ImageFont.truetype(_TTC, size, index=_BOLD if bold else _REG)

# ── Shell helpers ─────────────────────────────────────────────────────────────
def sh(cmd, check=True):
    cmd = [str(c) for c in cmd]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if check and r.returncode != 0:
        print("ERR:", r.stderr[-1500:], file=sys.stderr)
        raise RuntimeError(f"Failed: {' '.join(cmd[:4])}")
    return r

def ff(*args):
    return sh(["ffmpeg", "-y"] + [str(a) for a in args])

# ── Pillow frame helpers ──────────────────────────────────────────────────────
def make_bg():
    c1, c2 = np.array([10,10,20], np.float32), np.array([15,15,32], np.float32)
    t = np.linspace(0, 1, H, np.float32)
    arr = (c1 + (c2 - c1) * t[:, None]).astype(np.uint8)
    arr = np.broadcast_to(arr[:, None, :], (H, W, 3)).copy()
    return Image.fromarray(arr, "RGB")

def make_solid(color=(5, 5, 8)):
    return Image.new("RGB", (W, H), color)

def paste_png(bg, path, scale, cx_off=0, cy_off=0):
    src = Image.open(str(path)).convert("RGBA")
    src = src.resize((scale, scale), Image.LANCZOS)
    x = (W - scale) // 2 + cx_off
    y = (H - scale) // 2 + cy_off
    out = bg.copy().convert("RGBA")
    out.paste(src, (x, y), src.split()[3])
    return out.convert("RGB")

def draw_text(draw, text, font_obj, y, color=(255,255,255), shadow=True):
    bb = draw.textbbox((0,0), text, font=font_obj)
    x = (W - (bb[2]-bb[0])) // 2
    if shadow:
        draw.text((x+3, y+3), text, font=font_obj, fill=(0,0,0,180))
    draw.text((x, y), text, font=font_obj, fill=color)

def _text_w(text, font_obj):
    img_tmp = Image.new("RGB", (1, 1))
    d = ImageDraw.Draw(img_tmp)
    bb = d.textbbox((0, 0), text, font=font_obj)
    return bb[2] - bb[0]

def auto_fnt(text, max_size, max_w=None, bold=True):
    """Largest font size where text fits within max_w (default W-80)."""
    if max_w is None:
        max_w = W - 80
    for size in range(max_size, 24, -2):
        f = fnt(size, bold=bold)
        if _text_w(text, f) <= max_w:
            return f
    return fnt(24, bold=bold)

def add_vo(img, lines):
    draw = ImageDraw.Draw(img)
    for item in lines:
        text, fs, yf = item[:3]
        color = item[3] if len(item) == 4 else (255, 255, 255)
        f = auto_fnt(text, fs)
        draw_text(draw, text, f, int(H * yf), color=color)

# ── Video helpers ─────────────────────────────────────────────────────────────
def to_clip(img, name, duration):
    png = TMP / f"{name}.png"
    mp4 = TMP / f"{name}.mp4"
    img.save(str(png))
    ff("-loop","1","-t",str(duration),"-i",str(png),
       "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FPS),
       "-vf",f"scale={W}:{H}:force_original_aspect_ratio=disable", mp4)
    return mp4

def concat(clips, dst):
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    fc = "".join(f"[{i}:v]" for i in range(len(clips)))
    fc += f"concat=n={len(clips)}:v=1:a=0[out]"
    ff(*inputs, "-filter_complex", fc, "-map", "[out]",
       "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FPS), dst)

VO = [0.752, 0.806, 0.855]

# ════════════════════════════════════════════════════════════════════════════
# SCENE 1  HOOK — 3 s
# ════════════════════════════════════════════════════════════════════════════
print("Scene 1 — Hook...")
clips_s1 = []
for i, (style, game, gcolor) in enumerate([
    ("tiny_dot",  "VALORANT",     (255,70,85)),
    ("fat_cross", "CS2",          (227,169,81)),
    ("sm_cross",  "APEX LEGENDS", (218,41,42)),
]):
    img = make_bg()
    draw = ImageDraw.Draw(img)
    cx, cy = W//2, H//2

    if style == "tiny_dot":
        draw.ellipse([cx-4,cy-4,cx+4,cy+4], fill=(255,255,255))
    elif style == "fat_cross":
        draw.rectangle([cx-6,cy-92,cx+6,cy+92], fill=(255,255,255))
        draw.rectangle([cx-92,cy-6,cx+92,cy+6], fill=(255,255,255))
    else:
        draw.line([cx-20,cy,cx+20,cy], fill=(128,128,128), width=3)
        draw.line([cx,cy-20,cx,cy+20], fill=(128,128,128), width=3)

    draw_text(draw, game, fnt(52), cy-240, color=gcolor)
    draw_text(draw, "default crosshair", fnt(30,False), cy+220, color=(90,90,108))
    add_vo(img, [
        ("Your crosshair looks like", 72, VO[0]),
        ("it was drawn in MS Paint.", 72, VO[1]),
    ])
    clips_s1.append(to_clip(img, f"s1_{i}", 1))

seg1 = TMP / "seg1.mp4"
concat(clips_s1, seg1)
print("  ✓ Scene 1")

# ════════════════════════════════════════════════════════════════════════════
# SCENE 2  Body 1 — 5 s  (app icon + crosshair)
# ════════════════════════════════════════════════════════════════════════════
print("Scene 2 — Body 1...")
img = make_bg()
icon = Image.open(str(ICON)).convert("RGBA")
icon = icon.resize((280,280), Image.LANCZOS)
img = img.convert("RGBA")
img.paste(icon, ((W-280)//2, H//2-420), icon.split()[3])
img = img.convert("RGB")
img = paste_png(img, XH/"Crosshair Simple/Cyan.png", scale=360, cy_off=80)
draw = ImageDraw.Draw(img)
draw.line([200,H//2-80,W-200,H//2-80], fill=(40,40,72), width=1)
add_vo(img, [
    ("One app. One crosshair.", 72, VO[0]),
    ("Pinned to your screen", 60, VO[1]),
    ("no matter what you're playing.", 56, VO[2]),
])
seg2 = to_clip(img, "seg2", 5)
print("  ✓ Scene 2")

# ════════════════════════════════════════════════════════════════════════════
# SCENE 3  Body 2 — 5 s  (crosshair gallery)
# ════════════════════════════════════════════════════════════════════════════
print("Scene 3 — Gallery...")
gallery = [
    (XH/"Actual/mil-dot.png",           "Scope Reticle", (210,210,210), (22,22,44)),
    (XH/"Chevron/Pink.png",             "Chevron",       (255,105,180), None),
    (XH/"X-Hair Simple/Cyan.png",       "X-Hair",        (0,212,255),   None),
    (XH/"Circle Dot Simple/Orange.png", "Circle Dot",    (255,140,0),   None),
    (XH/"Crosshair Simple/Yellow.png",  "Classic Cross", (255,221,0),   None),
]
clips_s3 = []
for j, (path, cat, lc, solid) in enumerate(gallery):
    bg = Image.new("RGB",(W,H),solid) if solid else make_bg()
    img = paste_png(bg, path, scale=440, cy_off=-80)
    draw = ImageDraw.Draw(img)
    draw_text(draw, cat, fnt(36,False), H//2-330, color=lc)
    add_vo(img, [
        ("Swap between real optics, dots,", 64, VO[0]),
        ("chevrons — or drag in any image.", 64, VO[1]),
        ("Your logo, a pizza emoji, whatever.", 56, VO[2]),
    ])
    clips_s3.append(to_clip(img, f"s3_{j}", 1))
seg3 = TMP / "seg3.mp4"
concat(clips_s3, seg3)
print("  ✓ Scene 3")

# ════════════════════════════════════════════════════════════════════════════
# SCENE 4  Body 3 — 5 s  (multi-game)
# ════════════════════════════════════════════════════════════════════════════
print("Scene 4 — Multi-game...")
clips_s4 = []
for k, (gname, gc) in enumerate([
    ("VALORANT",     (255,70,85)),
    ("APEX LEGENDS", (218,41,42)),
    ("CS2",          (227,169,81)),
    ("FORTNITE",     (0,212,255)),
]):
    img = make_bg()
    draw = ImageDraw.Draw(img)
    sf = (gc[0]//8, gc[1]//8, gc[2]//8+8)
    draw.rectangle([0,H//2-110,W,H//2+110], fill=sf)
    img = paste_png(img, XH/"Crosshair Simple/Cyan.png", scale=280, cy_off=-290)
    draw = ImageDraw.Draw(img)
    draw_text(draw, gname, fnt(80), H//2-62, color=gc)
    add_vo(img, [
        ("Same crosshair across every game.", 64, VO[0]),
        ("Valorant. Apex. CS2.", 64, VO[1]),
        ("Even the ones with garbage defaults.", 54, VO[2]),
    ])
    clips_s4.append(to_clip(img, f"s4_{k}", 1.25))
seg4 = TMP / "seg4.mp4"
concat(clips_s4, seg4)
print("  ✓ Scene 4")

# ════════════════════════════════════════════════════════════════════════════
# SCENE 5  Body 4 — 5 s  (size, color, OS)
# ════════════════════════════════════════════════════════════════════════════
print("Scene 5 — Customization...")
clips_s5 = []
for si, sc in enumerate([80,160,250,340,420]):
    img = make_bg()
    img = paste_png(img, XH/"Crosshair Simple/Green.png", scale=sc, cy_off=-80)
    add_vo(img, [("Make it bigger.", 72, VO[0]), ("Make it pink.", 72, VO[1])])
    clips_s5.append(to_clip(img, f"s5_sc{si}", 0.4))

img = make_bg()
img = paste_png(img, XH/"Crosshair Simple/Pink.png", scale=420, cy_off=-80)
add_vo(img, [("Colorblind? Sorted.", 72, VO[0])])
clips_s5.append(to_clip(img, "s5_pink", 1.5))

img = make_bg()
draw = ImageDraw.Draw(img)
for text, color, y, fs, bold in [
    ("Windows",      (100,180,255), H//2-200, 80, True),
    ("Mac",          (180,180,255), H//2-80,  80, True),
    ("Linux",        (255,170,68),  H//2+40,  80, True),
    ("All of them.", (100,100,115), H//2+160, 52, False),
]:
    draw_text(draw, text, fnt(fs,bold=bold), y, color=color)
add_vo(img, [
    ("Windows, Mac, Linux.", 66, VO[1]),
    ("All of them.", 66, VO[2]),
])
clips_s5.append(to_clip(img, "s5_os", 1.5))
seg5 = TMP / "seg5.mp4"
concat(clips_s5, seg5)
print("  ✓ Scene 5")

# ════════════════════════════════════════════════════════════════════════════
# SCENE 6  PROOF BEAT — 9 s  (stats cascade)
# ════════════════════════════════════════════════════════════════════════════
print("Scene 6 — Proof Beat...")
proof = [
    ("4.8 stars  /  Microsoft Store",   (255, 204, 0)),
    ("217K monthly users",              (0, 212, 255)),
    ("530+ crosshairs",                 (255, 107, 53)),
    ("Free. Open source. Not bannable.", (85, 255, 136)),
]
clips_s6 = []
for pi, dur in enumerate([2,2,2,3]):
    img = make_solid((5,5,8))
    draw = ImageDraw.Draw(img)
    n = pi + 1
    spacing, line_h = 140, 88
    start_y = (H - ((n-1)*spacing + line_h)) // 2
    for li, (text, color) in enumerate(proof[:n]):
        draw_text(draw, text, fnt(72), start_y + li*spacing, color=color)
    clips_s6.append(to_clip(img, f"s6_{pi}", dur))
seg6 = TMP / "seg6.mp4"
concat(clips_s6, seg6)
print("  ✓ Scene 6")

# ════════════════════════════════════════════════════════════════════════════
# SCENE 7  CTA — 3 s
# ════════════════════════════════════════════════════════════════════════════
print("Scene 7 — CTA...")
img = make_bg()
icon = Image.open(str(ICON)).convert("RGBA")
icon = icon.resize((300,300), Image.LANCZOS)
img = img.convert("RGBA")
img.paste(icon, ((W-300)//2, H//2-460), icon.split()[3])
img = img.convert("RGB")
draw = ImageDraw.Draw(img)
draw_text(draw, "CrossOver",                  fnt(68),      H//2-100, color=(255,255,255))
draw_text(draw, "Microsoft Store  |  GitHub", fnt(44,False),H//2+20,  color=(170,170,204))
draw_text(draw, "It's free.",                 fnt(60),      H//2+145, color=(85,255,136))
draw_text(draw, "It's always been free.",     fnt(44,False),H//2+222, color=(170,170,204))
add_vo(img, [
    ("Search 'CrossOver' on the Microsoft Store", 54, VO[0]),
    ("or grab it from GitHub.",                   54, VO[1]),
    ("It's free. It's always been free.",         58, VO[2]),
])
seg7 = to_clip(img, "seg7", 3)
print("  ✓ Scene 7")

# ════════════════════════════════════════════════════════════════════════════
# ASSEMBLY + EXPORTS
# ════════════════════════════════════════════════════════════════════════════
print("\nAssembling master...")
master_raw = TMP / "master_raw.mp4"
concat([seg1,seg2,seg3,seg4,seg5,seg6,seg7], master_raw)

# DRAFT watermark
wm = Image.new("RGBA", (W,H), (0,0,0,0))
wm_d = ImageDraw.Draw(wm)
wf = fnt(110)
bb = wm_d.textbbox((0,0), "DRAFT", font=wf)
wm_d.text(((W-(bb[2]-bb[0]))//2, (H-(bb[3]-bb[1]))//2), "DRAFT", font=wf, fill=(255,255,255,40))
wm_path = TMP / "wm.png"
wm.save(str(wm_path))

print("Exporting 9:16...")
out_9x16 = OUT / "crossover-promo-9x16-draft.mp4"
ff("-i",str(master_raw),"-i",str(wm_path),
   "-filter_complex","[0:v][1:v]overlay=0:0[out]","-map","[out]",
   "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FPS), out_9x16)
print(f"  ✓ {out_9x16.name}")

print("Exporting 16:9...")
out_16x9 = OUT / "crossover-promo-16x9-draft.mp4"
ff("-i",str(out_9x16),
   "-vf","scale=-2:1080,pad=1920:1080:(ow-iw)/2:0:black",
   "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FPS), out_16x9)
print(f"  ✓ {out_16x9.name}")

print("Exporting 1:1...")
out_1x1 = OUT / "crossover-promo-1x1-draft.mp4"
ff("-i",str(out_9x16),
   "-vf",f"crop={W}:{W}:0:(ih-{W})/2",
   "-c:v","libx264","-pix_fmt","yuv420p","-r",str(FPS), out_1x1)
print(f"  ✓ {out_1x1.name}")

print("\n" + "═"*60)
print("CrossOver Promo — Production Complete")
print("═"*60)
for f in [out_9x16, out_16x9, out_1x1]:
    sz = f.stat().st_size / 1024 / 1024
    r = subprocess.run(["ffprobe","-v","quiet","-show_entries","format=duration",
                        "-of","csv=p=0",str(f)], capture_output=True, text=True)
    dur = float(r.stdout.strip()) if r.stdout.strip() else 0
    print(f"  {f.name:<45}  {dur:.1f}s  {sz:.1f} MB")
print()
