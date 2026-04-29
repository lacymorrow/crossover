#!/usr/bin/env python3
"""
Microsoft Store Trailer — LAC-305
42-second 16:9 trailer following the storyboard in microsoft-store-listing-v2.md.

Scenes 1-7 use placeholder cards by default. Drop real footage into
docs/video/footage/scene-{1..7}.mp4 and re-run to swap them in automatically.
Scenes 8-9 are final motion graphics (trust badge + CTA).

Usage: python3 produce-store-trailer.py
Output: docs/video/crossover-store-trailer-draft.mp4
        docs/video/crossover-store-trailer-final.mp4  (when all footage present)
"""
import subprocess
import sys
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO = Path("/Users/lacy/repo/crossover")
XH   = REPO / "src/static/crosshairs"
ICON = REPO / "build/icon.png"
OUT  = REPO / "docs/video"
FOOTAGE = REPO / "docs/video/footage"
TMP  = Path("/tmp/xover-store")
W, H, FPS = 1920, 1080, 60

OUT.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)
FOOTAGE.mkdir(parents=True, exist_ok=True)

_TTC  = "/System/Library/Fonts/HelveticaNeue.ttc"
_BOLD = 1
_REG  = 0

SCENE_DURATIONS = {1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5}
SCENE_OVERLAYS = {
    1: "Can't see your crosshair?",
    2: "CrossOver fixes that.",
    3: "100+ crosshairs built in",
    4: "Or use any image",
    5: "Fully customizable",
    6: "Works with your favorite games",
    7: "Multi-monitor. Duplicates.",
    8: "Free. No ads. No data collection.",
    9: "Get CrossOver on the Microsoft Store",
}
XFADE_DURATION = 0.5

def fnt(size, bold=True):
    return ImageFont.truetype(_TTC, size, index=_BOLD if bold else _REG)

def sh(cmd, check=True):
    cmd = [str(c) for c in cmd]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if check and r.returncode != 0:
        print("ERR:", r.stderr[-1500:], file=sys.stderr)
        raise RuntimeError(f"Failed: {' '.join(cmd[:4])}")
    return r

def ff(*args):
    return sh(["ffmpeg", "-y"] + [str(a) for a in args])

def get_footage(scene_num):
    """Return footage path if real footage exists for this scene."""
    for ext in ("mp4", "mov", "mkv"):
        p = FOOTAGE / f"scene-{scene_num}.{ext}"
        if p.exists():
            return p
    return None

def footage_to_segment(footage_path, scene_num, duration, text_overlay):
    """Trim real footage to duration, scale to 1080p60, add text overlay."""
    out = TMP / f"store_seg{scene_num}_real.mp4"
    drawtext = (
        f"drawtext=text='{text_overlay}':"
        f"fontfile={_TTC}:fontsize=52:fontcolor=white:"
        f"borderw=3:bordercolor=black@0.7:"
        f"x=(w-text_w)/2:y=h-160"
    )
    ff("-i", str(footage_path),
       "-t", str(duration),
       "-vf", f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
              f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black,"
              f"{drawtext}",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-an", out)
    return out

def make_bg():
    c1, c2 = np.array([10,10,20], np.float32), np.array([15,15,32], np.float32)
    t = np.linspace(0, 1, H, np.float32)
    arr = (c1 + (c2 - c1) * t[:, None]).astype(np.uint8)
    arr = np.broadcast_to(arr[:, None, :], (H, W, 3)).copy()
    return Image.fromarray(arr, "RGB")

def make_solid(color=(5,5,8)):
    return Image.new("RGB", (W, H), color)

def paste_png(bg, path, scale, cx_off=0, cy_off=0):
    src = Image.open(str(path)).convert("RGBA")
    src = src.resize((scale, scale), Image.LANCZOS)
    x = (W - scale) // 2 + cx_off
    y = (H - scale) // 2 + cy_off
    out = bg.copy().convert("RGBA")
    out.paste(src, (x, y), src.split()[3])
    return out.convert("RGB")

def center_text(draw, text, font_obj, y, color=(255,255,255), shadow=True):
    bb = draw.textbbox((0,0), text, font=font_obj)
    x = (W - (bb[2] - bb[0])) // 2
    if shadow:
        draw.text((x+2, y+2), text, font=font_obj, fill=(0,0,0,180))
    draw.text((x, y), text, font=font_obj, fill=color)

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

def concat_xfade(clips, dst):
    """Concatenate clips with crossfade transitions between scenes."""
    if len(clips) < 2:
        if clips:
            ff("-i", str(clips[0]), "-c", "copy", dst)
        return
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    fc_parts = []
    prev = "[0:v]"
    for i in range(1, len(clips)):
        out_label = f"[xf{i}]" if i < len(clips) - 1 else "[out]"
        offset = sum(SCENE_DURATIONS.get(j+1, 5) for j in range(i)) - XFADE_DURATION * i
        fc_parts.append(
            f"{prev}[{i}:v]xfade=transition=fade:duration={XFADE_DURATION}:offset={offset:.2f}{out_label}"
        )
        prev = out_label
    ff(*inputs, "-filter_complex", ";".join(fc_parts), "-map", "[out]",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), dst)

def placeholder_scene(num, title, text_overlay, desc, duration):
    """Labeled placeholder frame for scenes needing gameplay footage."""
    img = make_bg()
    draw = ImageDraw.Draw(img)
    center_text(draw, f"SCENE {num}", fnt(28, False), 60, color=(100,100,140), shadow=False)
    center_text(draw, title, fnt(44), 140, color=(160,160,200))
    center_text(draw, f'"{text_overlay}"', fnt(56), H//2 - 40, color=(255,255,255))
    for i, line in enumerate(desc):
        center_text(draw, line, fnt(24, False), H - 200 + i * 36, color=(80,80,120), shadow=False)
    center_text(draw, "[ REPLACE WITH OBS CAPTURE ]", fnt(30, False), H//2 + 60, color=(255,100,100), shadow=False)
    return to_clip(img, f"store_s{num}", duration)


segments = []
footage_status = {}

for sn in range(1, 10):
    fp = get_footage(sn)
    footage_status[sn] = "REAL" if fp else "placeholder"

print(f"\nFootage status:")
for sn, status in footage_status.items():
    tag = "✓ REAL" if status == "REAL" else "○ placeholder"
    print(f"  Scene {sn}: {tag}")
print()

# ═══════════════════════════════════════════════════════════════════════════
# SCENE 1 — The Problem (0:00–0:05)
# ═══════════════════════════════════════════════════════════════════════════
print("Scene 1 — Problem...")
real_1 = get_footage(1)
if real_1:
    seg1 = footage_to_segment(real_1, 1, 5, SCENE_OVERLAYS[1])
else:
    clips_s1 = []
    for i, (style, game, gc) in enumerate([
        ("tiny_dot",  "VALORANT",     (255,70,85)),
        ("fat_cross", "CS2",          (227,169,81)),
        ("sm_cross",  "APEX LEGENDS", (218,41,42)),
    ]):
        img = make_bg()
        draw = ImageDraw.Draw(img)
        cx, cy = W//2, H//2
        if style == "tiny_dot":
            draw.ellipse([cx-3,cy-3,cx+3,cy+3], fill=(255,255,255))
        elif style == "fat_cross":
            draw.rectangle([cx-6,cy-80,cx+6,cy+80], fill=(255,255,255))
            draw.rectangle([cx-80,cy-6,cx+80,cy+6], fill=(255,255,255))
        else:
            draw.line([cx-18,cy,cx+18,cy], fill=(128,128,128), width=2)
            draw.line([cx,cy-18,cx,cy+18], fill=(128,128,128), width=2)
        center_text(draw, game, fnt(42), cy - 200, color=gc)
        center_text(draw, "default crosshair", fnt(22, False), cy + 180, color=(90,90,108))
        center_text(draw, "Can't see your crosshair?", fnt(52), H - 160, color=(255,255,255))
        clips_s1.append(to_clip(img, f"store_s1_{i}", 1.67))
    seg1 = TMP / "store_seg1.mp4"
    concat(clips_s1, seg1)
segments.append(seg1)
print("  done")

# ═══════════════════════════════════════════════════════════════════════════
# SCENE 2 — CrossOver Appears (0:05–0:10)
# ═══════════════════════════════════════════════════════════════════════════
print("Scene 2 — CrossOver appears...")
real_2 = get_footage(2)
if real_2:
    seg2 = footage_to_segment(real_2, 2, 5, SCENE_OVERLAYS[2])
else:
    img = make_bg()
    img = paste_png(img, XH / "Crosshair Simple/Cyan.png", scale=280, cy_off=-40)
    icon = Image.open(str(ICON)).convert("RGBA").resize((140,140), Image.LANCZOS)
    img = img.convert("RGBA")
    img.paste(icon, (W - 200, 40), icon.split()[3])
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)
    center_text(draw, "CrossOver fixes that.", fnt(56), H - 150, color=(255,255,255))
    seg2 = to_clip(img, "store_seg2", 5)
segments.append(seg2)
print("  done")

# ═══════════════════════════════════════════════════════════════════════════
# SCENE 3 — The Library (0:10–0:15)
# ═══════════════════════════════════════════════════════════════════════════
print("Scene 3 — Library...")
real_3 = get_footage(3)
if real_3:
    seg3 = footage_to_segment(real_3, 3, 5, SCENE_OVERLAYS[3])
else:
    gallery = [
        (XH/"Actual/mil-dot.png",           "Scope Reticle",  (210,210,210)),
        (XH/"Chevron/Pink.png",             "Chevron",        (255,105,180)),
        (XH/"X-Hair Simple/Cyan.png",       "X-Hair",         (0,212,255)),
        (XH/"Circle Dot Simple/Orange.png", "Circle Dot",     (255,140,0)),
        (XH/"Crosshair Simple/Yellow.png",  "Classic Cross",  (255,221,0)),
    ]
    clips_s3 = []
    for j, (path, cat, lc) in enumerate(gallery):
        bg = make_bg()
        img = paste_png(bg, path, scale=320, cy_off=-60)
        draw = ImageDraw.Draw(img)
        center_text(draw, cat, fnt(28, False), H//2 - 230, color=lc)
        center_text(draw, "100+ crosshairs built in", fnt(48), H - 140, color=(255,255,255))
        clips_s3.append(to_clip(img, f"store_s3_{j}", 1))
    seg3 = TMP / "store_seg3.mp4"
    concat(clips_s3, seg3)
segments.append(seg3)
print("  done")

# ═══════════════════════════════════════════════════════════════════════════
# SCENE 4 — Custom Image (0:15–0:20)
# ═══════════════════════════════════════════════════════════════════════════
print("Scene 4 — Custom image...")
real_4 = get_footage(4)
if real_4:
    seg4 = footage_to_segment(real_4, 4, 5, SCENE_OVERLAYS[4])
else:
    img = make_bg()
    draw = ImageDraw.Draw(img)
    draw.rectangle([W//2 - 160, H//2 - 160, W//2 + 160, H//2 + 160],
                   outline=(80,80,140), width=2)
    center_text(draw, "YOUR IMAGE", fnt(36, False), H//2 - 30, color=(120,120,180))
    draw.polygon([(W//2 - 250, H//2), (W//2 - 200, H//2 - 20),
                  (W//2 - 200, H//2 + 20)], fill=(100,200,255))
    center_text(draw, "drag & drop", fnt(24, False), H//2 + 200, color=(100,100,140), shadow=False)
    center_text(draw, "Or use any image", fnt(48), H - 140, color=(255,255,255))
    seg4 = to_clip(img, "store_seg4", 5)
segments.append(seg4)
print("  done")

# ═══════════════════════════════════════════════════════════════════════════
# SCENE 5 — Customization (0:20–0:25)
# ═══════════════════════════════════════════════════════════════════════════
print("Scene 5 — Customization...")
real_5 = get_footage(5)
if real_5:
    seg5 = footage_to_segment(real_5, 5, 5, SCENE_OVERLAYS[5])
else:
    clips_s5 = []
    scales = [60, 140, 220, 300, 360]
    xh_green = XH / "Crosshair Simple/Green.png"
    for si, sc in enumerate(scales):
        bg = make_bg()
        img = paste_png(bg, xh_green, scale=sc, cy_off=-60)
        draw = ImageDraw.Draw(img)
        center_text(draw, "Fully customizable", fnt(48), H - 140, color=(255,255,255))
        clips_s5.append(to_clip(img, f"store_s5_scale_{si}", 0.5))

    xh_pink = XH / "Crosshair Simple/Pink.png"
    bg = make_bg()
    img = paste_png(bg, xh_pink, scale=360, cy_off=-60)
    draw = ImageDraw.Draw(img)
    center_text(draw, "Fully customizable", fnt(48), H - 140, color=(255,255,255))
    clips_s5.append(to_clip(img, "store_s5_pink", 2.5))

    seg5 = TMP / "store_seg5.mp4"
    concat(clips_s5, seg5)
segments.append(seg5)
print("  done")

# ═══════════════════════════════════════════════════════════════════════════
# SCENE 6 — Game Compatibility (0:25–0:30)
# ═══════════════════════════════════════════════════════════════════════════
print("Scene 6 — Games...")
real_6 = get_footage(6)
if real_6:
    seg6 = footage_to_segment(real_6, 6, 5, SCENE_OVERLAYS[6])
else:
    clips_s6 = []
    xh_cyan = XH / "Crosshair Simple/Cyan.png"
    for k, (gname, gc) in enumerate([
        ("VALORANT",     (255,70,85)),
        ("APEX LEGENDS", (218,41,42)),
        ("CS2",          (227,169,81)),
        ("FORTNITE",     (0,212,255)),
        ("OVERWATCH 2",  (255,165,0)),
    ]):
        img = make_bg()
        draw = ImageDraw.Draw(img)
        sf = (gc[0]//8, gc[1]//8, gc[2]//8 + 8)
        draw.rectangle([0, H//2 - 80, W, H//2 + 80], fill=sf)
        img = paste_png(img, xh_cyan, scale=200, cy_off=-200)
        draw = ImageDraw.Draw(img)
        center_text(draw, gname, fnt(64), H//2 - 30, color=gc)
        center_text(draw, "Works with your favorite games", fnt(40), H - 120, color=(255,255,255))
        clips_s6.append(to_clip(img, f"store_s6_{k}", 1))
    seg6 = TMP / "store_seg6.mp4"
    concat(clips_s6, seg6)
segments.append(seg6)
print("  done")

# ═══════════════════════════════════════════════════════════════════════════
# SCENE 7 — Multi-monitor + Duplicates (0:30–0:35)
# ═══════════════════════════════════════════════════════════════════════════
print("Scene 7 — Multi-monitor...")
real_7 = get_footage(7)
if real_7:
    seg7 = footage_to_segment(real_7, 7, 5, SCENE_OVERLAYS[7])
else:
    img = make_bg()
    draw = ImageDraw.Draw(img)
    for mx, my, mon_w, mon_h, label in [
        (200, 200, 600, 380, "Display 1"),
        (900, 260, 500, 320, "Display 2"),
    ]:
        draw.rectangle([mx, my, mx + mon_w, my + mon_h], outline=(60,60,100), width=2)
        center_text(draw, label, fnt(20, False), my + mon_h + 8, color=(80,80,120), shadow=False)

    xh_pos = [(460, 360), (1100, 390), (300, 350), (700, 340)]
    for xi, (px, py) in enumerate(xh_pos):
        sz = 60
        draw.line([px-sz//2, py, px+sz//2, py], fill=(0,255,200), width=3)
        draw.line([px, py-sz//2, px, py+sz//2], fill=(0,255,200), width=3)
        draw.ellipse([px-4, py-4, px+4, py+4], fill=(0,255,200))

    center_text(draw, "Multi-monitor. Duplicates.", fnt(48), H - 140, color=(255,255,255))
    seg7 = to_clip(img, "store_seg7", 5)
segments.append(seg7)
print("  done")

# ═══════════════════════════════════════════════════════════════════════════
# SCENE 8 — Trust Badge (0:35–0:40) — FINAL MOTION GRAPHICS
# ═══════════════════════════════════════════════════════════════════════════
print("Scene 8 — Trust badge...")
proof_stages = [
    (["4.8 stars"], [(255,204,0)]),
    (["4.8 stars", "Free & Open Source"], [(255,204,0), (0,212,255)]),
    (["4.8 stars", "Free & Open Source", "No ads. No data collection."],
     [(255,204,0), (0,212,255), (85,255,136)]),
]
clips_s8 = []
icon_img = Image.open(str(ICON)).convert("RGBA").resize((160,160), Image.LANCZOS)

for pi, (lines, colors) in enumerate(proof_stages):
    img = make_solid()
    img = img.convert("RGBA")
    img.paste(icon_img, ((W-160)//2, 100), icon_img.split()[3])
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)
    total = len(lines)
    start_y = H//2 - (total * 80) // 2
    for li, (line, col) in enumerate(zip(lines, colors)):
        if li == 0:
            center_text(draw, "★★★★★", fnt(48), start_y + li * 80 - 50, color=col)
            center_text(draw, line, fnt(52), start_y + li * 80 + 10, color=col)
        else:
            center_text(draw, line, fnt(48), start_y + li * 80 + 10, color=col)
    center_text(draw, "Free. No ads. No data collection.", fnt(44), H - 130, color=(255,255,255))
    dur = 1.5 if pi < 2 else 2
    clips_s8.append(to_clip(img, f"store_s8_{pi}", dur))

seg8 = TMP / "store_seg8.mp4"
concat(clips_s8, seg8)
segments.append(seg8)
print("  done")

# ═══════════════════════════════════════════════════════════════════════════
# SCENE 9 — CTA (0:40–0:45) — FINAL MOTION GRAPHICS
# ═══════════════════════════════════════════════════════════════════════════
print("Scene 9 — CTA...")
img = make_bg()
icon_large = Image.open(str(ICON)).convert("RGBA").resize((200,200), Image.LANCZOS)
img = img.convert("RGBA")
img.paste(icon_large, ((W-200)//2, 160), icon_large.split()[3])
img = img.convert("RGB")
draw = ImageDraw.Draw(img)
center_text(draw, "CrossOver", fnt(72), 400, color=(255,255,255))
center_text(draw, "Crosshair Overlay", fnt(36, False), 490, color=(160,160,200))

btn_w, btn_h = 480, 70
bx, by = (W - btn_w) // 2, 580
draw.rounded_rectangle([bx, by, bx + btn_w, by + btn_h], radius=12,
                        fill=(85,0,255))
center_text(draw, "Get it free", fnt(32), by + 16, color=(255,255,255), shadow=False)

center_text(draw, "Microsoft Store", fnt(28, False), 700, color=(160,160,200), shadow=False)
center_text(draw, "Get CrossOver on the Microsoft Store", fnt(44), H - 130, color=(255,255,255))

seg9 = to_clip(img, "store_seg9", 5)
segments.append(seg9)
print("  done")

# ═══════════════════════════════════════════════════════════════════════════
# FINAL ASSEMBLY
# ═══════════════════════════════════════════════════════════════════════════
all_real = all(footage_status[s] == "REAL" for s in range(1, 8))
label = "final" if all_real else "draft"

print(f"\nAssembling Store trailer ({label})...")
final = OUT / f"crossover-store-trailer-{label}.mp4"

concat_xfade(segments, final)

dur_r = subprocess.run(
    ["ffprobe","-v","quiet","-show_entries","format=duration",
     "-of","csv=p=0", str(final)],
    capture_output=True, text=True)
dur = float(dur_r.stdout.strip()) if dur_r.stdout.strip() else 0
sz = final.stat().st_size / 1024 / 1024

print(f"\n{'='*60}")
print(f"Store Trailer ({label.upper()}): {final.name}")
print(f"  Duration: {dur:.1f}s  |  Size: {sz:.1f} MB  |  {W}x{H} @ {FPS}fps")
print(f"{'='*60}")

real_count = sum(1 for s in range(1, 8) if footage_status[s] == "REAL")
print(f"\nFootage: {real_count}/7 scenes have real footage")
if not all_real:
    missing = [s for s in range(1, 8) if footage_status[s] != "REAL"]
    print(f"Missing: {', '.join(f'scene-{s}.mp4' for s in missing)}")
    print(f"Drop footage into: {FOOTAGE}/")
    print("Re-run this script to rebuild with real footage.")
else:
    print("All scenes use real footage — trailer is production-ready!")
print("Scenes 8-9 (trust badge + CTA) are always motion graphics.")
