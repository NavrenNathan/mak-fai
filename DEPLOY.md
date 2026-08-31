# Deploying Mak Fai

Three separate Netlify sites, one GitHub repo. **Deploying is `git push`.**

Repo: `https://github.com/NavrenNathan/mak-fai` · branch `main`

There is no build step. Netlify publishes the folder as-is.

---

## The three sites

| Domain | Base directory | What it serves |
|---|---|---|
| `makfai.org` | `portal-hybrid` | The association portal — current hybrid build |
| `makfailiondance.org` | `lion-dance-makfailiondance-org` | Placeholder until the lion dance site is built |
| `makfaikungfu.org` | `kung-fu-makfaikungfu-org` | Placeholder until the kung fu site is built |

Known Netlify site ID (the portal, from the old CLI link): `25109611-afc4-4e4b-a60f-3ede7f90ba05`.
Confirm in the dashboard that this is the site on `makfai.org` before wiring it up.

Every one of those folders is a **complete, self-contained deploy**: `index.html`,
`style.css`, local `assets/`, plus `_redirects`, `netlify.toml`, `robots.txt`,
`sitemap.xml`. Nothing references a path outside its own folder.

---

## One-time setup, per site

In the Netlify dashboard → **Site configuration → Build & deploy → Continuous deployment**:

1. **Link repository** → GitHub → `NavrenNathan/mak-fai`.
2. **Branch to deploy:** `main`
3. **Base directory:** the folder from the table above (e.g. `portal-hybrid`)
4. **Build command:** *leave empty* — these are hand-written static files
5. **Publish directory:** *leave empty*

Leaving publish empty matters. Netlify reads `<base>/netlify.toml`, which says
`publish = "."` — resolved relative to the base directory, so it publishes the
folder itself and the security headers in that file get applied.

> **If the first deploy log says it published the repo root** (you'll see the
> other variant folders in the file list), the base directory didn't take. Set
> **Publish directory** to the same folder name explicitly and redeploy.

Repeat for all three sites. They share a repo; a push rebuilds all three, but
each only ever publishes its own folder.

### Then, before launch

All three `.org` domains currently return **401** — Netlify pre-launch password
protection. To go live: **Site configuration → Access & security → Visitor
access → Password protection → Remove.**

---

## Deploying

```bash
git add -A
git commit -m "what changed"
git push
```

Netlify picks it up on push. Watch the deploy log in the dashboard.

Pull requests get deploy previews automatically — useful for showing Nathan a
change before it hits the live domain.

### Rolling back

Netlify dashboard → **Deploys** → pick the last good deploy → **Publish deploy**.
Instant, no git revert needed.

---

## Before you push the portal live

- [ ] `makfailiondance.com` links are still correct — the `.com` holds the SEO.
      Three `TODO` markers in `portal-hybrid/index.html` (lines ~42, ~138, ~311)
      mark the links to repoint once the `.org` is live with a 301.
- [ ] `info@makfai.org` is a placeholder in the placeholder sites — search `TODO`.
- [ ] The kung fu school card uses the 麥館 calligraphy (`assets/mak-kwoon.jpg`)
      as a stand-in. Swap when a real kung fu photo exists.
- [ ] No preview-only chrome (`.pv`, `.themepeek`) in the deploy folder.
      `portal-hybrid` is currently clean — verify after any edit.
- [ ] `_redirects` sends every path to `/index.html`. Correct for a one-pager;
      **delete it** when a real multi-page site ships, or deep links break.

---

## What is *not* deployed

Everything else in this repo is working material, and Netlify never sees it
because each site only publishes its own base directory:

`liondance-com-hybrid/` `liondance-com-modern/` `site/` `site-light/`
`site-neon-red/` `mockups/` `portal-makfai-org/` `.bak-site/`

`portal-makfai-org/` is the superseded 4.9 KB placeholder, kept for reference.
The three `*.zip` files at the repo root are stale drag-and-drop artifacts from
the old deploy method — safe to delete once git deploys are confirmed working.

---

## Why not the Netlify CLI

This machine has no Node, npm, or npx, so `netlify-cli` would need a Homebrew
Node install and a browser login first. Git deploys need none of that.

A stale `.netlify/` CLI cache used to sit at the repo root recording
`publish = "<repo root>"`. That was a landmine — a bare `netlify deploy --prod`
would have published *every* variant folder and mockup to `makfai.org`. It has
been removed. If you ever do install the CLI, always pass `--dir` explicitly:

```bash
netlify deploy --site <site-id> --dir portal-hybrid --prod
```
