import type { Metadata } from 'next';
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
    openGraph: {
      title: 'SparkBin',
      description: isZh
        ? 'AI-native project coach for indie hackers. 先验证，再开发。'
        : 'AI-native project coach for indie hackers. Validate before you build.',
      type: 'website',
      locale: isZh ? 'zh_CN' : 'en_US',
      url: `https://sparkbin.dev/${params.lang}`,
      siteName: 'SparkBin',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'SparkBin',
      description: 'Validate before you build.',
      creator: '@sparkbin',
    },
    alternates: {
      canonical: `https://sparkbin.dev/${params.lang}`,
      languages: {
        'zh-CN': 'https://sparkbin.dev/zh',
        'en-US': 'https://sparkbin.dev/en',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <HeroSection />
        <StagesSection />
        <FeaturesSection />
        <DeploymentSection />
        <PricingSection />
        <CTABanner />
      </main>
      <FooterSection />
    </>
  );
}
