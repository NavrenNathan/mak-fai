# Mak Fai Kung Fu — makfaikungfu.org

This folder is the deploy directory for **`makfaikungfu.org`**, one of three
sites in the `mak-fai/` repo (see the root `CLAUDE.md` for how the three fit
together: portal, lion dance, kung fu — one repo, three Netlify sites, each
publishing only its own base directory).

**Current state: placeholder only.** `index.html` here is a pre-hybrid
coming-soon page (dark red/gold, serif display face, its own tiny inline
`<style>` block) with no relation to the design system below. It predates the
portal entirely and gets fully replaced, not extended, when this site is
built for real.

---

## Rule 1 — this site is specific, the portal is general

Nathan set this rule after an early redesign came out reading as a lion dance
page instead of an association page. It cuts the other way here:

- **The portal (`makfai.org`)** carries the association's history, awards,
  both schools presented with equal weight, general contact. It does **not**
  belong to this school.
- **This site** is everything the portal deliberately leaves out:
  - Class schedule, pricing, age groups / skill levels
  - The curriculum — traditional **Hung Sing Choy Lay Fut** kung fu: forms,
    weapons, self-defense, sparring, whatever the real program breakdown is
  - Instructor bios, starting with **Grandmaster Mak Hin Fai** (founded the
    school in 1974) and any senior instructors under him
  - A trial-class or first-visit CTA — the single most important button on
    the page
  - Location, hours, how to actually show up
  - Photos/video of **this school's own training**, not lion dance
  - Student testimonials, belt/rank progression if the school uses one

Build order per the root doc: portal first (done), lion dance next, kung fu
last. If lion dance still doesn't exist when this is built, don't invent
content for it — link out to `makfailiondance.com` (see Rule 2) and move on.

---

## Rule 2 — cross-site links stay absolute

Any button, card, or nav item pointing at the **portal** or **lion dance**
must be a real external URL, never an internal page:

| Points at | URL to use |
|---|---|
| The association / portal | `https://makfai.org` |
| Lion dance | `https://www.makfailiondance.com` **(not `.org` yet)** — the `.com` (2019, Wix) holds the SEO and the `.org` has no 301 from it yet. Mark every such link with a `TODO: repoint once .org is live + 301` comment, same as the portal does, so the eventual repoint is one search-and-replace. |

Never create an internal `lion-dance.html` or a page that tries to *contain*
the association's content — that's the exact mistake Rule 1 exists to
prevent. Only same-property links (this site's own pages/sections) stay
relative.

---

## Rule 3 — preview on localhost before every push

Same standing rule as the portal, and for the same reason: this folder is
**both** the preview folder and what Netlify publishes to `makfaikungfu.org`.
No build step, no staging copy — a push is live immediately.

1. Make the edit.
2. `python3 -m http.server 8115 --bind 127.0.0.1 --directory kung-fu-makfaikungfu-org`
   (pick a free port — 8115 is the portal's; use something else if that
   server is already running).
3. Give Vincent/Nathan the URL.
4. **Wait for approval.**
5. Commit and push. `git push` deploys — see the root `DEPLOY.md`.

Committing locally while waiting for approval is fine; nothing goes live
until the push.

---

## The design system — don't invent a new one

**Start from `../portal-hybrid/style.css` and `../portal-hybrid/index.html`.**
Copy the relevant blocks in rather than rebuilding the system from scratch —
the whole point of three sites sharing one family is that a visitor can tell
they're the same association. What follows is that system, distilled.

### Tokens

```
Dark bands:   --bg #0B0708 (warm, not neutral)   --red #E63B52   --gold #F2B441
Paper bands:  --paper #FAF6EF   --ink-l #221A15
              --red-l #C8102E (5.0:1)   --bronze #8A5E0C (4.9:1)
```

**One green, one gold, split by ground — this is the whole rule:**
`--jade #1E5A44` on paper, `--gold #F2B441` on dark. No single hex works on
both grounds (the bright green measures 2.5:1 on paper; jade measures 2.5:1
on dark — both fail contrast on the "wrong" ground). If a bright
lion-dance-style green is ever needed on a dark band here, that's
`--jade-bright #39B44A`, kept as its own token rather than reusing `--jade`.

Neon/glow values (used for hover glows, decorative washes) belong on dark
bands only — they fail contrast if carried onto paper.

### Type

Google Fonts, the one allowed external dependency:

- **Inter** carries the whole site, headings included.
- **Fraunces** (serif) — numerals and the occasional display figure only.
- **Poppins** — reserved for a donor/CTA-style standout line, if this site
  ever needs one (the portal uses it for the hero's nonprofit statement).
- **Space Grotesk is retired.** It was the original hybrid face before the
  type system settled on Inter. Don't reintroduce it.

### Headings

One system: `.disp` — Inter 700, uppercase, tight tracking, with a short
`.disp-rule` bar underneath (`.disp-xl` for hero scale). Every section
heading uses it. The rule bar is `--gold` on dark bands, `--jade` on
`.band-light` — this is the same green/gold split as everywhere else, not a
separate decision per heading.

### Band rhythm

The hybrid resolves "all-dark reads corporate, all-white loses personality"
with alternating bands — dark where the atmosphere lives (photos, video,
awards/highlights), paper where people read (body copy, forms, contact). A
school site's natural rhythm:

> dark training-photo hero → paper "the curriculum" → dark showcase (class
> photos/video, testimonials) → paper schedule + trial-class CTA → dark
> footer

Paper sections carry the `.band-light` class, which flips the relevant
tokens (`--ink-l`, `--jade`, `.disp` color, `.disp-rule` color) automatically
— don't hand-override colors inside a `.band-light` section; add the class
and let the cascade do it.

### Reusable components (copy from `portal-hybrid/style.css`)

- **`.btn` / `.btn-ink` / `.btn-paper`** — the button family. `.btn-ink` for
  solid dark-on-paper CTAs (paper bands), `.btn-paper` for ivory buttons on
  photo/dark backgrounds.
- **`.cta` + `.arr`** — the underlined text-link-with-arrow pattern
  ("Explore kung fu →"), used for secondary actions. The arrow swaps from →
  to ↗ on hover via two stacked SVGs, not a CSS transform on one glyph.
- **`.reveal`** — scroll-reveal via IntersectionObserver, respects
  `prefers-reduced-motion`. Add the class, no extra JS per element.
- **Card pattern** (`.pay-opt`-style: icon + heading + short copy + CTA) —
  the donate page's Zelle/Card boxes are the cleanest current example of a
  "highlighted option" card: icon top-left, heading, one line of why, then
  the action. Reuse this shape for e.g. "Adult classes" / "Youth classes"
  option cards, or the trial-class CTA block.
- **Icon technique** — icons are alpha-mask PNGs (`background-color:
  var(--gold); mask-image: url(assets/icon-x.png)`), not inline SVGs with
  hardcoded fill. This keeps every icon tied to the color token instead of a
  baked-in hex. If Vincent supplies artwork (a screenshot, an AI-generated
  icon sheet), key it to alpha the same way — see the Gotchas section for
  the exact ImageMagick recipe.
- **Mobile nav** — **no burger menu.** The portal dropped it: the full-screen
  menu it opened held nothing but the social icons, so they moved inline
  into the header bar instead (brand · social icons · Donate-equivalent
  CTA, all in one row, icons shrunk to 36px to fit). Don't reintroduce a
  burger unless this site's nav genuinely has enough links to need one.

### Interactions

All respect `prefers-reduced-motion`: scroll reveals, glass nav with
scrollspy (transparent-over-photo → paper-glass-with-ink-text once
scrolled), button ripple/press, video lightbox if there's training footage,
Ken Burns on the hero photo, `.flick` neon flicker for any dark-band neon
sign effect (a real sign's stutter — two brief dips every 9–12s, staggered,
never a constant buzz).

Contact/booking forms compose a `mailto:` — static-honest, no backend. If
this school ever wants real online booking (trial class sign-up, class
payment), that needs the same kind of real integration work as the portal's
Stripe donation link: a live third-party link the visitor is sent to, never
a fake form that pretends to submit somewhere.

---

## Gotchas (all proven, all cost real time on the portal)

- **Fixed nav must out-stack `main`.** `header{z-index:60}`,
  `main,footer{z-index:1}`. Equal z-index on all three means later DOM wins
  ties, and the nav flickers in and out depending which band is under it.
- **`.nav-links a` rules need `:not(.btn)`.** A bare `.nav-links a` selector
  out-specifies a `.btn` sitting inside the nav and squishes it. Every nav
  link rule should read `.nav-links a:not(.btn)`.
- **White-on-transparent artwork (like the 麥翹輝 calligraphy) is invisible
  on light grounds.** Light sections flatten it with `filter: brightness(0)`
  rather than needing a second asset.
- **Never `mix-blend-mode: multiply` inside `.reveal`.** An ancestor's
  animated opacity isolates blend compositing per spec, so the blend renders
  against transparent mid-fade and flashes white. If something needs to look
  ink-on-paper, cut a real alpha-transparent PNG instead of relying on blend
  mode over a `.reveal` fade.
- **Never type a bare Unicode arrow/star/symbol into markup** (↗, ★, etc.).
  iOS gives many of these codepoints emoji presentation by default — an `↗`
  meant to read as a hairline "opens in new tab" mark renders as a blue
  emoji tile instead. Draw it as an inline SVG (`.ext` class on the portal)
  so no platform's emoji font can substitute it.
- **Headless Chrome silently clamps `--window-size` below ~500px to 500,
  then *crops* the screenshot to the size requested.** Every sub-500px
  "mobile" screenshot taken this way is a lie and invents phantom
  "text is cut off" bugs. Use CDP `Emulation.setDeviceMetricsOverride` for
  real narrow-viewport testing, and `Page.captureScreenshot`'s `clip` in
  *document* coordinates (add `scrollY`) if clipping to a specific element.
- **Horizontal-overflow lock is two-layer, not one.** `overflow-x: clip` on
  `body` alone needs Safari 16+; on older iOS it silently degrades to
  `visible` and any deliberately-oversized decorative element (a glow that
  runs past the section edge, say) lets the whole page pan sideways. Use:
  ```css
  html,body{max-width:100%;overflow-x:hidden}
  @supports (overflow:clip){html,body{overflow-x:clip}}
  ```
  `hidden` is the floor (works everywhere), `clip` upgrades it where
  supported without turning the root into its own scroll container. Test the
  fallback by disabling `clip` and confirming the page still can't pan.
- **A CSS "reset" inside a media query must match the specificity of what
  it's undoing, not just restate the selector.** A bug on the portal: a
  desktop-only rule `.card:last-child{grid-column:5/7}` (specificity 0,2,0)
  kept winning inside a narrower breakpoint's plain `.card{grid-column:auto}`
  reset (0,1,0) — CSS resolves specificity *before* source order, so the
  "later" media-query rule lost even though it appeared later in the file.
  The fix was writing the reset as `.card:last-child{grid-column:auto}` to
  match. Whenever a responsive override isn't taking effect, check
  specificity before assuming a source-order or media-query problem.
- **A hero pseudo-element must not bleed past its box.** A decorative
  element written with `left:-6%; right:-6%` once pushed the whole document
  316px wider than the viewport. Any deliberately-oversized decorative
  element needs an explicit cap (`width:min(...,100%)`) as well as living
  inside an `overflow:hidden` ancestor.
- **Headless-Chrome screenshots only render at scroll 0**, and
  `IntersectionObserver` reveals don't fire while a preview pane is hidden
  from the renderer. For full-page proof shots: temporarily pin
  `min-height:100svh` down to something fixed and make `.reveal` visible by
  default, capture, then revert — or drive a real headless browser via CDP
  and scroll it in small steps before capturing (see the portal's `/tmp`
  scripts from its own build for the working pattern).
- **Never invent a placeholder that looks real.** When a real fact is
  missing — a phone number, an email, a venue, a dollar figure — leave it
  visibly marked as pending (a dashed border, italic "to be confirmed," a
  code comment) rather than a plausible-looking guess. The portal's Zelle
  box sat as `recipient to be confirmed` for an entire session rather than
  ship a guessed phone number that could have sent a donor's money to a
  stranger. Same standard applies to anything financial, legal, or
  otherwise irreversible on this site.

---

## Icon-from-artwork recipe (if Vincent supplies a screenshot or AI image)

Vincent has repeatedly supplied icon artwork as a screenshot or
ChatGPT-generated image, on a near-white background, meant to become a
tintable icon matching `--gold`/`--jade`. The working pipeline (ImageMagick):

```bash
# 1. Build the alpha from the MINIMUM rgb channel, not luminance --
#    luminance alone half-erases anything with a mid-grey fill (a gold star
#    on a gold coin, say). Crush the near-white background to fully
#    transparent; keep the ink solid.
magick source.png -alpha off -channel RGB -separate -evaluate-sequence min \
  -negate -level 8%,88% alpha.png

# 2. Recombine as a solid-black shape carrying that alpha, trim, square up,
#    resize. This PNG becomes the mask-image; the page paints it with
#    currentColor / background-color via CSS mask, so it's never
#    baked to a fixed hex.
magick -size <W>x<H> xc:black alpha.png -alpha off -compose CopyOpacity \
  -composite -trim +repage -background none -gravity center \
  -extent "%[fx:max(w,h)]x%[fx:max(w,h)]" -resize 200x200 -strip PNG32:icon.png
```

If ImageMagick's built-in SVG delegate produces a blank render when
rasterizing hand-drawn vector fallback art, use `rsvg-convert` instead — it's
far more reliable for stroke-based SVG (`rsvg-convert -w 400 -h 400 in.svg -o out.png`).

CSS side:

```css
.ico-x{width:40px;height:40px;background-color:var(--gold);
  -webkit-mask-image:url(assets/icon-x.png);mask-image:url(assets/icon-x.png);
  -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
  -webkit-mask-position:center;mask-position:center;
  -webkit-mask-size:contain;mask-size:contain}
```

---

## Deploying

**`git push` deploys**, same repo as the other two sites. Netlify base
directory for this domain: `kung-fu-makfaikungfu-org`. See the root
`DEPLOY.md` for the full per-site Netlify setup, the "Page not found"
troubleshooting steps, and why the Netlify CLI is avoided on this machine.

Cache-buster convention: bump `?v=NN` on the stylesheet link every time
`style.css` changes, so browsers can't serve a stale copy —
`<link rel="stylesheet" href="style.css?v=N">`, increment `N`.

**Domain status:** `makfaikungfu.org` currently returns **401** (Netlify
pre-launch password protection at the platform level — different from the
portal's client-side password gate). Leave it behind Netlify's 401 until
there's a real site here; don't remove that protection just to test —
localhost preview is the review gate per Rule 3.

---

## Open

- Nothing designed yet. No photography of this specific school exists —
  the portal's kung fu card uses the 麥館 ink calligraphy
  (`portal-hybrid/assets/mak-kwoon.png`) as a stand-in for exactly this
  reason. Get real photos of the kung fu classes/students before building
  the hero.
- No curriculum breakdown, pricing, schedule, or instructor bios written
  yet — these need to come from Vincent/Nathan, not be invented.
- Decide whether this site also wants a client-side password gate (like the
  portal's, for sharing a review link without Netlify credentials) or
  whether Netlify's 401 is enough until real launch. The portal only added
  its own gate because it needed to go *publicly reachable but
  password-protected* for review purposes — if that's not needed here yet,
  don't add the extra complexity.
