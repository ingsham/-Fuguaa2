import type { Metadata } from 'next';
import { Figtree, Newsreader } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE_URL } from '@/lib/utils';
import { jsonLd } from '@/lib/html';

const sans = Figtree({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Fuguaa | Handwoven Smocks from Ghana', template: '%s | Fuguaa' },
  description: 'Buy authentic handwoven Ghanaian smocks (fugu) online. Wedding, funeral, festival and children smocks from verified weavers. Pay with Mobile Money or card.',
  keywords: ['Fuguaa', 'smocks', 'smock', 'Ghana smock', 'fugu', 'batakari', 'northern Ghana smock', 'wedding smock', 'buy smocks online', 'handwoven smock'],
  applicationName: 'Fuguaa',
  openGraph: { type: 'website', siteName: 'Fuguaa', title: 'Fuguaa | Handwoven Smocks from Ghana', description: 'Three generations of craft. Shop verified weavers.', images: ['/og.png'], url: SITE_URL },
  twitter: { card: 'summary_large_image', title: 'Fuguaa | Handwoven Smocks from Ghana', images: ['/og.png'] },
  robots: { index: true, follow: true },
  // verification: { google: 'PASTE_GOOGLE_SEARCH_CONSOLE_TOKEN' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const org = {
    '@context': 'https://schema.org', '@type': 'Organization', name: 'Fuguaa', url: SITE_URL,
    logo: `${SITE_URL}/logo-mark.png`, slogan: 'Three generations of craft',
  };
  const site = {
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'Fuguaa', url: SITE_URL,
    potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/shop?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
  };
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd([org, site]) }} />
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
