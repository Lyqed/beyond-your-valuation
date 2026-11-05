import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://what-you-actually-own.motbot146.chatgpt.site'),
  title: 'What You Actually Own',
  description: 'Explore fictional startup exits, liquidity and insurance scenarios. Change the assumptions and inspect the calculations.',
  openGraph: { title: 'What You Actually Own', description: 'Explore how deal terms, liquidity and insurance affect available cash.', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'A fictional $100 million exit. How much is actually yours?' }] },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
