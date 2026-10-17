import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { dictionaries, isLocale, locales, localPath } from '@/lib/locale';
import Portfolio from './Portfolio';
import Thanks from './Thanks';

export type LocalePageProps = { params: Promise<{ lang: string }> };
export type PageName = 'home' | 'about' | 'projects' | 'contact' | 'thanks';
export const localeParams = () => locales.map(lang => ({ lang }));

async function getLocale(params: LocalePageProps['params']) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}

export async function localeMetadata(params: LocalePageProps['params'], page: PageName): Promise<Metadata> {
  const locale = await getLocale(params);
  const index = ['home', 'about', 'projects', 'contact', 'thanks'].indexOf(page);
  const path = page === 'home' ? '/' : `/${page}`;
  return {
    title: `${dictionaries[locale].pageTitles[index]} | Zakaria Missou`,
    description: dictionaries[locale].heroDescription,
    alternates: { languages: Object.fromEntries(locales.map(lang => [lang, localPath(lang, path)])) },
  };
}

export default async function LocalizedPage({ params, page = 'home' }: LocalePageProps & { page?: PageName }) {
  const locale = await getLocale(params);
  return page === 'thanks' ? <Thanks locale={locale} /> : <Portfolio page={page} locale={locale} />;
}
