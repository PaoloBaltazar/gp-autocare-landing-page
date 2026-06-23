# GP Autocare

A clean, single-page landing site for **GP Autocare** — an auto detailing shop that
"brings back that new-car feeling." The audience is proud car owners who are happy to
invest in doing it right. The site is a single static `index.html` (no build step,
no framework); open it directly or serve with `python3 -m http.server 8000`.

## Working on front-end code

**Always invoke the `frontend-design` skill before writing or changing any front-end
code** (HTML, CSS, JS, or any UI/visual work). Load it first, apply its guidance, then
build. This is not optional.

## Brand

Reference `brand_assets/` as the source of truth for the logo, colors, and brand
guidelines:

- `brand_assets/Brand.md` — brand name, positioning, and audience
- `brand_assets/gp-autocare-logo-light.svg` — reversed wordmark for dark backgrounds
- `brand_assets/gp-autocare-logo-dark.svg` — wordmark for light backgrounds
- `brand_assets/gp-autocare-mark.svg` — standalone GP monogram badge

Use these assets directly — do not redraw or approximate the logo.

### Colors

| Role | Name | Hex |
| --- | --- | --- |
| Primary | Ink | `#10151C` |
| Accent | Azure | `#2E8BE0` |
| Neutral | Cream | `#F3EFE7` |

These are exposed as CSS custom properties (`--ink`, `--azure`, `--cream`) in
`index.html`, with theme-aware tokens (`--bg`, `--text`, etc.) layered on top for
light/dark mode. Reuse the existing tokens rather than hardcoding hex values.

### Typography

- **Space Grotesk** — headings, wordmark, and the GP monogram
- **IBM Plex Mono** — taglines and labels (letter-spaced, uppercase)

## Design principles

Keep the design clean and modern. Make deliberate, intentional choices — it should feel
like a real shop's site, never generic or "AI vibe coded." Specifically:

- No purple/blue gradient clichés, no emoji headings, no filler stock-photo energy.
- Respect the existing dark/light theming (it reads `localStorage` and the OS
  `prefers-color-scheme`, and remembers the user's choice).
- Favor restraint, strong typography, and generous whitespace over decoration.
