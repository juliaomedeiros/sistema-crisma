-- SQL Script para preparar a tabela e ativar o Reenvio Automático em 2 Horas
-- Execute este script no SQL Editor do Supabase Dashboard (https://supabase.com/dashboard)

-- 1. Garantir que as colunas necessárias existam na tabela fila_mensagens_whatsapp
ALTER TABLE public.fila_mensagens_whatsapp 
ADD COLUMN IF NOT EXISTS agendado_para TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tentativas INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS codigo_erro INT4 DEFAULT NULL;

-- 2. Criar um índice para otimizar a busca das mensagens reagendadas pelo pg_cron
CREATE INDEX IF NOT EXISTS idx_fila_reagendado ON public.fila_mensagens_whatsapp (status, agendado_para)
WHERE status = 'reagendado_463';

-- 3. Habilitar pg_cron e pg_net com schemas corretos do Supabase
-- Observação: Se o erro de schema 'cron' persistir, ative o toggle 'pg_cron' em Database -> Extensions no Supabase Dashboard
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Conceder permissões caso o schema tenha sido criado em pg_catalog
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Desagendar job antigo se existir para evitar duplicados
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'cron' AND tablename = 'job') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'processar-fila-whatsapp-reagendada';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Criar agendamento limpo (A cada 30 minutos)
SELECT cron.schedule(
  'processar-fila-whatsapp-reagendada',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://yqqpugheqqknpbetysme.supabase.co/functions/v1/processar-fila-reagendada',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_SUPABASE_ANON_KEY_AQUI'
    ),
    body := '{}'::jsonb
  );
  $$
);


