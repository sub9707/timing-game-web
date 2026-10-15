import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { SEO, SITE_NAME, type SeoText } from './src/seo';

/** 애드센스 ads.txt — .env 의 게시자 ID 로 빌드 때 만듦 (없으면 만들지 않음) */
function adsTxt(client: string | undefined): Plugin {
  return {
    name: 'ads-txt',
    generateBundle() {
      const pub = client?.replace(/^ca-/, '').trim();
      if (!pub) return;
      this.emitFile({ type: 'asset', fileName: 'ads.txt', source: `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` });
    },
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface SeoEnv {
  /** 배포 주소 (예: https://stopia.app/) — 있으면 canonical·hreflang·og:url·sitemap 을 절대 주소로 */
  site: string;
  google?: string;
  naver?: string;
  bing?: string;
  /** 애드센스 게시자 ID — 사이트 심사용 소유 확인 메타 태그 */
  adsense?: string;
}

/** 언어별 머리말 (prefix = 사이트 맨 위까지의 상대 경로) */
function head(t: SeoText, env: SeoEnv, prefix: string) {
  const abs = (p: string) => (env.site ? new URL(p, env.site).href : prefix + p);
  const url = abs(t.lang === 'en' ? 'en/' : '');
  const image = abs('og-image.jpg');
  const tags = [
    `<title>${esc(t.title)}</title>`,
    `<meta name="description" content="${esc(t.description)}" />`,
    `<meta name="keywords" content="${esc(t.keywords)}" />`,
    `<meta name="application-name" content="${SITE_NAME}" />`,
    `<meta name="author" content="sub9707" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    env.site && `<link rel="canonical" href="${url}" />`,
    env.site && `<link rel="alternate" hreflang="ko" href="${abs('')}" />`,
    env.site && `<link rel="alternate" hreflang="en" href="${abs('en/')}" />`,
    env.site && `<link rel="alternate" hreflang="x-default" href="${abs('en/')}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(t.ogTitle)}" />`,
    `<meta property="og:description" content="${esc(t.ogDescription)}" />`,
    env.site && `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(t.imageAlt)}" />`,
    `<meta property="og:locale" content="${t.locale}" />`,
    `<meta property="og:locale:alternate" content="${t.lang === 'ko' ? SEO.en.locale : SEO.ko.locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(t.ogTitle)}" />`,
    `<meta name="twitter:description" content="${esc(t.ogDescription)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    env.google && `<meta name="google-site-verification" content="${esc(env.google)}" />`,
    env.naver && `<meta name="naver-site-verification" content="${esc(env.naver)}" />`,
    env.bing && `<meta name="msvalidate.01" content="${esc(env.bing)}" />`,
    env.adsense && `<meta name="google-adsense-account" content="${esc(env.adsense)}" />`,
  ];
  // 구조화 데이터 — 검색 결과에 무료 웹 게임으로 보이도록
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    alternateName: ['스토피아', 'Stopia'],
    ...(env.site && { url }),
    description: t.description,
    inLanguage: t.lang,
    applicationCategory: 'GameApplication',
    genre: t.lang === 'ko' ? '시간 맞추기 게임' : 'Timing game',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    image,
    offers: { '@type': 'Offer', price: '0', priceCurrency: t.lang === 'ko' ? 'KRW' : 'USD' },
    author: { '@type': 'Person', name: 'sub9707', url: 'https://github.com/sub9707' },
    featureList: t.features,
  };
  tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  return tags.filter(Boolean).join('\n    ');
}

/** 자바스크립트 전에 보이는 본문 (앱이 뜨면 바뀜) */
function body(t: SeoText) {
  return `<main class="seo-fallback">
        <h1>${esc(t.heading)}</h1>
        <p>${esc(t.intro)}</p>
        <ul>${t.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </main>`;
}

/**
 * 검색 최적화
 *  · index.html(한국어) 머리말·본문을 채우고, 영어 페이지 en/index.html 을 따로 만듦 (언어별 주소 → 해외 검색)
 *  · robots.txt, sitemap.xml(언어별 대체 주소 포함)
 */
function seo(env: SeoEnv): Plugin {
  return {
    name: 'seo',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace('<!--seo:head-->', head(SEO.ko, env, './')).replace('<!--seo:body-->', body(SEO.ko));
    },
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') return;
      const ko = String(index.source);
      // 영어 페이지: 한 단계 아래 폴더라 상대 경로를 ../ 로
      const en = ko
        .replace('<html lang="ko">', '<html lang="en">')
        .replace(/<!--seo:head:start-->[\s\S]*?<!--seo:head:end-->/, `<!--seo:head:start-->\n    ${head(SEO.en, env, '../')}\n    <!--seo:head:end-->`)
        .replace(/<!--seo:body:start-->[\s\S]*?<!--seo:body:end-->/, `<!--seo:body:start-->${body(SEO.en)}<!--seo:body:end-->`)
        .replace(/(href|src)="\.\//g, '$1="../');
      this.emitFile({ type: 'asset', fileName: 'en/index.html', source: en });

      const robots = ['User-agent: *', 'Allow: /', ...(env.site ? ['', `Sitemap: ${new URL('sitemap.xml', env.site).href}`] : [])].join('\n');
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots + '\n' });

      if (env.site) {
        const day = new Date().toISOString().slice(0, 10);
        const koUrl = new URL('', env.site).href;
        const enUrl = new URL('en/', env.site).href;
        const alt = `
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}"/>`;
        const page = (loc: string, priority: string) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${day}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>${alt}
  </url>`;
        const doc = (p: string) => `  <url>\n    <loc>${new URL(p, env.site).href}</loc>\n    <lastmod>${day}</lastmod>\n    <priority>0.3</priority>\n  </url>`;
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${page(koUrl, '1.0')}
${page(enUrl, '0.9')}
${doc('privacy.html')}
${doc('terms.html')}
</urlset>
`;
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const site = env.VITE_SITE_URL?.trim();
  return {
    base: './',
    plugins: [
      react(),
      adsTxt(env.VITE_ADSENSE_CLIENT),
      seo({
        site: site ? (site.endsWith('/') ? site : site + '/') : '',
        google: env.VITE_GOOGLE_SITE_VERIFICATION,
        naver: env.VITE_NAVER_SITE_VERIFICATION,
        bing: env.VITE_BING_SITE_VERIFICATION,
        adsense: env.VITE_ADSENSE_CLIENT?.trim(),
      }),
    ],
  };
});
