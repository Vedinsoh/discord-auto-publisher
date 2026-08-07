import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Auto Publisher | Automate Your Discord Announcements Easily',
  applicationName: 'Auto Publisher',
  description:
    'Auto Publisher automatically publishes messages in your announcement channels, ensuring your community never misses important updates. Trusted by 17,000+ Discord servers.',
  keywords: ['Discord', 'bot', 'announcements', 'auto publish', 'Discord bot'],
  authors: [{ name: 'acehox' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className} antialiased`}
      >
        <div className="relative min-h-screen overflow-hidden bg-slate-950">
          {/* Radial blue glow */}
          <div
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              background:
                'radial-gradient(1100px 620px at 72% -6%, rgba(47,107,255,.20), transparent 60%), radial-gradient(900px 560px at 8% 8%, rgba(59,130,246,.12), transparent 55%)',
            }}
          />
          {/* Faint grid */}
          <div
            className="pointer-events-none fixed inset-0 z-0 opacity-50"
            style={{
              backgroundImage:
                'linear-gradient(rgba(120,150,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120,150,255,.05) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              maskImage: 'radial-gradient(900px 520px at 60% 0%, #000, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(900px 520px at 60% 0%, #000, transparent 75%)',
            }}
          />
          {/* Flex column so short pages still push the footer to the bottom of the
              viewport. Pages that need to fill the leftover space (centered
              states) take `flex-1` on their root; the rest sit at natural height.
              `*:w-full` because a flex item with `mx-auto` (every page section)
              has auto cross-axis margins, which cancel the default stretch and
              size it to its content — collapsing sections to their widest line. */}
          <div className="relative z-10 flex min-h-screen flex-col">
            <Navbar />
            <main className="flex flex-1 flex-col *:w-full">{children}</main>
            <Footer />
          </div>
          <ToastProvider />
        </div>
      </body>
    </html>
  );
}
