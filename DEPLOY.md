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

Netlify renamed things in a recent UI pass. Current labels:

| Older label | What you'll see now |
|---|---|
| Site configuration | **Project configuration** |
| Clear cache and deploy site | **Deploy project without cache** |
| Deploy site | **Deploy project** |

After changing build settings, redeploy with **Deploys → Trigger deploy →
Deploy project without cache** so the new settings are read fresh.

Repeat for all three sites. They share a repo; a push rebuilds all three, but
each only ever publishes its own folder.

### Then, before launch

All three `.org` domains currently return **401** — Netlify pre-launch password
protection. To go live: **Site configuration → Access & security → Visitor
access → Password protection → Remove.**

---

## Troubleshooting: "Page not found"

This is the failure mode to expect, and it bit once already.

**Symptom:** the domain resolves and HTTPS works, but Netlify serves its own
white "Page not found" page. None of your CSS loads, so it looks like the theme
vanished — it hasn't; you're simply not looking at your site at all.

**Cause:** the **Base directory** field is blank, so Netlify publishes the repo
root. The root holds only folders and markdown — there is no `index.html` there
— so there is nothing to serve at `/`.

**Fix:** set **Base directory** to the site's folder, save, redeploy without
cache.

**Confirm it in the deploy log:**

```
Publishing directory: /opt/build/repo/portal-hybrid    ← correct
Publishing directory: /opt/build/repo                  ← base directory not applied
```

Distinguish it from **"Site not found"**, which is a different failure: that one
means the hostname isn't mapped to any Netlify site at all (domain detached, or
you're on a different site's URL). "Page not found" is the healthier of the two
— the site is found and serving, it just has no file at that path.

---

## Deploying

> **Preview first, always.** No design change is pushed until Nathan has seen it
> on a localhost preview and approved it. `portal-hybrid/` is both the preview
> folder and what Netlify publishes, with no build step and no staging copy — so
> a push is live immediately, and the preview is the only review gate.
>
> ```bash
> python3 -m http.server 8115 --bind 127.0.0.1 --directory portal-hybrid
> ```
>
> Committing locally while waiting for approval is fine. Nothing deploys until
> the push.

Once approved:

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
The old drag-and-drop `*.zip` artifacts have been deleted and `*.zip` is
gitignored.

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
