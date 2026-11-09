-- =========================================================================
-- MIGRATION INCREMENTAL: trial_signups — Suporte a Estado PROVISIONING
-- PROJETO: MEMORIUS
-- =========================================================================
-- Esta migration atualiza a constraint de status da tabela trial_signups já
-- existente no Supabase para suportar o estado intermediário 'PROVISIONING',
-- garantindo atomicidade real e proteção estrita contra concorrência.
-- NÃO recria a tabela, NÃO dropa dados e NÃO altera tenants existentes.
-- =========================================================================

DO $$
BEGIN
    -- 1. Remover a restrição check antiga
    ALTER TABLE public.trial_signups 
        DROP CONSTRAINT IF EXISTS trial_signups_status_check;

    -- 2. Adicionar a nova restrição check contendo 'PROVISIONING'
    ALTER TABLE public.trial_signups 
        ADD CONSTRAINT trial_signups_status_check 
        CHECK (status IN ('PENDING', 'PROVISIONING', 'ACTIVATED', 'EXPIRED'));

    -- 3. Adicionar coluna opcional provisioning_started_at para monitoramento e timeout seguro de concorrência
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'trial_signups' 
          AND column_name = 'provisioning_started_at'
    ) THEN
        ALTER TABLE public.trial_signups 
            ADD COLUMN provisioning_started_at TIMESTAMPTZ;
    END IF;
END $$;
