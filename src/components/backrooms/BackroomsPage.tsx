import Link from 'next/link';
import { LuArrowLeft, LuArrowUpRight, LuAudioLines, LuGlobe, LuTimer } from 'react-icons/lu';
import Header from '@/components/portfolio/Header';
import { dictionaries, localPath, type Locale } from '@/lib/locale';
import BackroomsClient from './BackroomsClient';
import { horrorCopy } from './copy';
import { hubCopy } from '@/components/game/hub-copy';
import '@/components/game/game.css';
import './backrooms.css';

export default function BackroomsPage({ locale = 'en' }: { locale?: Locale }) {
  const t = horrorCopy[locale];
  const site = dictionaries[locale];
  return <div className="portfolio game-page hollow-page" lang={locale}><a href="#main" className="skip-link">{site.skip}</a><Header locale={locale} />
    <main className="shell game-page-main" id="main"><div className="game-breadcrumb"><Link href={localPath(locale, '/games')}><LuArrowLeft />{hubCopy[locale].back}</Link><span>EXPERIMENTS / 002</span></div>
      <div className="game-page-intro hollow-page-intro"><div><span className="eyebrow">{t.label}</span><h1>The Backrooms<span> / The Hollow</span></h1></div><p>{t.intro}</p></div>
      <BackroomsClient locale={locale} />
      <div className="game-platforms"><span><LuGlobe />{t.browser}</span><span><LuAudioLines />{t.desktop}</span><span><LuTimer />{t.length}</span></div>
      <section className="game-guide hollow-guide" id="hollow-controls" aria-labelledby="hollow-guide-title"><div className="game-guide-intro"><span className="eyebrow">{t.brief}</span><h2 id="hollow-guide-title">{t.objective}</h2><p>{t.mission}</p><span className="hollow-fiction-note">{t.warning}</span></div><div className="game-keyboard-guide" aria-label={t.controls}>{[[t.move, t.moveHint], [t.look, t.lookHint], [t.sprint, t.sprintHint], [t.interact, t.interactHint], [t.flashlight, t.flashHint], [t.pause, t.pauseHint]].map(([label, key]) => <div key={label}><strong>{label}</strong><kbd>{key}</kbd></div>)}</div></section>
      <div className="hollow-related"><span className="eyebrow">{t.related}</span><Link href={localPath(locale, '/games/last-exit')}>{t.lastExit}<LuArrowUpRight /></Link></div>
      <p className="game-credit">{t.credit}</p>
    </main><footer className="site-footer shell"><Link className="wordmark" href={localPath(locale)}>zm<span>.</span></Link><span>© {new Date().getFullYear()} Zakaria Missou</span><span>{site.footer}</span><a href="#main" className="back-top">{site.top} ↑</a></footer>
  </div>;
}
