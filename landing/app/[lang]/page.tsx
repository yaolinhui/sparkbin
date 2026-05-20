import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/components/ui/NavBar';
import { HeroSection } from '@/components/sections/HeroSection';
import { StagesSection } from '@/components/sections/StagesSection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { DeploymentSection } from '@/components/sections/DeploymentSection';
import { PricingSection } from '@/components/sections/PricingSection';
import { CTABanner } from '@/components/sections/CTABanner';
import { FooterSection } from '@/components/sections/FooterSection';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const isZh = params.lang === 'zh';
  return {
    title: isZh
      ? 'SparkBin - 独立开发者的 AI 项目教练'
      : 'SparkBin - AI Project Coach for Indie Hackers',
    description: isZh
      ? '从想法到变现的六阶段工作流工具。用 AI 辅助每一步决策，先验证再开发。开源、免费自托管。'
      : 'Validate before you build. Structured 6-stage workflow from idea to monetization. Open source, free self-hosting.',
    keywords: isZh
      ? ['独立开发者', '项目管理', 'AI 教练', 'Side Project', '开源', 'Indie Hacker']
      : ['indie hacker', 'project management', 'AI coach', 'side project', 'open source'],
    authors: [{ name: 'SparkBin' }],
    icons: {
      icon: '/favicon.svg',
      apple: '/apple-touch-icon.png',
    },
    openGraph: {
      title: 'SparkBin',
      description: isZh
        ? 'AI-native project coach for indie hackers. 先验证，再开发。'
        : 'AI-native project coach for indie hackers. Validate before you build.',
      type: 'website',
      locale: isZh ? 'zh_CN' : 'en_US',
      url: `https://sparkbin.wanchun.me/${params.lang}`,
      siteName: 'SparkBin',
      images: [`https://sparkbin.wanchun.me/images/social/og-${params.lang}.png`],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'SparkBin',
      description: 'Validate before you build.',
      creator: '@sparkbin',
      images: [`https://sparkbin.wanchun.me/images/social/og-${params.lang}.png`],
    },
    alternates: {
      canonical: `https://sparkbin.wanchun.me/${params.lang}`,
      languages: {
        'zh-CN': 'https://sparkbin.wanchun.me/zh',
        'en-US': 'https://sparkbin.wanchun.me/en',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function HomePage({ params }: { params: { lang: string } }) {
  setRequestLocale(params.lang);

  const [heroT, stagesT, featuresT, deploymentT, pricingT, ctaT, footerT] = await Promise.all([
    getTranslations('hero'),
    getTranslations('stages'),
    getTranslations('features'),
    getTranslations('deployment'),
    getTranslations('pricing'),
    getTranslations('cta'),
    getTranslations('footer'),
  ]);

  return (
    <>
      <NavBar />
      <main>
        <HeroSection
          badge={heroT('badge')}
          title1={heroT('title1')}
          title2={heroT('title2')}
          subtitle={heroT('subtitle')}
          ctaPrimary={heroT('ctaPrimary')}
          ctaSecondary={heroT('ctaSecondary')}
          trust={{
            opensource: heroT('trust.opensource'),
            selfhost: heroT('trust.selfhost'),
            aiproxy: heroT('trust.aiproxy'),
          }}
        />
        <StagesSection
          label={stagesT('label')}
          title={stagesT('title')}
          subtitle={stagesT('subtitle')}
          items={stagesT.raw('items') as Array<{ num: string; label: string; labelZh: string; desc: string }>}
        />
        <FeaturesSection
          label={featuresT('label')}
          title={featuresT('title')}
          subtitle={featuresT('subtitle')}
          items={featuresT.raw('items') as Array<{ title: string; desc: string }>}
          screenshotLabel={featuresT('screenshotLabel')}
        />
        <DeploymentSection
          label={deploymentT('label')}
          title={deploymentT('title')}
          subtitle={deploymentT('subtitle')}
          selfHosted={deploymentT.raw('selfHosted') as { title: string; badge: string; desc: string; features: string[] }}
          cloud={deploymentT.raw('cloud') as { title: string; badge: string; desc: string; features: string[] }}
        />
        <PricingSection
          label={pricingT('label')}
          title={pricingT('title')}
          subtitle={pricingT('subtitle')}
          tiers={pricingT.raw('tiers') as Array<{ name: string; price: string; period: string; desc: string; features: string[] }>}
          ctaPayg={pricingT('ctaPayg')}
          ctaFree={pricingT('ctaFree')}
        />
        <CTABanner
          title={ctaT('title')}
          subtitle={ctaT('subtitle')}
          primary={ctaT('primary')}
          secondary={ctaT('secondary')}
        />
      </main>
      <FooterSection
        brand={footerT('brand')}
        product={footerT('product')}
        features={footerT('features')}
        pricing={footerT('pricing')}
        enter={footerT('enter')}
        resources={footerT('resources')}
        docs={footerT('docs')}
        selfhosting={footerT('selfhosting')}
        contributing={footerT('contributing')}
        opensource={footerT('opensource')}
        github={footerT('github')}
        license={footerT('license')}
        security={footerT('security')}
        copyright={footerT('copyright')}
        builtWith={footerT('builtWith')}
      />
    </>
  );
}
