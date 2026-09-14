import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0f19',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://reson-ai-lake.vercel.app'),

  title: {
    default: 'Reson | AI Incident Commander',
    template: '%s | Reson',
  },

  description:
    'Reson is an AI Incident Commander that joins real-time incident conversations, maintains structured operational state, and helps teams investigate and resolve production incidents.',

  applicationName: 'Reson',

  keywords: [
    'Reson',
    'AI Incident Commander',
    'incident management',
    'incident response',
    'SRE',
    'AIOps',
    'DevOps',
    'voice AI',
    'real-time AI',
    'MCP',
  ],

  authors: [{ name: 'Reson' }],
  creator: 'Reson',
  publisher: 'Reson',

  icons: {
    icon: [
      { url: '/favicon.ico' },
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },

  openGraph: {
    type: 'website',
    url: 'https://reson-ai-lake.vercel.app',
    siteName: 'Reson',
    title: 'Reson | AI Incident Commander',
    description:
      'An AI Incident Commander that joins the room, reasons over the incident, and keeps the team synchronized.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Reson | AI Incident Commander',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Reson | AI Incident Commander',
    description:
      'An AI Incident Commander for real-time incident response.',
    images: ['/og-image.png'],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full min-h-screen">{children}</body>
    </html>
  );
}