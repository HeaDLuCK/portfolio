import type { Metadata } from 'next';
import BackroomsPage from '@/components/backrooms/BackroomsPage';
import { horrorCopy } from '@/components/backrooms/copy';
import { locales, localPath } from '@/lib/locale';

export const metadata: Metadata = {
  title: 'The Backrooms / The Hollow — Zakaria Missou',
  description: horrorCopy.en.description,
  alternates: { languages: Object.fromEntries(locales.map(locale => [locale, localPath(locale, '/games/backrooms')])) },
};

export default function Page() { return <BackroomsPage />; }
