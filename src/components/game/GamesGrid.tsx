import Link from 'next/link';
import { LuArrowUpRight } from 'react-icons/lu';
import { localPath, type Locale } from '@/lib/locale';
import GameArtwork from './GameArtwork';
import BackroomsArtwork from '@/components/backrooms/BackroomsArtwork';
import { gameCopy } from './copy';
import { horrorCopy } from '@/components/backrooms/copy';
import { hubCopy } from './hub-copy';
import './game.css';
import '@/components/backrooms/backrooms.css';

export default function GamesGrid({ locale }: { locale: Locale }) {
  const t = gameCopy[locale];
  const h = horrorCopy[locale];
  const hub = hubCopy[locale];
  return <div className="games-grid">
    <Link href={localPath(locale, '/games/last-exit')} className="game-feature" aria-label={t.play}>
      <div className="game-feature-art"><GameArtwork /><div className="game-feature-title"><span>ZM / ARCADE 001</span><strong>LAST<br /><i>EXIT</i><span className="game-title-period">.</span></strong></div><span className="game-feature-play"><LuArrowUpRight aria-hidden="true" /></span><span className="game-feature-badge">{t.browser}</span></div>
      <div className="game-feature-caption"><div><span className="eyebrow">{t.type}</span><h3>Last Exit</h3><p>{t.subtitle}</p><small className="game-feature-mode">{hub.drivingMode}</small></div><span className="game-feature-link">{t.play}<LuArrowUpRight /></span></div>
    </Link>
    <Link href={localPath(locale, '/games/backrooms')} className="game-feature hollow-feature" aria-label={h.play}>
      <div className="game-feature-art"><BackroomsArtwork /><div className="hollow-feature-title"><span>ZM / ARCHIVE 002</span><strong>THE<br />BACKROOMS</strong><b>/ THE HOLLOW</b></div><span className="game-feature-play"><LuArrowUpRight aria-hidden="true" /></span><span className="game-feature-badge">{h.browser}</span></div>
      <div className="game-feature-caption"><div><span className="eyebrow">{h.type}</span><h3>The Backrooms / The Hollow</h3><p>{h.subtitle}</p><small className="game-feature-mode">{hub.horrorMode}</small></div><span className="game-feature-link">{h.play}<LuArrowUpRight /></span></div>
    </Link>
  </div>;
}
