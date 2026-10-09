import { Button, TextLink } from '@/components/ui';
import { signOut } from '@/features/auth/actions';

import type { AccountProfile } from '../queries';
import styles from './Account.module.css';
import { PasswordForm } from './PasswordForm';
import { ProfileForm } from './ProfileForm';

/** Página "Minha conta": perfil, senha, atalhos e sair. `demo` troca as actions por sucesso falso (vitrine). */
export function AccountView({
  email,
  profile,
  isAdmin,
  demo,
}: {
  email: string;
  profile: AccountProfile;
  isAdmin: boolean;
  demo?: boolean;
}) {
  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Minha conta</h1>
        <p className={styles.muted}>Seus dados, sua senha e atalhos.</p>
      </header>

      <section className={styles.section} aria-labelledby="conta-perfil">
        <h2 id="conta-perfil" className={styles.sectionTitle}>
          Perfil
        </h2>
        <ProfileForm
          email={email}
          defaultName={profile.fullName}
          defaultPhone={profile.phone}
          defaultTaxId={profile.taxId}
          demo={demo}
        />
      </section>

      <section className={styles.section} aria-labelledby="conta-senha">
        <h2 id="conta-senha" className={styles.sectionTitle}>
          Senha
        </h2>
        <PasswordForm demo={demo} />
      </section>

      <section className={styles.section} aria-labelledby="conta-atalhos">
        <h2 id="conta-atalhos" className={styles.sectionTitle}>
          Atalhos
        </h2>
        <ul className={styles.shortcuts}>
          <li>
            <TextLink href="/conta/pedidos">Meus pedidos</TextLink>
          </li>
          {isAdmin ? (
            <li>
              <TextLink href="/admin">Painel admin</TextLink>
            </li>
          ) : null}
        </ul>
      </section>

      <form action={demo ? undefined : signOut}>
        <Button type="submit" variant="ghost">
          Sair da conta
        </Button>
      </form>
    </div>
  );
}
