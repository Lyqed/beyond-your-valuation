import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://what-you-actually-own.motbot146.chatgpt.site'),
  title: 'What You Actually Own',
  description: 'The number on paper is not the number in your pocket. An interactive exploration of startup exits, liquidity and risk. Every number explained.',
  openGraph: { title: 'You sold your company for $100 million. How much is yours?', description: 'Change the terms. Follow the money. Find the risk.', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630, alt: 'A fictional $100 million exit. How much is actually yours?' }] },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f8f2' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
