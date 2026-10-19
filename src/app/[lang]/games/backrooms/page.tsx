import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BackroomsPage from '@/components/backrooms/BackroomsPage';
import { horrorCopy } from '@/components/backrooms/copy';
import { isLocale, locales, localPath } from '@/lib/locale';

type Props = { params: Promise<{ lang: string }> };
export const generateStaticParams = () => locales.map(lang => ({ lang }));
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return { title: 'The Backrooms / The Hollow — Zakaria Missou', description: horrorCopy[lang].description, alternates: { languages: Object.fromEntries(locales.map(locale => [locale, localPath(locale, '/games/backrooms')])) } };
}
export default async function Page({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <BackroomsPage locale={lang} />;
}
