import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { LangSetter } from '@/components/ui/LangSetter';
import '@/styles/globals.css';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { lang: string };
}

export function generateStaticParams() {
  return [{ lang: 'zh' }, { lang: 'en' }];
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  setRequestLocale(params.lang);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={params.lang}>
      <LangSetter lang={params.lang} />
      {children}
    </NextIntlClientProvider>
  );
}
