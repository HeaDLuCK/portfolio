import Link from 'next/link';
import { LuArrowLeft, LuAudioLines, LuGamepad2, LuGlobe, LuTimer } from 'react-icons/lu';
import Header from '@/components/portfolio/Header';
import { dictionaries, localPath, type Locale } from '@/lib/locale';
import GameClient from './GameClient';
import { gameCopy } from './copy';
import { horrorCopy } from '@/components/backrooms/copy';
import { hubCopy } from './hub-copy';
import './game.css';

export default function GamePage({ locale = 'en' }: { locale?: Locale }) {
  const t = gameCopy[locale];
  const site = dictionaries[locale];
  return <div className="portfolio game-page" lang={locale}><a href="#main" className="skip-link">{site.skip}</a><Header locale={locale} />
    <main id="main" className="shell game-page-main"><div className="game-breadcrumb"><Link href={localPath(locale, '/games')}><LuArrowLeft />{hubCopy[locale].back}</Link><span>EXPERIMENTS / 001</span></div>
      <div className="game-page-intro"><div><span className="eyebrow">{t.label}</span><h1>Last Exit<span> / 001</span></h1></div><p>{t.description}</p></div>
      <GameClient locale={locale} />
      <div className="game-platforms"><span><LuGlobe />{t.browser}</span><span><LuGamepad2 />{t.keyboard}</span><span><LuTimer />{t.duration}</span><span className="game-free">{t.free}</span></div>
      <section className="game-guide" id="game-controls" aria-labelledby="game-guide-title"><div className="game-guide-intro"><span className="eyebrow">THE BRIEF</span><h2 id="game-guide-title">{t.mission}</h2><p>{t.missionCopy}</p><span className="game-sound-tip"><LuAudioLines />{t.launchHint}</span></div><div className="game-keyboard-guide">{[[t.drive, t.driveHint, 'W A S D'], [t.drift, t.driftHint, 'SPACE'], [t.boost, t.boostHint, 'SHIFT'], [t.pause, t.pauseHint, 'ESC']].map(([label, hint, key]) => <div key={label}><div><strong>{label}</strong><span>{hint}</span></div><kbd>{key}</kbd></div>)}</div></section>
      <section className="game-tips" aria-label={locale === 'fr' ? 'Conseils de conduite' : locale === 'de' ? 'Fahrtipps' : 'Driving tips'}>{[[t.tip1, t.tip1Copy], [t.tip2, t.tip2Copy], [t.tip3, t.tip3Copy]].map(([title, copy], index) => <article key={title}><span>0{index + 1} /</span><h3>{title}</h3><p>{copy}</p></article>)}</section>
      <p className="game-credit">{t.note}</p>
      <p className="game-credit"><Link href={localPath(locale, '/games/backrooms')}>{horrorCopy[locale].other} ↗</Link></p>
    </main><footer className="site-footer shell"><Link className="wordmark" href={localPath(locale)}>zm<span>.</span></Link><span>© {new Date().getFullYear()} Zakaria Missou</span><span>{site.footer}</span><a href="#main" className="back-top">{site.top} ↑</a></footer>
  </div>;
}
