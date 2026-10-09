import type { Metadata } from 'next';

import { AccountView } from '@/features/account/components/AccountView';
import { getAccountProfile } from '@/features/account/queries';
import { getCurrentRole, requireUser } from '@/lib/auth/dal';

export const metadata: Metadata = { title: 'Minha conta' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser();
  const [profile, role] = await Promise.all([getAccountProfile(user.id), getCurrentRole()]);
  return <AccountView email={user.email} profile={profile} isAdmin={role === 'admin'} />;
}
