import { Button, EmptyState } from '@/components/ui';

/** 404 dentro do shell admin (id inválido de aluno, pedido, curso ou aula). */
export default function AdminNotFound() {
  return (
    <EmptyState
      title="Registro não encontrado"
      description="O item não existe ou foi removido. Volte para o painel e escolha outro."
      action={<Button href="/admin">Ir para o painel</Button>}
    />
  );
}
