import type { Metadata } from 'next';
import { AuthRedirect } from '@/components/auth/auth-redirect';
import { auth } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Dashboard | Auto Publisher',
  description: 'Manage your Discord servers, channels, and subscriptions.',
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    return <AuthRedirect callbackUrl="/dashboard" />;
  }

  return children;
}
