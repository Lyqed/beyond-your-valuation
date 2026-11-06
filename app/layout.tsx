import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://beyondyourvaluation.com'),
  title: 'Beyond Your Valuation',
  description: 'Explore fictional startup exits, liquidity and insurance scenarios. Change the assumptions and inspect the calculations.',
  alternates: { canonical: '/' },
  openGraph: { title: 'Beyond Your Valuation', siteName: 'Beyond Your Valuation', url: '/', description: 'Explore how deal terms, liquidity and insurance affect available cash.', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Beyond Your Valuation: a fictional $100 million exit. How much is actually yours?' }] },
  twitter: { card: 'summary_large_image', title: 'Beyond Your Valuation', description: 'Explore how deal terms, liquidity and insurance affect available cash.', images: [{ url: '/og.png', alt: 'Beyond Your Valuation: a fictional $100 million exit. How much is actually yours?' }] },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f8f2' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
