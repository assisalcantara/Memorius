-- Migration to add ASAAS gateway fields to clientes table
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS gateway_customer_id TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS gateway_provider TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS gateway_sync_at TIMESTAMPTZ;
