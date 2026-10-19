import type { Metadata } from 'next';
import GamePage from '@/components/game/GamePage';
import { gameCopy } from '@/components/game/copy';
import { locales, localPath } from '@/lib/locale';

export const metadata: Metadata = {
  title: gameCopy.en.gameTitle,
  description: gameCopy.en.gameDescription,
  alternates: { languages: Object.fromEntries(locales.map(locale => [locale, localPath(locale, '/games/last-exit')])) },
};

export default function Page() { return <GamePage />; }
