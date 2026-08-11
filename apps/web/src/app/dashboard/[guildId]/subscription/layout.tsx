import { isPublicInstance } from '@ap/config';
import { notFound } from 'next/navigation';

/**
 * Billing tab, hosted service only — a self-hosted instance has no
 * subscriptions, and the backend's `/subscription` routes don't exist there
 * either.
 *
 * In the layout, not the page: `page.tsx` is a client component, so the 404 has
 * to happen in a server component above it.
 */
export default function SubscriptionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isPublicInstance) notFound();

  return children;
}
