'use client';

import { FormEvent, useRef, useState } from 'react';
import { LuArrowUpRight as ArrowUpRight, LuCircleCheck as CheckCircle2, LuLoaderCircle as LoaderCircle } from 'react-icons/lu';
import { dictionaries, Locale } from '@/lib/locale';

export default function ContactForm({ direct = false, locale = 'en' }: { direct?: boolean; locale?: Locale }) {
  const t = dictionaries[locale];
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const sending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    const form = event.currentTarget;
    setStatus('sending');
    setMessage('');
    try {
      const fields = Object.fromEntries(new FormData(form));
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(fields),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.code === 'ACTIVATION_REQUIRED' ? t.activationRequired : response.status === 503 ? t.unavailable : t.sendError);
      setStatus('sent');
      setMessage(t.sent);
      form.reset();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error && [t.unavailable, t.sendError, t.activationRequired].includes(error.message) ? error.message : t.sendError);
    } finally {
      sending.current = false;
    }
  }
  return <form onSubmit={submit} className="contact-form" aria-busy={status === 'sending'}>
    <div className="form-row">
      <label>{t.name}<input name="name" autoComplete="name" placeholder="Alex Morgan" required maxLength={100} /></label>
      <label>{t.email}<input name="email" type="email" autoComplete="email" placeholder="alex@company.com" required maxLength={254} /></label>
    </div>
    <label>{t.subject}<input name="subject" placeholder={t.subjectPlaceholder} required maxLength={150} /></label>
    <label>{t.message}<textarea name="comment" rows={5} placeholder={t.messagePlaceholder} required minLength={10} maxLength={5000} /></label>
    <div className="honeypot" aria-hidden="true"><label>{t.website}<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <div className="form-bottom"><span>{t.formHint}</span><button className="button primary" disabled={status === 'sending'}>{status === 'sending' ? <>{t.sending} <LoaderCircle className="spin" size={18} /></> : <>{t.send} <ArrowUpRight size={18} /></>}</button></div>
    <p role={status === 'error' ? 'alert' : 'status'} aria-live="polite" className={`form-message ${status}`}>{status === 'sent' && <CheckCircle2 size={18} />}{message}</p>
    {direct && <p className="muted">{t.provider}</p>}
  </form>;
}
