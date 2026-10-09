import { Button, EmptyState } from '@/components/ui';

/** 404 dentro do shell do aluno (checkout/pedido inexistente ou de outra pessoa). */
export default function AppNotFound() {
  return (
    <EmptyState
      title="Página não encontrada"
      description="O endereço não existe ou você não tem acesso a ele."
      action={
        <>
          <Button href="/inicio">Ir para o início</Button>
          <Button href="/cursos" variant="secondary">
            Ver cursos
          </Button>
        </>
      }
    />
  );
}
