import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Weather AI | Smart Forecasting',
  description:
    'Experience weather forecasting enhanced by AI - providing accurate, personalized weather predictions with cutting-edge artificial intelligence.',
  keywords: [
    'weather',
    'AI',
    'forecasting',
    'artificial intelligence',
    'predictions',
  ],
  authors: [{ name: 'Weather AI Team' }],
  creator: 'Weather AI',
  openGraph: {
    title: 'Weather AI | Smart Forecasting',
    description: 'AI-powered weather predictions for a smarter tomorrow',
    type: 'website',
    images: ['/og-image.png'], // Preview image for social sharing
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weather AI | Smart Forecasting',
    description: 'AI-powered weather predictions for a smarter tomorrow',
    images: ['/og-image.png'],
  },
  // Discord will use the OpenGraph metadata automatically
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
