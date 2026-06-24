import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

// Verified sender. Swap for an address on your own verified domain once set up.
const FROM_EMAIL = 'GP Autocare <onboarding@resend.dev>';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends a friendly confirmation. Best-effort: never throws, so a mail failure
// can't roll back a submission that was already saved.
async function sendConfirmationEmail({ name, email }) {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not set — skipping confirmation email.');
    return;
  }

  const firstName = name.split(/\s+/)[0] || name;

  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Thanks for reaching out, ${firstName}`,
      text:
        `Hi ${firstName},\n\n` +
        `Thanks for reaching out to GP Autocare — we've got your request and we're already looking it over. ` +
        `Expect a clear, no-pressure quote from us within a day.\n\n` +
        `In the meantime, sit tight. We'll bring back that new-car feeling soon.\n\n` +
        `— The GP Autocare team\n` +
        `hello@gpautocare.com · (415) 555-0142`,
      html:
        `<div style="font-family:Arial,Helvetica,sans-serif;color:#10151C;line-height:1.6;max-width:520px">` +
        `<p>Hi ${firstName},</p>` +
        `<p>Thanks for reaching out to <strong>GP Autocare</strong> — we've got your request and we're already looking it over. ` +
        `Expect a clear, no-pressure quote from us within a day.</p>` +
        `<p>In the meantime, sit tight. We'll bring back that new-car feeling soon.</p>` +
        `<p style="margin-top:24px">— The GP Autocare team<br>` +
        `<a href="mailto:hello@gpautocare.com" style="color:#2E8BE0">hello@gpautocare.com</a> · (415) 555-0142</p>` +
        `</div>`,
    });

    if (error) {
      console.error('Resend send failed:', error);
    }
  } catch (err) {
    console.error('Resend send threw:', err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
    return res
      .status(500)
      .json({ ok: false, error: "Something went wrong on our end. Please email hello@gpautocare.com." });
  }

  // Vercel parses JSON bodies automatically, but fall back to manual parsing.
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Please add your name and email.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase
    .from('signups')
    .insert({ name, email, message: message || null });

  if (error) {
    console.error('Supabase insert failed:', error);
    return res
      .status(500)
      .json({ ok: false, error: "We couldn't save your request just now. Please try again in a moment." });
  }

  // Fire the confirmation email after the row is safely stored. Awaited so it
  // runs before the function freezes, but failures are swallowed inside.
  await sendConfirmationEmail({ name, email });

  return res.status(200).json({ ok: true });
}
