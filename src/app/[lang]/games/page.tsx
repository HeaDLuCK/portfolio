import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GamesHub from '@/components/game/GamesHub';
import { hubCopy } from '@/components/game/hub-copy';
import { isLocale, locales, localPath } from '@/lib/locale';

type Props = { params: Promise<{ lang: string }> };
export const generateStaticParams = () => locales.map(lang => ({ lang }));
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return { title: hubCopy[lang].pageTitle, description: hubCopy[lang].description, alternates: { languages: Object.fromEntries(locales.map(locale => [locale, localPath(locale, '/games')])) } };
}
export default async function Page({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <GamesHub locale={lang} />;
}
