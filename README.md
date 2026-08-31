# Mak Fai — placeholder sites

Three standalone, zero-dependency static sites. Each folder is a complete Netlify
deploy: drag the **folder itself** onto https://app.netlify.com/drop.

| Folder | Domain to buy | Role |
|---|---|---|
| `portal-makfai-org/` | makfai.org | Main portal, bridges the two schools |
| `lion-dance-makfailiondance-org/` | makfailiondance.org | Lion dance team |
| `kung-fu-makfaikungfu-org/` | makfaikungfu.org | Kung fu school |

## Deploy + buy order

1. Drag folder → Netlify Drop. You get a `random-name.netlify.app` project.
2. Rename the project (Site configuration → Change site name) to something sane,
   e.g. `makfai-portal`.
3. In that project: **Domain management → Add a domain → Buy a new domain**.
   Buy the matching `.org`. Netlify becomes the registrar and wires DNS + HTTPS
   automatically.
4. Repeat for the other two.

## Before the real build

- `makfailiondance.com` (registered 2019, at Wix) still holds the SEO. Do **not**
  take it down. When the `.org` is live, 301 the whole `.com` → `.org` and keep
  the `.com` renewed.
- `info@makfai.org` is a placeholder in all three files — search for `TODO`.
- The portal's Lion Dance card currently points at the live `.com`; repoint to
  `.org` after the redirect is in place.
- `_redirects` sends every path to the one placeholder page. Delete it when the
  real multi-page site ships.
