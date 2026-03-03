import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Auto Publisher | Automate Your Discord Announcements Easily',
  applicationName: 'Auto Publisher',
  description:
    'Auto Publisher automatically publishes messages in your announcement channels, ensuring your community never misses important updates. Trusted by 17,000+ Discord servers.',
  keywords: ['Discord', 'bot', 'announcements', 'auto publish', 'Discord bot'],
  authors: [{ name: 'Vedinsoh' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} antialiased`}>
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
          <Navbar />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
