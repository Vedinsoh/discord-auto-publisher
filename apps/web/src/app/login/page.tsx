import { redirect } from 'next/navigation';
import { AuthRedirect } from '@/components/auth/auth-redirect';
import { auth } from '@/lib/auth';

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect('/dashboard');
  }

  return <AuthRedirect callbackUrl="/dashboard" />;
}
