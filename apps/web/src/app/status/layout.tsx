import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Status | Auto Publisher',
  description: 'Real-time monitoring of Auto Publisher bot performance and service health.',
};

export default function StatusLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
