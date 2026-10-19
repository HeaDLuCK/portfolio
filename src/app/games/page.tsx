import type { Metadata } from 'next';
import GamesHub from '@/components/game/GamesHub';
import { hubCopy } from '@/components/game/hub-copy';
import { locales, localPath } from '@/lib/locale';

export const metadata: Metadata = {
  title: hubCopy.en.pageTitle,
  description: hubCopy.en.description,
  alternates: { languages: Object.fromEntries(locales.map(locale => [locale, localPath(locale, '/games')])) },
};

export default function Page() { return <GamesHub />; }
