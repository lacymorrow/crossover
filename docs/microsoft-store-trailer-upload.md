# Microsoft Store trailer — upload handoff

**Issue:** LAC-356 · **DRI:** Lacy (Partner Center login is human-only) · **Time:** ~5 min

The upload itself needs publisher credentials for `2886Fly5.CrossOverCrosshairOverlay`, which is
why Lacy is the DRI.

**Do not upload yet.** The staged video's stats card asserts a 4.8 Store rating and the listing
shows 3.7. See "Blocker" below. The ~5 min is the upload once there is a cut to upload.

## Files to upload

| Slot | File |
|------|------|
| Trailer video | `docs/video/crossover-promo-16x9.mp4` |
| Trailer thumbnail | `docs/video/crossover-store-trailer-poster.png` |

**Use exactly those two.** The sibling files are traps:

- `crossover-promo-16x9-draft.mp4` and `crossover-promo-16x9-final.mp4` are both pillarboxed
  9:16 (black bars down two-thirds of the frame). They come from `docs/video/produce.py`, which
  builds a 9:16 master and exports 16:9 by scaling and padding it, so neither is a real 16:9.
  The `-draft` file also has a `DRAFT` watermark burned in. The `-final` file carried one too
  until #565; as of that PR a plain `produce.py` run writes clean `-final` files and the stamp
  takes an explicit `DRAFT=1`. The pillarbox is the reason to avoid them here, not the watermark.
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

## Blocker: the stats card at 0:18 makes a false rating claim

This section used to list the 217K label as the one open question and recommend shipping anyway.
That recommendation is withdrawn. Checked every claim on the card against its source on
2026-10-16:

| On the card | Actual | Verdict |
|---|---|---|
| `4.8` over a five-gold-star graphic, labelled `stars` | **3.7 from 154 ratings** (`"ratingValue":3.7`, `"ratingCount":154` in the JSON-LD at apps.microsoft.com/detail/9mtd5zln7nl1) | **False. Blocks the upload.** |
| `217K` labelled `monthly users` | 217K Store **page views**, per LAC-279 which commissioned the video | Misleading |
| `530+` labelled `crosshairs` | 530 image files under `src/static/crosshairs` | Accurate, drop the `+` |
| `Free. Open source. Not bannable.` | Free and not bannable are true. The license is FSL-1.1-MIT, which is source-available, not OSI-approved; GitHub reports it as `NOASSERTION` | Reword pending the owner's call (LAC-4591) |

The 4.8 is the one that matters. This trailer would sit on the listing page that displays 3.7,
so the claim is contradicted by the page hosting it, one glance away. Misstating your own rating
in Store media is a listing-policy exposure, not only an accuracy problem.

The video's generator is not in this repo, so the card cannot be re-rendered here. Options:

- **Trim past the card.** It is one beat of thirty seconds, the end card is the real call to
  action, and it makes no numeric claim. Cheapest honest path and it needs no generator.
- **Find or rebuild the generator** and re-render the card with 3.7, or with the GitHub star
  count instead.
- **Hold** the trailer until one of the above is done.

Recommend trimming. Shipping as-is is no longer on the list.

`readme.md` and `.github/assets/social-preview.svg` carried the same two claims and were
corrected in this PR's commit. The Store listing copy says `500+` crosshairs, which is
understated rather than wrong, so it is not urgent; 530 is the accurate figure and is what
`readme.md` and `docs/index.html` already use.
