import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';
import Header from '@/components/portfolio/Header';
import { dictionaries, localPath, type Locale } from '@/lib/locale';
import GamesGrid from './GamesGrid';
import { gameCopy } from './copy';
import { hubCopy } from './hub-copy';

export default function GamesHub({ locale = 'en' }: { locale?: Locale }) {
  const t = hubCopy[locale];
  const site = dictionaries[locale];
  return <div className="portfolio game-page games-hub" lang={locale}>
    <a href="#main" className="skip-link">{site.skip}</a><Header locale={locale} />
    <main id="main" className="shell game-page-main games-hub-main">
      <div className="game-breadcrumb"><Link href={localPath(locale)}><LuArrowLeft />{gameCopy[locale].back}</Link><span>{t.label}</span></div>
      <div className="game-page-intro"><div><span className="eyebrow">{gameCopy[locale].nav}</span><h1>{t.title}</h1></div><p>{t.description}</p></div>
      <GamesGrid locale={locale} />
    </main>
    <footer className="site-footer shell"><Link className="wordmark" href={localPath(locale)}>zm<span>.</span></Link><span>© {new Date().getFullYear()} Zakaria Missou</span><span>{site.footer}</span><a href="#main" className="back-top">{site.top} ↑</a></footer>
  </div>;
}
