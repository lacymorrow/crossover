# CrossOver site research (2026-10-15)

Not published. Lives outside `docs/` on purpose.

## Competitors

| Product | Price | Hero | Looks credible | Looks cheap |
|---|---|---|---|---|
| Crosshair X (CenterPoint Gaming) | $9.99 on Steam, bundles to $13.77 | "Do you want to fix your aim?" in huge orange caps, three store buttons, "trusted by over 3 million PC gamers" | 23k+ Steam reviews at 93% positive, real gameplay video in the hero | Busy collage background, every product in the nav, shouty caps, glow buttons |
| HudSight | $7 lifetime, demo | "HudSight. Simple, Robust, Secure." over abstract purple 3D shards | Names DirectX/Vulkan support plainly, warns users to check each game's rules | Stock-art hero that shows nothing about the product, rule-of-three slogan, support bubble |
| Crosshair V2 / Scope X (same company) | Paid, Steam | Same template as Crosshair X | Same review volume | Same clutter |
| itch.io tools (Crosshair Ultra, CrosshairB, JASC, CrossOver-lite) | Free to $1.40 | itch default page | Free | No brand, no screenshots, unclear authorship |
| Steam newcomers (Crosshare, BetterCrosshair) | Paid | Steam capsule | Steam's review system | No site at all |

Takeaway: the whole category dresses like a gaming peripheral ad. Nobody leads with a calm explanation of how the overlay works, and nobody answers "will I get banned" honestly on the homepage. That is the open lane.

Sources: https://store.steampowered.com/app/1366800/Crosshair_X/ , https://centerpointgaming.com/ , https://www.hudsight.com/ , https://leptodev.itch.io/crosshairultra , https://czapla47.itch.io/crosshairb , https://popros.itch.io/jasc , https://store.steampowered.com/app/3813110 , https://store.steampowered.com/app/4348960/

## Craft benchmarks

- **Rectangle** (https://rectangleapp.com/): app icon, one sentence, one download button, "Free and Open Source, macOS 10.15+". Pro is a separate band below. Same free + paid-upgrade shape CrossOver will have with v4.
- **Raycast** (https://www.raycast.com/): the product itself is the hero, at real size. Tight type, very little color, one accent.
- **CleanShot X** (https://cleanshot.com/): each feature shown as a working product shot, not an icon card.
- **Linear** (https://linear.app/): restrained type scale (one display size, one body size), muted secondary text, motion only where it explains something.
- **Arc** (https://arc.net/): copy sounds like a person. Short sentences, specific claims.

What reads as senior: system or neo-grotesk type with negative tracking on headlines only; one accent used sparingly; real product UI instead of icon grids; generous whitespace; copy that states facts. What reads as junior (and the current CrossOver page does most of it): letter-spaced all-caps display fonts, clipped "tactical" corners, a cursor-replacing gimmick, marquees, pulse dots, unverifiable stat bars, and a "Not Bannable" claim.

## Audience

1. Players whose game hides or lacks a crosshair (sniper hipfire, survival games, older titles). Search terms: "crosshair overlay", "custom crosshair for any game", "<game> crosshair overlay", "free crosshair app".
2. Streamers and video makers who want a consistent reticle on screen.
3. People with motion sickness in first-person games. A fixed center point helps some players; a crosshair overlay is a common recommendation in those threads.
4. Non-gaming uses: centering a monitor, screen recordings, design checks.

## Objections and the honest answer

- **Will I get banned?** No public statement from Riot or most publishers. Forum reports conflict (https://steamcommunity.com/app/1366800/discussions/0/3428949623344112645). Crosshair X's own developer says they have no data showing bans for their tool. CrossOver's README documents real exceptions: Sea of Thieves has flagged users, Escape from Tarkov refuses to start. So: explain the mechanism, name the exceptions, tell people to check their game's rules. Never "not bannable".
- **Does it hurt FPS?** It's one small transparent window. A few users saw drops in some games (issue #70); the fix is a setting. Say that.
- **Is it safe to install?** Builds are unsigned, so Windows SmartScreen and macOS Gatekeeper warn. Say so up front and explain the click-through.
- **Does it work in fullscreen?** Windowed or borderless, yes. Exclusive fullscreen usually hides it. Vulkan games don't render it.

## True trust signals

- Public source on GitHub since October 2019 (repo created 2019-10-04). Note: the brief says "about 10 years"; the repo says 7. The site says "since 2019".
- 1,254 GitHub stars (API, 2026-10-15). Fetched live on the page.
- About 2.87 million downloads across GitHub releases (sum of release asset download counts, installers only). Shown as "2.8 million", a floor that stays true.
- Never reads or writes game files or memory. Only network traffic is the GitHub update check, which can be turned off.
- License is FSL-1.1-MIT (since May 2026): source-available now, MIT after two years. "Open source" is a stretch under the OSI definition. The page says "source on GitHub" and names the license in the footer.

Not used: "217K monthly users" and "4.8 stars on Microsoft Store" from the old page. I couldn't verify either from a public source today.

## Bug found

The old Windows button points at `releases/latest/download/CrossOver.exe`. The asset is named `CrossOver-3.4.5.exe`, so the link 404s (checked 2026-10-15). The README has the same link. The new page resolves asset URLs from the GitHub API at runtime and falls back to the releases page.
