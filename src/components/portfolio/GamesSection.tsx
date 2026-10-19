import { LuGamepad2 } from 'react-icons/lu';
import type { Locale } from '@/lib/locale';
import { gameCopy } from '@/components/game/copy';
import GamesGrid from '@/components/game/GamesGrid';
import { horrorCopy } from '@/components/backrooms/copy';

export default function GamesSection({ locale = 'en' }: { locale?: Locale }) {
  const t = gameCopy[locale];
  const h = horrorCopy[locale];
  return <section id="games" className="section shell games-section">
    <div className="section-heading"><div><span className="eyebrow">{t.label}</span><h2>{t.heading}<br /><em>{t.headingAccent}</em></h2></div><LuGamepad2 className="games-section-icon" aria-hidden="true" /></div>
    <p className="games-section-intro">{h.gamesIntro}</p>
    <GamesGrid locale={locale} />
  </section>;
}
