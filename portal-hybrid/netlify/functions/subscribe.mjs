// Newsletter signup -> Mailchimp.
//
// The footer form (assets/newsletter.js) posts each signup two places: to
// Netlify Forms, which keeps a copy in the dashboard, and here, which adds the
// address to the Mailchimp audience. Served at /api/subscribe on this same
// site, so the CSP needs nothing new (connect-src 'self').
//
// Configuration lives in Netlify, never in this file:
//   MAILCHIMP_API_KEY      e.g. abc123...-us21  (the part after "-" is the data centre)
//   MAILCHIMP_AUDIENCE_ID  the audience (list) ID from Audience > Settings
// Set them under Project configuration > Environment variables.
//
// Single opt-in: new addresses go straight to "subscribed". Existing contacts
// are left alone -- in particular, someone who unsubscribed is NOT
// resubscribed by signing up again from the site, because status_if_new only
// applies to addresses Mailchimp hasn't seen.
//
// This file sits inside the published folder, so netlify.toml blocks
// /netlify/* from being served as a static file. It holds no secrets either way.

import { createHash } from 'node:crypto';

const TAG = 'makfai.org signup';

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export default async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'POST only' });

  let form;
  try {
    form = await req.formData();
  } catch {
    return reply(400, { error: 'Bad request' });
  }

  // Honeypot: people never see this field, bots fill it in. Pretend it worked
  // so a bot gets no signal, but send nothing to Mailchimp.
  if (String(form.get('company') || '').trim()) return reply(200, { ok: true });

  const email = String(form.get('email') || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply(400, { error: 'Invalid email address' });
  }

  const key = process.env.MAILCHIMP_API_KEY;
  const audience = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!key || !audience || !key.includes('-')) {
    console.error('subscribe: MAILCHIMP_API_KEY / MAILCHIMP_AUDIENCE_ID missing or malformed');
    return reply(500, { error: 'Not configured' });
  }

  const dc = key.split('-').pop();
  const hash = createHash('md5').update(email).digest('hex');
  const base = `https://${dc}.api.mailchimp.com/3.0/lists/${audience}/members/${hash}`;
  const headers = {
    Authorization: 'Basic ' + Buffer.from('makfai:' + key).toString('base64'),
    'Content-Type': 'application/json',
  };

  // PUT is an upsert: creates the contact if new, leaves an existing one as is.
  const res = await fetch(base, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ email_address: email, status_if_new: 'subscribed' }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).detail || ''; } catch {}
    console.error('subscribe: Mailchimp', res.status, detail);
    // Mailchimp rejects addresses it judges fake or previously bounced with a
    // 400; pass that through so the page can say so. Anything else is ours.
    return reply(res.status === 400 ? 400 : 502, { error: 'Mailchimp rejected the signup' });
  }

  // Tag where the contact came from, for segmenting in Mailchimp. A failure
  // here doesn't undo the signup, so it isn't treated as one.
  try {
    await fetch(base + '/tags', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tags: [{ name: TAG, status: 'active' }] }),
    });
  } catch (e) {
    console.error('subscribe: tagging failed', e);
  }

  return reply(200, { ok: true });
};

export const config = { path: '/api/subscribe' };
