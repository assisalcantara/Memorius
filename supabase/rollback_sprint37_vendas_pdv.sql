-- =========================================================================
-- ROLLBACK SPRINT 37: VENDAS E PAGAMENTOS DO PDV
-- =========================================================================

BEGIN;

-- 1. Remoção de RPCs
DROP FUNCTION IF EXISTS public.cancelar_estornar_pdv_venda(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.finalizar_pdv_venda(UUID);
DROP FUNCTION IF EXISTS public.confirmar_pagamento_gateway_pdv(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.adicionar_pagamento_pdv(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.criar_pdv_venda(UUID, UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT);

-- 2. Remoção de Tabelas (ordem inversa de dependência)
DROP TABLE IF EXISTS public.pdv_pagamentos CASCADE;
DROP TABLE IF EXISTS public.pdv_venda_itens CASCADE;
DROP TABLE IF EXISTS public.pdv_vendas CASCADE;

COMMIT;
