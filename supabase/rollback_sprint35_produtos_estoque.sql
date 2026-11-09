-- =========================================================================
-- Rollback Sprint 35: Catálogo de Produtos, Serviços e Controle de Estoque
-- Reversão segura e idempotente das estruturas criadas na Sprint 35
-- =========================================================================

BEGIN;

-- 1. Desvincular Triggers e Funções de Estoque
DROP TRIGGER IF EXISTS trg_proteger_estoque_atual_direto ON public.produtos_servicos;
DROP FUNCTION IF EXISTS public.proteger_estoque_atual_direto();

DROP TRIGGER IF EXISTS trg_processar_movimentacao_estoque ON public.estoque_movimentacoes;
DROP FUNCTION IF EXISTS public.processar_movimentacao_estoque();

DROP TRIGGER IF EXISTS trg_produtos_servicos_updated_at ON public.produtos_servicos;
DROP TRIGGER IF EXISTS trg_item_categorias_updated_at ON public.item_categorias;

-- 2. Remover Funções Auxiliares de RBAC da Sprint 35
DROP FUNCTION IF EXISTS public.can_move_estoque();
DROP FUNCTION IF EXISTS public.can_manage_catalogo();
DROP FUNCTION IF EXISTS public.current_user_role_name();

-- 3. Remover Políticas RLS
DROP POLICY IF EXISTS select_estoque_movimentacoes ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS insert_estoque_movimentacoes ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS update_estoque_movimentacoes ON public.estoque_movimentacoes;
DROP POLICY IF EXISTS delete_estoque_movimentacoes ON public.estoque_movimentacoes;

DROP POLICY IF EXISTS select_produtos_servicos ON public.produtos_servicos;
DROP POLICY IF EXISTS insert_produtos_servicos ON public.produtos_servicos;
DROP POLICY IF EXISTS update_produtos_servicos ON public.produtos_servicos;
DROP POLICY IF EXISTS delete_produtos_servicos ON public.produtos_servicos;

DROP POLICY IF EXISTS select_item_categorias ON public.item_categorias;
DROP POLICY IF EXISTS insert_item_categorias ON public.item_categorias;
DROP POLICY IF EXISTS update_item_categorias ON public.item_categorias;
DROP POLICY IF EXISTS delete_item_categorias ON public.item_categorias;

-- 4. Remover Tabelas em Ordem Reversa de Dependência
DROP TABLE IF EXISTS public.estoque_movimentacoes CASCADE;
DROP TABLE IF EXISTS public.produtos_servicos CASCADE;
DROP TABLE IF EXISTS public.item_categorias CASCADE;

COMMIT;
