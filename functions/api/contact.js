// Paste this entire file into the Cloudflare Worker editor for "cico-contact"
// Worker URL will be: https://cico-contact.verllegarllego.workers.dev

export default {
  async fetch(request, env) {

    // Allow all origins (fix this to clockincashout.org once confirmed working)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Quick GET test — visit the worker URL in browser to confirm it's alive
    if (request.method === 'GET') {
      return new Response('cico-contact worker is running', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, email, message } = body;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'All fields are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const safeName    = esc(name.slice(0, 100));
    const safeEmail   = esc(email.slice(0, 200));
    const safeMessage = esc(message.slice(0, 5000));
    const KEY         = env.RESEND_API_KEY;

    // Fetch live Discord invite — falls back to permanent backup
    let discordInvite = 'https://discord.gg/7xTDkXy55Q';
    try {
      const widgetRes = await fetch('https://discord.com/api/guilds/855603646614994974/widget.json');
      if (widgetRes.ok) {
        const widget = await widgetRes.json();
        if (widget.instant_invite) discordInvite = widget.instant_invite;
      }
    } catch (e) { /* fallback already set */ }

    // ── 1. Notify founders ──────────────────────────────────────────────────
    const founderRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Clock In, Cash Out WY <noreply@clockincashout.org>',
        to: ['contact@clockincashout.org'],
        reply_to: email,
        subject: `[CICO Contact] New message from ${safeName}`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0f3d26;padding:24px 28px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#fff;font-size:18px;">New Contact Form Submission</h1>
            </div>
            <div style="background:#fff;padding:28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 12px;"><strong>Name:</strong> ${safeName}</p>
              <p style="margin:0 0 20px;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color:#1a5c3a;">${safeEmail}</a></p>
              <div style="border-top:1px solid #eee;padding-top:16px;">
                <p style="margin:0 0 8px;font-weight:600;">Message:</p>
                <p style="margin:0;white-space:pre-wrap;line-height:1.6;color:#333;">${safeMessage}</p>
              </div>
              <p style="margin-top:20px;font-size:12px;color:#999;">Sent from clockincashout.org contact form</p>
            </div>
          </div>`,
      }),
    });

    if (!founderRes.ok) {
      const err = await founderRes.text();
      console.error('Resend founder send failed:', err);
      return new Response(JSON.stringify({ error: 'Failed to send. Please email us directly.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Auto-reply to sender ─────────────────────────────────────────────
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Clock In, Cash Out WY <noreply@clockincashout.org>',
        to: [email],
        reply_to: 'contact@clockincashout.org',
        subject: 'We got your message! — Clock In, Cash Out WY',
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0f3d26;padding:28px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">Clock In<span style="color:#d4a843;">,</span> Cash Out WY</h1>
            </div>
            <div style="background:#fff;padding:32px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 16px;font-size:16px;">Hey ${safeName},</p>
              <p style="margin:0 0 16px;line-height:1.7;color:#333;">Thanks for reaching out to Clock In, Cash Out WY! We got your message and one of our founders will get back to you within 24–48 hours.</p>
              <p style="margin:0 0 16px;line-height:1.7;color:#333;">In the meantime, join our Discord community for free resources and to connect with other Wyoming youth:</p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${discordInvite}" style="display:inline-block;background:#5865F2;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Join Our Discord</a>
              </p>
              <p style="margin:0 0 8px;line-height:1.7;color:#333;">Thanks for being part of this,</p>
              <p style="margin:0;font-weight:700;color:#0f3d26;">The CICO WY Team</p>
              <div style="margin-top:28px;padding-top:16px;border-top:1px solid #eee;">
                <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">Clock In, Cash Out WY — Youth-led financial education & career readiness<br>Laramie, Wyoming — Est. June 2025<br><br>We are not licensed financial advisors nor is this financial advice.</p>
              </div>
            </div>
          </div>`,
      }),
    });
    // Don't fail the whole request if the auto-reply errors

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
