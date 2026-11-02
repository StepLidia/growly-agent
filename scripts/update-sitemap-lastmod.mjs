import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://swiss-growly.com';
const SITEMAP_PATH = 'public/sitemap.xml';

const sharedFiles = [
  'index.html',
  'src/App.tsx',
  'src/components/Dashboard.tsx',
  'src/seo/SeoMetadata.tsx',
  'src/styles.css',
];

const routes = [
  {
    path: '/',
    changefreq: 'weekly',
    priority: '1.0',
    files: [
      'src/pages/OverviewPage.tsx',
      'public/images/background.png',
      'public/images/butterfly.png',
      'public/images/grandma.png',
    ],
  },
  {
    path: '/expenses',
    changefreq: 'weekly',
    priority: '0.9',
    files: [
      'src/pages/ExpensesPage.tsx',
      'src/components/MonthPicker.tsx',
    ],
  },
  {
    path: '/utilities',
    changefreq: 'weekly',
    priority: '0.8',
    files: [
      'src/pages/UtilitiesPage.tsx',
      'src/calculations/utilityCalculations.ts',
      'src/storage/utilityStorage.ts',
      'src/components/MonthPicker.tsx',
    ],
  },
  {
    path: '/details',
    changefreq: 'weekly',
    priority: '0.9',
    files: [
      'src/pages/DetailsPage.tsx',
      'src/components/AssetCard.tsx',
      'src/components/Header.tsx',
      'src/components/IncomeCard.tsx',
      'src/components/InsightsCard.tsx',
      'src/components/ProjectionCard.tsx',
      'src/components/SummaryCard.tsx',
    ],
  },
  {
    path: '/expenses/trends',
    changefreq: 'weekly',
    priority: '0.8',
    files: [
      'src/pages/ExpenseTrendAnalysisPage.tsx',
      'src/pages/ExpensesPage.tsx',
      'src/components/MonthPicker.tsx',
    ],
  },
  {
    path: '/mortgage',
    changefreq: 'weekly',
    priority: '0.9',
    files: [
      'src/pages/MortgagePage.tsx',
      'src/components/CostsVsRentingCard.tsx',
      'src/components/MortgageCostsCard.tsx',
      'src/components/MortgageRepaymentCard.tsx',
      'public/images/MortgageStructure.webp',
    ],
  },
  {
    path: '/progress',
    changefreq: 'weekly',
    priority: '0.8',
    files: [
      'src/pages/ProgressPage.tsx',
      'src/components/MonthPicker.tsx',
      'src/components/YearPicker.tsx',
    ],
  },
  {
    path: '/contact',
    changefreq: 'monthly',
    priority: '0.5',
    files: [
      'src/pages/ContactPage.tsx',
      'src/components/ContactCard.tsx',
    ],
  },
];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function runGit(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function hasUncommittedChanges(files) {
  try {
    return runGit(['status', '--porcelain', '--', ...files]).length > 0;
  } catch {
    return false;
  }
}

function getLatestCommitDate(files) {
  try {
    return runGit(['log', '-1', '--format=%cs', '--', ...files]);
  } catch {
    return '';
  }
}

function getLastmod(routeFiles) {
  const files = [...sharedFiles, ...routeFiles];

  if (hasUncommittedChanges(files)) {
    return getToday();
  }

  return getLatestCommitDate(files) || getToday();
}

function buildUrl(path) {
  return new URL(path, SITE_URL).toString();
}

function buildSitemap() {
  const entries = routes
    .map((route) => `  <url>
    <loc>${buildUrl(route.path)}</loc>
    <lastmod>${getLastmod(route.files)}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

const sitemapPath = resolve(repoRoot, SITEMAP_PATH);
mkdirSync(dirname(sitemapPath), { recursive: true });
writeFileSync(sitemapPath, buildSitemap());
console.log(`Updated ${SITEMAP_PATH}`);
