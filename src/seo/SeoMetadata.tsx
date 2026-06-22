import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const APP_NAME = 'Growly';
const DEFAULT_SITE_URL = 'https://swiss-growly.com';
const ORGANIZATION_URL = 'https://steplidia.pages.dev';
const ORGANIZATION_ID = `${ORGANIZATION_URL}/#organization`;
const PRIVATE_OVERVIEW_PATH = '/overview-private-lidia';
const SEO_IMAGE_PATH = '/images/logo.webp';
const SEO_IMAGE_ALT = 'Growly app logo for a Swiss wealth, mortgage and retirement planning dashboard.';

type RouteSeoMetadata = {
  canonicalPath?: string;
  description: string;
  indexable?: boolean;
  path: string;
  title: string;
};

const routeSeoMetadata: RouteSeoMetadata[] = [
  {
    path: '/',
    title: 'Growly - Swiss Wealth, Mortgage & Retirement Planning',
    description:
      'Plan Swiss wealth, pension savings, expenses, mortgage costs, and long-term progress in a private financial dashboard that stores data locally.',
  },
  {
    path: '/details',
    title: 'Details of assets, income, and expenses - Growly',
    description:
      'Calculate projected wealth, retirement savings and get insights on how your assets compound in the future.',
  },
  {
    path: '/expenses',
    title: 'Expense Tracker and Month-over-Month Spending Analysis - Growly',
    description:
      'Track monthly expenses, compare spending trends, analyze top categories, and review month-over-month changes in a private finance dashboard.',
  },
  {
    path: '/expenses/trends',
    title: 'Expense Trend Analysis - Growly',
    description:
      'Analyze expense trends over time with monthly spending charts, category share history, and month-over-month comparisons.',
  },
  {
    path: '/mortgage',
    title: 'Swiss Mortgage Cost and Rent Comparison Calculator - Growly',
    description:
      'Compare Swiss mortgage costs, repayment scenarios, ownership expenses, and renting alternatives with an interactive mortgage calculator.',
  },
  {
    path: '/car',
    title: 'Car Financing - Growly',
    description: 'Compare leasing vs credit for car financing, calculate monthly payments and net gain after several years.',
  },
  {
    path: '/progress',
    title: 'Wealth Progress Tracker - Growly',
    description:
      'Track actual wealth progress against your plan with monthly records, baseline snapshots, and long-term projection comparisons.',
  },
  {
    path: '/contact',
    title: 'Contact Lidatron Labs - Growly',
    description: 'Contact Lidatron Labs about Growly, a private financial planning dashboard.',
  },
];

export function SeoMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = getRouteSeoMetadata(pathname);
    const canonicalUrl = buildAbsoluteUrl(metadata.canonicalPath ?? metadata.path);
    const imageUrl = buildAbsoluteUrl(SEO_IMAGE_PATH);

    document.title = metadata.title;
    upsertMeta('name', 'description', metadata.description);
    upsertMeta('name', 'robots', metadata.indexable === false ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    upsertMeta('property', 'og:site_name', APP_NAME);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', metadata.title);
    upsertMeta('property', 'og:description', metadata.description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:alt', SEO_IMAGE_ALT);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', metadata.title);
    upsertMeta('name', 'twitter:description', metadata.description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertMeta('name', 'twitter:image:alt', SEO_IMAGE_ALT);
    upsertCanonical(canonicalUrl);

    if (metadata.indexable === false) {
      removeStructuredData();
    } else {
      upsertStructuredData(metadata, canonicalUrl, imageUrl);
    }
  }, [pathname]);

  return null;
}

function getRouteSeoMetadata(pathname: string) {
  if (pathname === PRIVATE_OVERVIEW_PATH) {
    return {
      ...routeSeoMetadata[0],
      canonicalPath: '/',
      indexable: false,
      path: pathname,
      title: 'Private Overview - Growly',
    };
  }

  return routeSeoMetadata.find((metadata) => metadata.path === pathname) ?? routeSeoMetadata[0];
}

function buildAbsoluteUrl(path: string) {
  return new URL(path, DEFAULT_SITE_URL).toString();
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  const meta = document.querySelector<HTMLMetaElement>(selector) ?? document.createElement('meta');

  meta.setAttribute(attribute, key);
  meta.content = content;

  if (!meta.parentElement) {
    document.head.append(meta);
  }
}

function upsertCanonical(href: string) {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.createElement('link');

  canonical.rel = 'canonical';
  canonical.href = href;

  if (!canonical.parentElement) {
    document.head.append(canonical);
  }
}

function upsertStructuredData(metadata: RouteSeoMetadata, canonicalUrl: string, imageUrl: string) {
  const scriptId = 'growly-structured-data';
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: 'Lidatron Labs',
        url: ORGANIZATION_URL,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${buildAbsoluteUrl('/')}#software`,
        name: APP_NAME,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        url: buildAbsoluteUrl('/'),
        image: imageUrl,
        description: routeSeoMetadata[0].description,
        featureList: [
          'Swiss wealth planning',
          'Retirement savings projections',
          'Expense tracking and trend analysis',
          'Mortgage cost comparison',
          'Wealth progress tracking',
          'Local browser storage',
        ],
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'CHF',
        },
        publisher: {
          '@id': ORGANIZATION_ID,
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: metadata.title,
        description: metadata.description,
        image: imageUrl,
        isPartOf: {
          '@id': `${buildAbsoluteUrl('/')}#software`,
        },
      },
    ],
  };
  const script = (document.getElementById(scriptId) as HTMLScriptElement | null) ?? document.createElement('script');

  script.id = scriptId;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);

  if (!script.parentElement) {
    document.head.append(script);
  }
}

function removeStructuredData() {
  document.getElementById('growly-structured-data')?.remove();
}
