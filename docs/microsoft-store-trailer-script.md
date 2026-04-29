# Microsoft Store Video Trailer — Production Script

**Issue:** LAC-305
**Format:** 30-45 second autoplay trailer (Microsoft Store listing)
**Resolution:** 1920x1080 @ 60fps (16:9 landscape)
**Capture:** OBS Studio
**Coordinates with:** LAC-279 (promo video — reuse footage where noted)

---

## Key Store Constraints

- **Autoplay muted** — Store trailers play silently by default. Every scene must work without audio. Text overlays carry the message.
- **Thumbnail** — First frame is the poster. Scene 1's opening frame must read clearly at 320px wide.
- **Loop-friendly** — Trailer loops in-store. Final frame should cut cleanly back to Scene 1.

---

## Scene-by-Scene Script

### Scene 1 — The Problem (0:00–0:05)

**Visual:** Gameplay clip (CS2 or Valorant) with a tiny, barely visible default crosshair. Camera shake, chaotic action. Player misses shots.
**Text Overlay:** "Can't see your crosshair?"
**Text Style:** Large bold white, slight shake animation, centered lower third
**Audio (if unmuted):** Tense gaming ambience, missed-shot sound effects

**OBS Setup:** Capture windowed CS2/Valorant gameplay. Crosshair should be genuinely hard to spot — use a game with notoriously bad defaults.
**Reuse from LAC-279:** Hook B footage (bad crosshair montage) — grab the worst 5s.

---

### Scene 2 — CrossOver Appears (0:05–0:10)

**Visual:** Same gameplay scene. CrossOver launches — a bold, bright crosshair snaps onto center screen. Immediate visual contrast. Player lands shots.
**Text Overlay:** "CrossOver fixes that."
**Text Style:** Confident, clean. Text appears with a subtle punch-in animation.
**Audio:** Satisfying snap/lock sound effect. Music drops in — uptempo electronic beat.

**OBS Setup:** Show CrossOver's crosshair appearing over the same game from Scene 1. The before/after contrast is the money shot — make the crosshair vivid (bright color, good size).

---

### Scene 3 — The Library (0:10–0:15)

**Visual:** CrossOver's crosshair chooser UI. Rapid scroll through categories — reticles, dots, chevrons, tactical optics, custom designs. The grid fills the screen.
**Text Overlay:** "100+ crosshairs built in"
**Text Style:** Number "100+" emphasized in brand purple (#5500ff) or accent color
**Audio:** Quick UI click sounds on each crosshair switch. Music continues.

**OBS Setup:** Screen-record the chooser window. Scroll smoothly through multiple categories. Show variety — thin reticles, fat dots, complex optics, fun shapes.
**Reuse from LAC-279:** Hook C footage (rapid crosshair scroll) — same visual works here.

---

### Scene 4 — Custom Image (0:15–0:20)

**Visual:** User drags an image file (a logo or fun PNG) from desktop onto CrossOver. It instantly becomes the crosshair over gameplay.
**Text Overlay:** "Or use any image"
**Text Style:** Casual, slightly smaller than previous overlays
**Audio:** Drag-drop sound effect. Brief moment of "oh that's cool."

**OBS Setup:** Stage a clean desktop with 2-3 image files visible. Drag one onto CrossOver's window. Show it immediately appearing over a game. Use something visually distinct — a small logo or emoji-style PNG works best at Store thumbnail size.

---

### Scene 5 — Customization (0:20–0:25)

**Visual:** Quick cuts of CrossOver's settings in action: resize slider (crosshair grows/shrinks), color picker (cycles through colors), opacity slider (fades in/out). All shown over live gameplay.
**Text Overlay:** "Fully customizable"
**Text Style:** Clean, centered
**Audio:** Subtle UI interaction sounds. Music builds slightly.

**OBS Setup:** Capture the preferences panel alongside gameplay. Show 3 rapid adjustments: size change → color change → opacity change. Each adjustment should be 1-1.5 seconds. Make changes dramatic enough to read at small sizes.

---

### Scene 6 — Game Compatibility (0:25–0:30)

**Visual:** Quick-cut montage — CrossOver's crosshair over 4-5 different games. Each game gets ~1 second. Show genre variety.
**Text Overlay:** "Works with your favorite games"
**Text Style:** Game names briefly flash in corner as each game appears
**Audio:** Music hits. Quick cuts synced to beat.

**Games to capture (pick 4-5):**
- Valorant
- Fortnite
- Apex Legends
- Call of Duty Warzone
- Overwatch 2
- Roblox (broadens audience)

**OBS Setup:** Record 10s of each game with CrossOver active. Cut the best 1s from each in post. Same crosshair across all games reinforces consistency.
**Reuse from LAC-279:** Body section split-screen footage.

---

### Scene 7 — Multi-Monitor + Duplicates (0:30–0:35)

**Visual:** CrossOver crosshair hopping between monitors (keyboard shortcut). Then: multiple duplicate crosshairs appearing on screen simultaneously.
**Text Overlay:** "Multi-monitor. Duplicates."
**Text Style:** Two-line stack, punchy periods
**Audio:** Pop sound on each duplicate appearing

**OBS Setup:** If multi-monitor available, capture the monitor switch. For duplicates, trigger shadow windows (up to 3-4 visible for clarity). Show them arranged on screen.

---

### Scene 8 — Trust Badge (0:35–0:40)

**Visual:** Clean dark/branded background. CrossOver logo centered. Stats cascade in:
- ★★★★★ 4.8 stars
- Free & Open Source
- No ads. No data collection.
**Text Overlay:** "Free. No ads. No data collection."
**Text Style:** Stats appear one by one with satisfying animation. Final line is the boldest.
**Audio:** Music resolves. Clean, confident tone.

**Design Note:** This is a motion graphics frame, not a screen capture. Can be assembled in any video editor. Use CrossOver's brand purple (#5500ff) as accent.
**Reuse from LAC-279:** Proof Beat visual — same stats, same cascade concept.

---

### Scene 9 — CTA (0:40–0:45)

**Visual:** Microsoft Store badge (official asset) + "Get it free" button + CrossOver logo. Clean, minimal layout.
**Text Overlay:** "Get CrossOver on the Microsoft Store"
**Text Style:** Large, centered, unmissable. Store badge prominent.
**Audio:** Music ends clean. No VO needed.

**Design Note:** This frame should feel like a natural end card. Use Microsoft's official Store badge assets. Include the store URL or "Search CrossOver" as fallback text. This frame will also serve as the loop-back poster.

---

## Production Checklist

- [x] Write storyboard and scene-by-scene script
- [x] Build automated production pipeline (`docs/video/produce-store-trailer.py`)
- [x] Generate placeholder draft with motion graphics for scenes 8-9
- [ ] Install OBS Studio, configure 1080p60 capture (see OBS Setup below)
- [ ] Install/launch target games (need 4-5 for montage)
- [ ] Prepare custom image files for drag-drop scene
- [ ] Record raw footage for scenes 1-7 → save to `docs/video/footage/`
- [ ] Re-run `python3 docs/video/produce-store-trailer.py` to assemble with real footage
- [ ] Select royalty-free BGM track (uptempo electronic, 30-45s)
- [ ] Add BGM in post (DaVinci Resolve / CapCut / Premiere)
- [ ] Review at 320px width (Store thumbnail test)
- [ ] Export: H.264, 1080p, 60fps, ≤45 seconds
- [ ] Upload to Microsoft Store via Partner Center

## OBS Recording Guide

### Setup
1. Open OBS Studio → Settings → Video
2. Base Resolution: `1920x1080`
3. Output Resolution: `1920x1080`
4. FPS: `60`
5. Settings → Output → Recording: `mp4`, Encoder: `x264`, CRF: `18`

### Recording Each Scene

Save all files to `docs/video/footage/` with these exact names:

| File | What to Record | Duration | Tips |
|------|----------------|----------|------|
| `scene-1.mp4` | Gameplay with tiny default crosshairs (CS2/Valorant) | ~10s raw | Play badly. Let the crosshair be hard to see. Chaotic action. |
| `scene-2.mp4` | Same game, CrossOver crosshair snaps on. Land shots. | ~10s raw | Before/after contrast is the money shot. Use a bright crosshair. |
| `scene-3.mp4` | CrossOver chooser UI — scroll through crosshair categories | ~10s raw | Smooth scroll. Show variety: reticles, dots, chevrons, optics. |
| `scene-4.mp4` | Drag image from desktop onto CrossOver window | ~10s raw | Use a fun PNG (logo, emoji). Show it instantly become the crosshair. |
| `scene-5.mp4` | Settings panel: resize → recolor → opacity over gameplay | ~10s raw | Make changes dramatic. Each adjustment ~2s. |
| `scene-6.mp4` | CrossOver over 4-5 different games, ~2s each | ~15s raw | Same crosshair across all games. Quick cuts in post. |
| `scene-7.mp4` | Monitor switch + duplicate crosshairs appearing | ~10s raw | Use keyboard shortcut to hop displays. Trigger 3-4 shadow windows. |

The production script trims each to 5s automatically and adds text overlays.

### Post-Recording
```bash
cd /Users/lacy/repo/crossover
python3 docs/video/produce-store-trailer.py
```
The script auto-detects footage files and swaps them in for placeholders. Crossfade transitions are applied between scenes. When all 7 scenes have footage, it outputs `crossover-store-trailer-final.mp4`.

## Asset Coordination (LAC-279)

Scenes that can directly reuse LAC-279 footage:
| This Trailer Scene | LAC-279 Source | Notes |
|---------------------|----------------|-------|
| Scene 1 (Problem) | Hook B footage | Bad crosshair montage |
| Scene 3 (Library) | Hook C footage | Crosshair scroll |
| Scene 6 (Games) | Body split-screen | Multi-game montage |
| Scene 8 (Trust) | Proof Beat | Stats cascade |

New footage needed for this trailer only:
- Scene 2 (CrossOver appearing — the transformation moment)
- Scene 4 (drag-drop custom image)
- Scene 5 (settings adjustment in real-time)
- Scene 7 (multi-monitor + duplicate crosshairs)
- Scene 9 (Store badge end card — motion graphics)

---

## Microsoft Store Trailer Specs

| Spec | Requirement |
|------|-------------|
| Format | MP4 (H.264) |
| Resolution | 1920x1080 (minimum 1080p) |
| Frame rate | 30 or 60 fps (targeting 60) |
| Duration | 30-120 seconds (targeting 42s) |
| Audio | AAC, stereo |
| Max file size | 2 GB |
| Aspect ratio | 16:9 |

Source: [Microsoft Store media requirements](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/screenshots-and-images)
