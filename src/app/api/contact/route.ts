import { NextResponse } from 'next/server';
import sendMail from '@/Service/mailService';
export const runtime = 'nodejs';
const reply = (error: string, status: number) => NextResponse.json({ error }, { status });
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return reply('This request is not allowed.', 403);
  if (!req.headers.get('content-type')?.includes('application/json')) return reply('Please send a JSON request.', 415);
  const reader = req.body?.getReader();
  if (!reader) return reply('Please provide a message.', 400);
  let bytes = 0;
  let body = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 32000) { await reader.cancel(); return reply('Your message is too long.', 413); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } catch { return reply('Could not read your message.', 400); }
  let input;
  try { input = JSON.parse(body); } catch { return reply('Invalid message format.', 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reply('Invalid message format.', 400);
  if (typeof input.website === 'string' && input.website.trim()) return NextResponse.json({ message: 'Message received.' });
  const fields = ['name', 'email', 'subject', 'comment'] as const;
  if (fields.some(field => typeof input[field] !== 'string')) return reply('Please fill in all fields.', 400);
  const { name, email, subject, comment } = Object.fromEntries(fields.map(field => [field, input[field].trim()])) as Record<typeof fields[number], string>;
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || /[\r\n]/.test(email) || !subject || subject.length > 150 || /[\r\n]/.test(subject) || comment.length < 10 || comment.length > 5000) return reply('Check your name, email, subject, and message (10-5,000 characters).', 400);
  try {
    if (process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL) {
      await sendMail(name, email, subject, comment);
    } else {
      // Keep browser requests on this origin. The provider receives no cookies or credentials.
      const siteOrigin = new URL(req.url).origin;
      const response = await fetch('https://formsubmit.co/ajax/missouzakaria03@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: siteOrigin, Referer: `${siteOrigin}/contact` },
        body: JSON.stringify({ name, email, subject, message: comment, _subject: `[Portfolio] ${subject}`, _template: 'table' }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) return reply('The email service is unavailable. Please try again.', 502);
      if (result.success !== true && result.success !== 'true') {
        if (typeof result.message === 'string' && /activat/i.test(result.message)) {
          return NextResponse.json({ error: 'Email activation is required.', code: 'ACTIVATION_REQUIRED' }, { status: 503 });
        }
        return reply('The email service could not accept this message. Please try again.', 502);
      }
    }
    return NextResponse.json({ message: 'Message sent successfully.' });
  } catch {
    return reply('Your message could not be delivered. Please try again or email missouzakaria03@gmail.com.', 502);
  }
}
