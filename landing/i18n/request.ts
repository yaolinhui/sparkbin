import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const messages = (await import(`./messages/${locale}.json`)).default;
  return {
    locale,
    messages,
  };
});
