import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GamePage from '@/components/game/GamePage';
import { gameCopy } from '@/components/game/copy';
import { isLocale, locales, localPath } from '@/lib/locale';

type Props = { params: Promise<{ lang: string }> };
export const generateStaticParams = () => locales.map(lang => ({ lang }));
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return { title: gameCopy[lang].gameTitle, description: gameCopy[lang].gameDescription, alternates: { languages: Object.fromEntries(locales.map(locale => [locale, localPath(locale, '/games/last-exit')])) } };
}
export default async function Page({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <GamePage locale={lang} />;
}
