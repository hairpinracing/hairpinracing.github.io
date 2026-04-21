# Hairpin Racing — Season 4 Announcement Page

Single-file HTML announcement for a Gran Turismo 7 Discord racing league. Built to be dropped anywhere (GitHub Pages, static host, or just shared as an `.html` link). Self-contained — no build step, no dependencies beyond Google Fonts.

## File

- `hairpin-racing-s4.html` — the whole page. All CSS and JS inline.

## Design System

**Palette**
- `--bg: #0b0b0c` — near-black background
- `--bg-2: #131315` — card/row backgrounds
- `--ink: #f5f5f2` / `--ink-dim: #9a9a96` — foreground
- `--line: #262627` — borders/dividers
- `--accent: #f5d300` — racing yellow (primary accent, Gr1–Gr2 color)
- `--accent-2: #ff3b30` — stop-light red (warning, Gr3–Gr4 color)

**Type stack** (Google Fonts)
- Display: **Anton** — tall condensed sans for headlines, hero, "class-big" numbers
- Body: **Archivo** — clean geometric for prose
- Mono: **JetBrains Mono** — tabular data, eyebrows, tickers, settings grid

**Motion vocabulary** (keep it consistent if adding new sections)
- Ease curves: `--ease: cubic-bezier(0.2, 0.8, 0.2, 1)` and `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`
- Scroll reveals via IntersectionObserver — add `.reveal` (single fade-up) or `.stagger` (children fade-up in sequence using `:nth-child` transition delays, up to 13)
- Hero kinetic type: `<span class="word"><span>TEXT</span></span>` with `translateY(110%)` → `0` rise
- Ambient: moving checkered flag strips (`.flag`), top ticker (`.marquee`), vertical speed-lines on `body::after`, sweeping light on `.callout-inner::after`
- Respects `prefers-reduced-motion: reduce`

## Page Structure

1. Checkered flag strip + scrolling ticker
2. Header — eyebrow, kinetic h1 "HAIRPIN / RACING.", subtitle, 4-up meta tiles (Night / Start / Format / Length)
3. Section 01 — "The Big Picture" callout (yellow bordered, sweeping light)
4. Section 02 — How It Works (prose)
5. Section 03 — Race & Track Schedule (mono table, 10 rounds + 2 swap markers)
6. Section 04 — R5 Class Assignment (**ladder**: 8 rungs P1–P8 alternating Gr1–Gr2 / Gr3–Gr4) + R6–R9 flip + R10 notes
7. Section 05 — Car Rules (2-up Allowed / Not Allowed cards, yellow/red bordered)
8. Section 06 — Race Night Flow (3-step horizontal)
9. Section 07 — Room Settings (key/value grid + Prohibited/Allowed assists)
10. Section 08 — Season Logistics (4 notes with left-border accents)
11. Footer + bottom flag strip

## Known TODOs / Open Items

- [ ] Replace `[DATE TBD]` in Team Names section with the actual submission deadline
- [ ] Confirm final S3 end date → set S4 start date (currently "2–3 weeks after S3 wraps")
- [ ] Pinned team list is referenced but not linked — decide whether to inline the 8 drawn teams or link out to Discord

## Possible Next Iterations

Ranked roughly by impact-to-effort:

1. **Inline the team roster** — add a section showing the 8 randomly-drawn teams with their 2 drivers. Would pair naturally with the P1–P8 ladder.
2. **Live standings integration** — right now the ladder is a static explainer of how R5 assignment *works*. Could swap in actual current standings during-season so the ladder shows real teams in their current positions. JSON file or Google Sheet → fetch + render.
3. **Host it** — `helloit-pros.github.io` pattern or a dedicated subdomain like `hairpin.helloit-pros.github.io`. Would enable sharing a clean link in Discord.
4. **Per-race detail pages** — click a row in the schedule → opens a track/rules detail. Would need a build step or a SPA framework, so only worth it if the league wants a full portal.
5. **Dark/light toggle** — current design is dark-only and intentional, but a light mode could make it more Discord-preview-friendly.
6. **Track images in schedule** — hover a track name → small preview thumbnail. Nice touch, minor lift (just assets + a CSS tooltip).

## Editing Tips

- **Adding a new section**: copy an existing `<section>` block. Wrap the heading in `<div class="section-head reveal">`, bump the `section-num`, and add `reveal` or `stagger` classes to children you want animated.
- **Adding a new ticker item**: the `.marquee-track` content is duplicated inside the element (first half + identical second half) to make the loop seamless — add to *both* halves.
- **Adjusting stagger timing**: delays are defined `.stagger.in > *:nth-child(N)` — currently supports up to 13 children. Extend the CSS if you add more.
- **Hero word reveal**: if you change the h1 text, keep the `<span class="word"><span>…</span></span>` nesting or the rise-from-mask effect breaks.

## Deploy Notes

No build. Open the HTML directly, or drop into any static host. Only external dependency is Google Fonts (preconnect already in `<head>`). File is ~30KB.
