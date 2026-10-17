'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { dictionaries, Locale, localPath } from '@/lib/locale';
import { LuArrowUpRight, LuMenu, LuX } from 'react-icons/lu';

export default function Header({ locale = 'en' }: { locale?: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = dictionaries[locale];
  const [open, setOpen] = useState(false);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  function changeLanguage(value: Locale) {
    const path = pathname.replace(/^\/(en|fr|de)(?=\/|$)/, '') || '/';
    setOpen(false);
    router.push(localPath(value, path));
  }
  return <header className="site-header"><div className="shell header-inner">
    <Link href={localPath(locale)} className="wordmark" aria-label={`Zakaria Missou — ${t.nav[0]}`}>zm<span>.</span></Link>
    <div className="header-controls"><label className="language-picker"><span className="sr-only">{t.language}</span><select value={locale} onChange={event => changeLanguage(event.target.value as Locale)} aria-label={t.language}><option value="en" lang="en">English</option><option value="fr" lang="fr">Français</option><option value="de" lang="de">Deutsch</option></select></label>
    <button className="menu-toggle" aria-label={open ? t.closeMenu : t.openMenu} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? <LuX /> : <LuMenu />}</button></div>
    <nav id="main-nav" aria-label={t.navigation} className={open ? 'main-nav open' : 'main-nav'}>
      {['/', '/about', '/projects'].map((href, index) => <Link key={href} href={localPath(locale, href)} onClick={() => setOpen(false)} aria-current={pathname === localPath(locale, href) ? 'page' : undefined}>{t.nav[index]}</Link>)}
      <Link href={localPath(locale, '/contact')} onClick={() => setOpen(false)} className="nav-contact">{t.nav[3]} <LuArrowUpRight /></Link>
    </nav>
  </div></header>;
}
