# makfai.org launch checklist

For whoever runs the launch. It lives at the repo root, so it is never deployed
(only `portal-hybrid/` is published). Tick items as you go.

## Before you start

- [x] The password gate has been removed: makfai.org is public and visitors
      land straight on the site (see "The password gate was removed" below).
- [ ] Stripe dashboard (Test mode **off**) → Payment Links: confirm these six
      are **Active** and show the right amount with no TEST MODE badge:
      - flexible amount: `donate.stripe.com/6oU00k85z2MraXBekfafS00`
      - $25: `buy.stripe.com/00w6oIfy1cn12r5b83afS01`
      - $50: `buy.stripe.com/9B6fZi0D74Uz3v9fojafS02`
      - $150: `buy.stripe.com/9B63cw71v9aPd5J2BxafS06`
      - $250: `buy.stripe.com/bJecN6etX5YDfdRekfafS04`
      - $500: `buy.stripe.com/7sY4gA1Hbcn1aXB0tpafS05`
- [ ] Deactivate the retired $125 link `buy.stripe.com/dRmeVedpT3Qv7Lp4JFafS03`
      (deactivate, don't delete, so its history is kept).
- [ ] On each of the six links, open **After payment** → "Don't show
      confirmation page" → redirect to `https://makfai.org/thank-you.html`.
- [ ] Set a minimum amount (e.g. $5) on the flexible-amount link. It is the
      one card-testers target. Confirm Radar is on.

## Launch day

1. **Tag the release.**
   `git tag -a launch-2026-XX-XX -m "makfai.org public launch" && git push origin --tags`
2. **Deploy** (`git push origin main`), then check HTTPS:
   ```bash
   for u in http://makfai.org/ http://www.makfai.org/ https://www.makfai.org/ https://makfai.org/; do
     curl -s -o /dev/null -w "$u -> %{http_code} %{redirect_url}\n" "$u"; done
   curl -sI https://makfai.org/ | grep -iE "content-security|permissions-policy|strict-transport"
   ```
   Expect 301s to `https://makfai.org/`, a final 200, and all three headers.
3. **Walk every core journey** on a phone and on a desktop:
   - home → Donate (header pill) → pick an amount → "Give $… with card" opens
     Stripe in a new tab
   - home → a film card → the video plays → Close / Escape returns you
   - home → "Request a booking" → fill the form → Send opens your mail app,
     and the confirmation note appears under the button
   - donate → "Email us your pledge" (the amount you picked is filled in)
   - a made-up address such as `/nope` shows the "Page not found" page
4. **One real test** (you do this, not the site): send one booking message and
   make one small real card gift. Confirm both arrive (hello@ inbox, Stripe
   dashboard, receipt email, redirect to the thank-you page), then refund the
   gift in Stripe.
5. **Console clean.** Open DevTools → Console on `/`, `/donate`, `/privacy`,
   `/thank-you` and `/nope`. There should be no red errors, and in particular no
   "Content Security Policy" messages. Open a film once with the console open.
6. **Analytics.** Not installed yet (owner decision pending, see below). Once
   it is: confirm the visit and the donate/contact events show up. If the tool
   uses cookies, confirm the consent banner blocks it until Accept.
7. **Search.** Check `https://makfai.org/robots.txt` and `/sitemap.xml` load.
   In Google Search Console, add the property and submit
   `https://makfai.org/sitemap.xml`.
8. **Share preview.** Paste `https://makfai.org/` into a messaging app and
   check the image (the "Culture" group photo, 1200×630), title and
   description. Re-scrape in Facebook's Sharing Debugger and LinkedIn's
   Post Inspector so their cached old preview is replaced.
9. **Monitoring live.** Create free UptimeRobot (or Better Stack) monitors:
   - keyword monitor on `https://makfai.org/` for the text `Mak Fai`
   - keyword monitor on `https://makfai.org/donate` for `Make a gift`
   - HTTP monitor on one Stripe Payment Link

   Send alerts to a phone or inbox someone actually reads. In Netlify, turn on
   deploy-failed and usage/bandwidth notifications.

## First week

- [ ] Daily: uptime alerts, Netlify deploy log, the hello@ and donations@ inboxes.
- [ ] PageSpeed Insights (pagespeed.web.dev) on `/` and `/donate`, mobile and
      desktop. The biggest lever is image weight (the heroes are about 1.6 MB).
- [ ] securityheaders.com scan of `https://makfai.org/`.
- [ ] WAVE (wave.webaim.org) accessibility check on `/` and `/donate`.
- [ ] Search Console → Pages / Crawl errors.
- [ ] Email authentication: makfai.org has no SPF or DMARC record, so anyone
      can spoof mail "from" donations@makfai.org. In Netlify DNS add
      TXT `@` `v=spf1 include:_spf.google.com ~all` and
      TXT `_dmarc` `v=DMARC1; p=none; rua=mailto:hello@makfai.org`.
- [ ] Remaining held items (see "Held back" below).

## The password gate was removed

The pre-launch password screen (the client-side gate on the home and donate
pages) was removed when the site went public: its markup and inline script,
`lion-dragon.js`, `assets/pw-gate.js`, the PASSWORD GATE block in `style.css`,
the `/lion-dragon.js` cache rule in `netlify.toml`, and the preview-password
sentence in `privacy.html`. It is still in git history if it is ever needed
again (look for the commit "Remove the pre-launch password gate").

Still to do, whenever convenient: the remaining inline scripts could move into
`.js` files, which would let `script-src` drop `'unsafe-inline'` in
`portal-hybrid/netlify.toml`.

## Security headers: keep them in step

`portal-hybrid/netlify.toml` carries a Content-Security-Policy. Any new
script, embed, font or form service (analytics, Sentry, a map, a different
video host) must be added to it **in the same change**, or browsers will
block it on the live site. The localhost preview does not send these headers.

## UTM tags for links you post

Tag only links posted **off** the site (email, social, QR codes, partners),
never links between makfai.org pages. Use lowercase with hyphens, spelled the
same way every time, and keep a shared list of campaign names.

| Tag | Means | Examples |
|---|---|---|
| `utm_source` | where the link lives | `newsletter`, `instagram`, `facebook`, `flyer` |
| `utm_medium` | channel type | `email`, `social`, `qr`, `referral` |
| `utm_campaign` | the push | `lunar-new-year-2027`, `giving-tuesday-2026` |
| `utm_content` | which link, if a message has several | `header-button`, `bio-link` |

Examples:

- `https://makfai.org/donate?utm_source=newsletter&utm_medium=email&utm_campaign=giving-tuesday-2026`
- `https://makfai.org/?utm_source=instagram&utm_medium=social&utm_campaign=lunar-new-year-2027&utm_content=bio-link`

UTM tags only report once an analytics tool is installed.

## Load test (optional)

The site is static on Netlify's CDN, so a load test mostly measures Netlify.
The real risk from a spike is bandwidth cost. A quick check without installing
anything, hitting the HTML only (never the images or the Stripe links):

```bash
seq 500 | xargs -P 25 -I{} curl -s -o /dev/null -w "%{http_code}\n" https://makfai.org/ | sort | uniq -c
```

## Held back (owner's call)

These were found in the launch audit but not built, because each one adds or
restyles something visible, and the site's colours, fonts and design stay
exactly as approved:

- A "Make a gift" button in the donate page's top section.
- Stronger focus rings on 6 controls where the ring matches the background
  ("Give with card", "Send message", "Request a booking", the 3 film cards,
  the 404 page button). Also hover underlines on a few footer and fine-print links.
- A contrast backing behind the "Award-winning documentary" badge, and darker
  form placeholder text.
- A thumbnail poster while a film loads, and a "Watch on YouTube" fallback link.
- A 5-question FAQ (answers from existing copy) with FAQ schema.
- A "Get directions" link by the studio address.
- A floating back-to-top button on long pages.
- Copy buttons for the Zelle ID and email.
- Real italic Fraunces (the site's Fraunces files have no italic, so browsers slant it themselves).
- WebP images at display size (about 6 MB saved; re-encoding changes pixels slightly).
- A print stylesheet.
