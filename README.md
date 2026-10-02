# Mak Fai

Three standalone, zero-dependency static sites in one repo.

> **Deploying is `git push`.** See [DEPLOY.md](DEPLOY.md) for the per-site
> Netlify settings. The drag-and-drop flow this file used to describe has been
> replaced by git-based continuous deployment.

| Deploy folder | Domain | Role |
|---|---|---|
| `portal-hybrid/` | makfai.org | Main portal, bridges the two schools |
| `lion-dance-makfailiondance-org/` | makfailiondance.org | Lion dance team |
| `kung-fu-makfaikungfu-org/` | makfaikungfu.org | Kung fu school |

All three domains are registered at Netlify with DNS and HTTPS wired.
Status (checked Oct 1, 2026): `makfai.org` and `makfaikungfu.org` are public
(200); the portal still shows a client-side preview password gate.
`makfailiondance.org` still returns 401 (Netlify Visitor access) — remove it
under **Access & security → Visitor access** to go live.

## Before the real build

- `makfailiondance.com` (registered 2019, at Wix) still holds the SEO. Do **not**
  take it down. When the `.org` is live, 301 the whole `.com` → `.org` and keep
  the `.com` renewed.
- `info@makfai.org` is a placeholder in the two placeholder sites (lion dance,
  kung fu) — search for `TODO`. The portal uses `hello@makfai.org`.
- The portal's Lion Dance card currently points at the live `.com`; repoint to
  `.org` after the redirect is in place.
- In the two placeholder sites, `_redirects` sends every path to the one
  placeholder page. Delete it when a real multi-page site ships there. The
  portal has none: Netlify serves its `404.html` for unknown paths.
