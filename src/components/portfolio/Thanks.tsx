import Link from 'next/link';
import Header from './Header';
import { dictionaries, Locale, localPath } from '@/lib/locale';

export default function Thanks({ locale = 'en' }: { locale?: Locale }) {
  const t = dictionaries[locale];
  return <div className="portfolio" lang={locale}><Header locale={locale} /><main className="shell section"><span className="eyebrow">{t.thanksLabel}</span><h1>{t.thanksTitle[0]}<br />{t.thanksTitle[1]} <em>{t.thanksTitle[2]}</em></h1><p className="muted">{t.thanksDescription}</p><Link href={localPath(locale)} className="button primary" style={{ marginTop: 24 }}>{t.backHome} ↗</Link></main></div>;
}
