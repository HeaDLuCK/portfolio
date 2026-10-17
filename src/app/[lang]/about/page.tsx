import LocalizedPage, { LocalePageProps, localeMetadata, localeParams } from '@/components/portfolio/LocalizedPage';
export const generateStaticParams = localeParams;
export const generateMetadata = ({ params }: LocalePageProps) => localeMetadata(params, 'about');
export default function Page(props: LocalePageProps) { return <LocalizedPage {...props} page="about" />; }
