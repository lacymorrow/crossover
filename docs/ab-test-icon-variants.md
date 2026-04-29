# Microsoft Store Icon A/B Test Plan — CrossOver

> LAC-306: A/B test Microsoft Store icon variants
> Store URL: https://apps.microsoft.com/detail/9mtd5zln7nl1
> Reference: Section 5 of `docs/microsoft-store-listing-v2.md`

---

## Platform: Microsoft Store Product Page Experiments

Microsoft Store supports **Product Page Experiments** in Partner Center:
- **Split**: 50/50 traffic between original and variant
- **Duration**: Up to 90 days maximum per experiment
- **Constraint**: Only **two variants** at a time (original vs. one challenger)
- **Testable assets**: App logo and/or screenshots (one asset type per experiment recommended)
- **Metrics**: Search impressions, Page views, Installs, Conversion rate
- **Docs**: https://learn.microsoft.com/en-us/windows/apps/publish/product-page-experiments

Because the platform only supports A vs. B (not A vs. B vs. C), we run **sequential experiments**.

---

## Icon Variants

### Variant A — Current (Control)
- **Description**: Orange-to-pink gradient crosshair reticle with running figure on white circular background
- **File**: `src/static/icons/icon.png` (existing)
- **Hypothesis**: Warm colors and human figure create personality but may lack contrast at small sizes in search results

### Variant B — Flat Crosshair on Dark Background
- **Description**: Minimal cyan crosshair on near-black (#0d0d1a) background. Bold lines, center dot with glow. No human figure, no gradients on the crosshair itself.
- **Files**:
  - `docs/ab-test-assets/variant-b-flat-crosshair-1024.png` (1024x1024 master)
  - `docs/ab-test-assets/variant-b-flat-crosshair-300.png` (300x300 Store logo)
  - `docs/ab-test-assets/variant-b-flat-crosshair.svg` (source)
- **Hypothesis**: Dark background with neon cyan stands out in light-themed store search results (most Microsoft Store backgrounds are light). High contrast at thumbnail sizes (44px–150px). Appeals to the "gaming aesthetic" audience segment.

### Variant C — Current Icon + "FREE" Badge
- **Description**: Identical to Variant A but with a green "FREE" badge overlaid in the bottom-right corner
- **Files**:
  - `docs/ab-test-assets/variant-c-free-badge-1024.png` (1024x1024 master)
  - `docs/ab-test-assets/variant-c-free-badge-300.png` (300x300 Store logo)
  - `docs/ab-test-assets/free-badge.svg` (badge source)
- **Hypothesis**: "FREE" badge increases CTR from search results by pre-qualifying price-sensitive users. Reduces friction for users who would otherwise skip past, unsure if the app costs money. This is a proven pattern in mobile app stores.

---

## Test Execution Plan

### Experiment 1: A vs. B (Icon Style Test)
- **Goal**: Test whether a dark, minimal gaming-aesthetic icon outperforms the current warm gradient icon
- **Metric**: Click-through rate (search impressions → page views)
- **Secondary metric**: Install conversion rate (page views → installs)
- **Duration**: 2 weeks minimum, extend to 4 weeks if <1000 impressions/variant
- **Significance threshold**: p < 0.05
- **Minimum sample**: 1000 impressions per variant

### Experiment 2: Winner of Exp 1 vs. C (FREE Badge Test)
- **Goal**: Test whether adding a "FREE" badge increases CTR
- **Metric**: Click-through rate
- **Duration**: 2 weeks minimum
- **Significance threshold**: p < 0.05

### Experiment 3 (if Store supports): Title Variant Test
- **Variant A**: "CrossOver: Crosshair Overlay" (current)
- **Variant B**: "CrossOver: Free Gaming Crosshair"
- **Metric**: Listing page → Install conversion rate
- **Duration**: 2 weeks

### Experiment 4 (if Store supports): Screenshot Order Test
- **Variant A**: Hero gameplay shot first
- **Variant B**: Crosshair chooser (100+ options grid) first
- **Metric**: Install conversion rate

---

## Setup Checklist

1. [ ] Log into Partner Center at https://partner.microsoft.com
2. [ ] Navigate to CrossOver app → Store listing → Product page experiments
3. [ ] Upload Variant B logo (300x300 PNG) as the challenger
4. [ ] Set experiment name: "Icon Style Test — Dark Flat vs Gradient"
5. [ ] Start experiment, confirm 50/50 split is active
6. [ ] Set calendar reminder for 2-week check-in
7. [ ] After Experiment 1 concludes, start Experiment 2 with Variant C

---

## Decision Criteria

| Outcome | Action |
|---------|--------|
| Variant B wins Exp 1 by ≥10% CTR lift | Adopt dark icon as new default, proceed to Exp 2 |
| Variant A wins or no significant difference | Keep current icon, proceed to Exp 2 with A vs C |
| Variant C wins Exp 2 by any significant margin | Adopt FREE badge permanently |
| No significant difference in any test | Keep current icon; focus optimization effort on screenshots/description instead |

---

## Asset Specifications

| Asset | Format | Dimensions | Location |
|-------|--------|------------|----------|
| Variant A (current) | PNG | 1080x1080 | `src/static/icons/icon_1080.png` |
| Variant B master | PNG | 1024x1024 | `docs/ab-test-assets/variant-b-flat-crosshair-1024.png` |
| Variant B store logo | PNG | 300x300 | `docs/ab-test-assets/variant-b-flat-crosshair-300.png` |
| Variant C master | PNG | 1024x1024 | `docs/ab-test-assets/variant-c-free-badge-1024.png` |
| Variant C store logo | PNG | 300x300 | `docs/ab-test-assets/variant-c-free-badge-300.png` |

All source SVGs are in `docs/ab-test-assets/` for future iteration.
