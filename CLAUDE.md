# Navren Agency — working directory

Two unrelated client projects live here. They share nothing but this folder.

| Folder | Project | State |
|---|---|---|
| `blog-previews/` | Navren's own blog — five candidate article layouts | Awaiting a pick |
| `mak-fai/` | Mak Fai Kung Fu Dragon & Lion Dance Association | Portal built in the hybrid design; school sites queued behind it |

Neither project is a git repository. There is no build step anywhere — every
page is hand-written static HTML with one stylesheet. Previews are plain
`python3 -m http.server`.

---

## Project 1 — Navren blog layouts

### What this is

Navren (navrenagency.com) had a blog index at `/blog` with an empty state and a
`blog-post-template.html`, but no posts. The first article was written — *"You
Don't Need to Go Viral: What Good Marketing Actually Looks Like"*, ~2,100 words,
five external citations — and needed a layout.

Five layouts were built rather than one, so the choice could be made by looking
rather than describing. **Identical copy in all five**; the only variable is
structure.

### The live site's design system

These are pulled verbatim from `navrenagency.com/assets/style.css`. Do not
invent new tokens — the whole point is that a post reads as part of the site.

```
--paper #F0F2F0   --white #FFFFFF   --ink #0E1513
--jade  #0D6B54   --jade-deep #0A5744   --jade-wash rgba(13,107,84,.07)
--mist  #DCE3E0   --slate #4A5854   --slate-soft #5E6B67
--line  #C9D3CF   --line-soft #E3E8E6
```

Type: **Jost** (display, 700, tight tracking) / **Karla** (body, 17px/1.62) /
**IBM Plex Mono** (eyebrows, bylines, labels — uppercase, ~.11em tracking).

Existing classes worth reusing: `.wrap` `.phero` `.crumb` `.eyebrow` `.h2`
`.lede` `.panel.accent` + `.stat` `.ticks` `.postrow`/`.thumb`/`.byline`/
`.excerpt` `.topics` `.btn` `.btn-ghost` `.inline` `.hl` `.imgband` `.foot`.

### The five layouts

Each is a complete standalone page — nav, article, CTA, footer, meta tags,
JSON-LD `Article` schema. The real differentiator is **how each handles the five
citations**, which is the interesting problem in this particular piece.

| # | Folder | Idea | Citations | Needs art |
|---|---|---|---|---|
| 01 | `01-broadsheet` | Centred 74px headline, jade drop cap, full-width byline rule | Footnotes at foot | No |
| 02 | `02-column` | Sticky rail: live reading-progress bar, section jumps, share | Footnotes at foot | No |
| 03 | `03-feature` | Full-bleed `.imgband` hero, pull quotes break full-bleed in jade | Footnotes at foot | **Yes — every post** |
| 04 | `04-filing` | Wire-service: dateline slug, "short version" summary box, tight measure | Reference **table** with the claim beside each source | No |
| 05 | `05-longread` | White ground, 18px body, related-posts rail | **Margin notes** beside the claiming sentence | No |

**05 is the recommendation for this specific article** — it leans on five
outside sources, and margin notes mean nobody has to jump to the footer.

Mixing is fine. 05's margin citations drop into 02 cleanly; 04's summary box
works in any of them.

### How these were generated

`blog-previews/` is **build output, not source**. The generator lives in the
session scratchpad and is gone. If the layouts need regenerating, they are now
plain HTML — edit them directly.

Each page carries a floating preview-only switcher pill (`.pv`) linking the five
ports together. **Delete `.pv` and its markup before shipping.**

### Open

- Nathan has not picked a layout.
- Nothing has been added to the real site. Shipping the winner means: a
  `blog-you-dont-need-to-go-viral.html` file, the layout CSS block pasted into
  `assets/style.css`, a card in the `.postrow` rail already stubbed on `/blog`,
  a `sitemap.xml` line, and a bump to the `?v=` cache-buster on the stylesheet.

---

## Project 2 — Mak Fai

Seattle's Chinatown-International District. Lion dance team + traditional Hung
Sing Choy Lay Fut kung fu school, founded 1974 by Grandmaster Mak Hin Fai.
Nonprofit. `mak-fai/README.md` has the deploy and domain-purchase notes.

### Rule 1 — three separate websites, not one site with sections

The single most important thing here, and easy to get wrong because all the
working files sit in one folder.

| Property | Domain | Deploy folder |
|---|---|---|
| Portal, bridges the two schools | `makfai.org` | `portal-makfai-org/` |
| Kung fu school | `makfaikungfu.org` | `kung-fu-makfaikungfu-org/` |
| Lion dance team | `makfailiondance.org` | `lion-dance-makfailiondance-org/` |

**Any button, nav item, or card labelled Kung Fu or Lion Dance is a cross-site
link and must use an absolute external URL.** Only same-property links stay
relative. Never create internal `kung-fu.html` / `lion-dance.html` pages.

**Lion Dance domain transition caveat:** `makfailiondance.com` (2019, Wix)
holds the SEO and must not be taken down. Until the `.org` is live with a 301
from the `.com`, every Lion Dance link points at **`makfailiondance.com`**.
`TODO` comments sit beside every such link so the repoint stays one
search-and-replace.

Domain status (Sep 2026): **`makfai.org` now returns 200** — the portal is
deployed and publicly reachable, sitting behind a *client-side* password gate
(`makfai123`, hard-coded in `index.html`/`donate.html`). That gate is a speed
bump, not security: the full page ships in the HTML regardless, so crawlers can
read it and View Source reveals the password. `robots.txt` still says
`Allow: /`. If the site is meant to stay private until launch, that needs
Netlify-level password protection restored — unresolved, worth confirming.
`makfaikungfu.org` and `makfailiondance.org` still return **401**. Only
`makfailiondance.com` is otherwise publicly reachable.

### Rule 2 — the portal is general, the school sites are specific

Nathan set this when a redesign came out reading as a lion dance page:

- **Portal (`makfai.org`)** — the association's front door. History,
  achievements, awards, general photos, both schools presented with **equal
  weight**, association-level contact. It must not feel like it belongs to
  either school.
- **School sites** — everything specific: bookings, performance reels, class
  details, rosters.

**Build order: portal first, then lion dance, then kung fu.**

### Rule 3 — preview on localhost before every deploy

**Nathan's standing rule: no design change is pushed to Netlify until he has
seen it on a localhost preview and approved it.** Never go straight from editing
a file to `git push`.

This matters because `portal-hybrid/` is both the preview folder and the folder
Netlify publishes to `makfai.org`. There is no build step and no staging copy,
so a push is live immediately. The localhost preview is the only review gate
between a change and the public site.

1. Make the edit.
2. Serve the folder (`python3 -m http.server 8115 --bind 127.0.0.1 --directory
   portal-hybrid`) — the servers do not survive a reboot.
3. Give Nathan the URL; `open -a "Google Chrome" <url>` if he asks.
4. **Wait for his approval.**
5. Then commit and push.

Committing locally while waiting is fine — nothing deploys until the push.

### The hybrid design (current direction)

Nathan's balance requirement: all-dark reads less clear/professional, all-white
loses the personality. The hybrid resolves it with a **band rhythm** — dark
where the atmosphere lives, warm paper where people read:

> dark night-photo hero → paper About → dark showcase band (video thumbnails
> want dark) → paper quotes + Contact → dark footer

Tokens (defined in each variant's `style.css`):

- Dark bands: `--bg #0B0708` (warm, not neutral), `--red #E63B52`,
  `--gold #F2B441`, glow/neon allowed here only.
- Paper bands (`.band-light`): `--paper #FAF6EF`, `--ink-l #221A15`,
  daylight accents `--red-l #C8102E` (5.0:1) and `--bronze #8A5E0C` (4.9:1).
  Neon values fail contrast on paper — never carry them over.
- Type (Google Fonts, the one allowed external): **Inter** carries the site —
  headings included; **Fraunces** is the serif, now only for numerals and the
  odd display figure; **Poppins** is the hero's donor line. Space Grotesk was
  the original hybrid face and is **gone** — don't reintroduce it.
- Headings: one system, `.disp` — Inter 700, uppercase, tight tracking, with a
  short `.disp-rule` bar underneath. `.disp-xl` for hero-scale. Every section
  heading uses it; the serif headline treatment is retired.
- **One green, one gold, split by ground.** `--jade #1E5A44` on paper,
  `--gold #F2B441` on dark — that's the whole rule, and the section rules,
  eyebrows and accents all follow it. No single hex works on both: the bright
  green is 2.5:1 on paper and jade is 2.5:1 on the dark ground. The bright
  green lives on as `--jade-bright #39B44A` for dark grounds only (hero LION
  DANCE, the Donate fill).

Interactions (all respect `prefers-reduced-motion`): scroll reveals via
IntersectionObserver, glass nav with scrollspy (paper glass + ink text once
scrolled), button ripple/sheen/press, video lightbox, Ken Burns hero, and the
`.flick` **neon flicker** — a real sign's stutter (two brief dips every 9–12s,
staggered timers, never a constant buzz). Contact forms compose a `mailto:`
(static-honest — the old Wix form posted to Wix's backend).

### Deploying

**`git push` deploys.** See `mak-fai/DEPLOY.md` for the per-site Netlify
settings. One GitHub repo, three Netlify sites, each with a different **base
directory** so it only ever publishes its own folder:

| Domain | Base directory |
|---|---|
| `makfai.org` | `portal-hybrid` |
| `makfailiondance.org` | `lion-dance-makfailiondance-org` |
| `makfaikungfu.org` | `kung-fu-makfaikungfu-org` |

No build command — these are static files. Do **not** use the Netlify CLI: this
machine has no Node, and a stale root-level `.netlify/` cache once pointed
`publish` at the repo root, which would have shipped every mockup and variant
folder to the live domain. It has been deleted.

### Folder map (`mak-fai/`)

| Folder | Role | State |
|---|---|---|
| `portal-hybrid/` | **makfai.org portal — the live deploy directory** | **Current build, and what Netlify publishes to makfai.org.** Self-contained deploy: also holds `_redirects`, `netlify.toml`, `robots.txt`, `sitemap.xml`. What you preview on :8115 is byte-for-byte what ships. **Two pages**: `index.html` and `donate.html`, sharing one `style.css`. Current section order on the portal: split-screen hero (LION DANCE / KUNG FU, watermark hanzi, Support us) → Who we are → One roof, two traditions → Our values → Keeping tradition in motion → **Awards & honors** (the dark "trophy case") → Gallery & film → Bookings → Contact → footer. The 麥館 ink calligraphy is now an alpha-transparent PNG (`assets/mak-kwoon.png`, not the .jpg) — see the blend-mode gotcha below. |
| `liondance-com-hybrid/` | Template for the **future lion dance site** | Nathan: how this looks "is how the lion dance page should be." Full one-pager with all 8 YouTube films. Don't touch until the lion dance site is up next. |
| `liondance-com-modern/` | All-dark first pass of the .com redesign | Superseded exploration; kept for comparison. |
| `portal-makfai-org/` | Superseded placeholder for makfai.org | The old 4.9 KB landing page. Kept as the reference implementation for cross-site link rules; **no longer deployed** — `portal-hybrid/` replaced it. |
| `lion-dance-makfailiondance-org/`, `kung-fu-makfaikungfu-org/` | Deploy folders for the school sites | Placeholder landing pages + netlify config. |
| `site/`, `site-light/`, `site-neon-red/` | The three original theme variants (four pages each) | Predate the hybrid. `site-neon-red/` documents the C-ID red-neon art direction; `site-light/` documents the daylight token derivation. Both informed the hybrid. `site/` is the superseded green-led dark. |
| `mockups/` | 17 early exploration pages | Untouched. |
| `.bak-site/` | Pre-cross-site-fix originals of `site/` | Archive. |

All portal/lion-dance assets are local (`assets/` in each folder — pulled from
the Wix CDN and YouTube). No external dependencies except Google Fonts and the
YouTube embeds the lightbox opens.

### Gotchas that cost time

- **The fixed nav must stack above `main`.** `header` gets `z-index:60`;
  `main`/`footer` get `z-index:1`. When all three shared `z-index:1`, every
  opaque section painted over the fixed nav (later DOM wins a z-index tie), so
  the header "appeared and disappeared" depending on which band was under it.
- **A `.btn` inside `.nav-links` needs the link rules to exclude it.** The
  `.nav-links a` selectors out-specify `.btn`, which squished the nav CTA and
  greyed its text. Every nav-link rule is written `.nav-links a:not(.btn)`.
  Keep that pattern when adding nav rules.
- **`calligraphy.png` is white artwork on transparency** — invisible on light
  grounds. The light theme flattens it with `filter: brightness(0)`.
- **Never use `mix-blend-mode: multiply` on anything inside a `.reveal`.** An
  ancestor's animated opacity isolates blend compositing per spec, so the
  multiply blends against transparent mid-transition and flashes white. That's
  why `mak-kwoon.png` exists as a real alpha cutout.
- **Headless Chrome silently clamps `--window-size` below ~500px to 500, then
  *crops* the screenshot to the size you asked for.** Every sub-500px "mobile"
  shot is a lie, and it manufactures phantom "text is cut off" bugs. Use CDP
  `Emulation.setDeviceMetricsOverride` for narrow viewports instead, and
  `Page.captureScreenshot`'s `clip` in *document* coordinates (add `scrollY`).
- **`logo.png` is mostly dark olive and gold** — sits fine on both grounds.
- **Do not let a hero pseudo-element bleed past its box.** A lantern string
  written with `left:-6%; right:-6%` once pushed the document 316px wider than
  the viewport.
- **Headless-Chrome screenshots of these pages only render at scroll 0**, and
  IntersectionObserver reveals don't fire while the preview pane is hidden.
  Full-page proof shots: temporarily pin `min-height:100svh` → `900px` and make
  `.reveal` visible, capture with `--window-size=1440,<docHeight>`, revert.

### Open

- Portal: **shipped and live on makfai.org.** Still open on it —
  (a) `donate.html` has **no payment processor**; the Give button opens a
  mailto pledge and deliberately collects no card details. Swap the click
  handler for a hosted checkout (Stripe Payment Link / Givebutter / PayPal
  Giving Fund) and rewrite `.give-fine` to describe the real flow.
  (b) The association's **EIN** is missing from the giving page — left blank on
  purpose rather than filled with a placeholder.
  (c) **Privacy Policy** is an `href="#"` placeholder on both pages.
  (d) `hello@makfai.org` must be a live, monitored inbox — both the booking
  form and every giving path land there.
- Lion dance site: build next from `liondance-com-hybrid/`, adding the
  performance reels (WAVE, King of the Streets, Showtime, Team Wind) that were
  deliberately left off the portal.
- Kung fu site: nothing designed yet; no photography exists.
- `site/kung-fu.html` and `site/lion-dance.html` are orphaned since the
  cross-site fix — fold into the school sites or delete. Not yet decided.
- Theme variants carry a floating `.themepeek` pill; blog layouts carry `.pv`.
  **Preview-only — strip before anything ships.**

---

## Running the previews

No dev server, no build. One static server per variant:

```bash
python3 -m http.server 8115 --bind 127.0.0.1 --directory "mak-fai/portal-hybrid"
```

| Port | Serves |
|---|---|
| 8101–8105 | Blog layouts 01–05 |
| 8110 | Mak Fai — original dark theme variant |
| 8111 | Mak Fai — light theme variant |
| 8112 | Mak Fai — red neon theme variant |
| 8113 | Mak Fai — all-dark .com redesign (superseded) |
| 8114 | Mak Fai — hybrid bands, future lion dance template |
| 8115 | Mak Fai — **makfai.org portal, current build** |

Stop them with `pkill -f "http.server 81"`. They do not survive a reboot.

A shareable hosted preview of the portal (self-contained, videos link out to
YouTube instead of the lightbox) lives at
https://claude.ai/code/artifact/83b9ef94-ba36-407f-86a4-de5365983c4e — private
to Nathan until shared; republish to the same URL when the portal changes.

## Conventions

- Static HTML, no framework, no dependencies, no build step. Keep it that way.
- Reuse the existing design tokens and class names. Both projects have a real
  stylesheet already; new work extends it rather than introducing a parallel
  system.
- Check colour contrast before shipping an accent. Both projects have had
  accent colours that failed badly on the opposite ground.
- Check for horizontal overflow at 1440px and 375px. It has bitten twice.
- Preview-only chrome (`.pv`, `.themepeek`) is clearly commented in each
  stylesheet. Strip it before anything goes live.
