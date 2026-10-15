# Microsoft Store trailer — upload handoff

**Issue:** LAC-356 · **DRI:** Lacy (Partner Center login is human-only) · **Time:** ~5 min

Everything below is staged. The only remaining step is the upload, which needs publisher
credentials for `2886Fly5.CrossOverCrosshairOverlay`.

## Files to upload

| Slot | File |
|------|------|
| Trailer video | `docs/video/crossover-promo-16x9.mp4` |
| Trailer thumbnail | `docs/video/crossover-store-trailer-poster.png` |

**Use exactly those two.** The sibling files are traps:

- `crossover-promo-16x9-draft.mp4` and `crossover-promo-16x9-final.mp4` are both pillarboxed
  9:16 (black bars down two-thirds of the frame) **with a `DRAFT` watermark burned in**, despite
  the `-final` name. They come from `docs/video/produce.py`, which only exports a padded crop.
- `crossover-store-trailer-draft-with-audio.mp4` is the LAC-305 trailer, still placeholder cards.
  It needs the real OBS gameplay capture listed in `microsoft-store-trailer-script.md`.

`crossover-promo-16x9.mp4` is the only true 16:9 master: 1920×1080, H.264 + AAC, 30 fps, 30s,
3.4 MB. Store-compliant. Its generator is not in this repo — `produce.py` cannot rebuild it, so
treat the mp4 itself as the master.

## Thumbnail

The video's first frame is black, so without a thumbnail the Store poster is a black rectangle.
`crossover-store-trailer-poster.png` is the end card (wordmark + crosshair), 1920×1080, legible
down to 320px wide, and makes no numeric claim.

`crossover-store-trailer-poster-stats.png` is the alternate — the stats card, which reads better
at thumbnail size and carries the social proof. Only use it if the stat question below is settled.

## Trailer title and description

```
Title:       Put a crosshair on any game
Description: 30 seconds: 500+ built-in sights, drag in your own image,
             works on every monitor. Free and open source.
```

## Upload steps

1. [Partner Center](https://partner.microsoft.com) → **Apps and games** → **CrossOver: Crosshair Overlay**
2. New submission → **Store listings** → the `en-us` listing
3. **Trailers** → **Add trailer** → upload the mp4
4. Attach the poster png as the thumbnail, paste the title and description above
5. Submit for certification (trailer-only changes typically clear in under a day)

## One open question before it goes up

The video's stats card says **"217K monthly users"** at 0:18.

LAC-279, which commissioned this video, records the figure as *217K monthly Store **page views***.
Page views are not users. The claim is repeated in `readme.md:8`.

The video source isn't in the repo, so this can't be re-rendered here. Options:

- **Ship as-is** if 217K monthly active users is independently true.
- **Ship as-is and fix later** — it's two seconds of a thirty-second video, and the listing
  converts on the first ten.
- **Hold** and have the card relabeled to "monthly Store visitors" first.

Recommend the second: get the trailer live, open a separate issue to relabel the card and
`readme.md` on the next render.

Unrelated, same card: the video says **530+ crosshairs** while the Store listing copy was just
corrected to **500+** (commit `39334a0`). One of the two numbers is stale across the whole repo —
`readme.md` and `docs/index.html` also say 530+. Worth one pass to settle, not a blocker here.
