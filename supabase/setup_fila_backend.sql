-- =========================================================================
-- SCRIPT DE ATIVAÇÃO: FILA BACKEND AUTÔNOMA COM ANTI-BAN SUPABASE + PG_CRON
-- Execute este script no SQL Editor do Supabase Dashboard (https://supabase.com/dashboard)
-- =========================================================================

-- 1. Garantir que a tabela fila_mensagens_whatsapp possua todas as colunas necessárias
CREATE TABLE IF NOT EXISTS public.fila_mensagens_whatsapp (
    id BIGSERIAL PRIMARY KEY,
    lote_id UUID DEFAULT NULL,
    crismando_id INT4 DEFAULT NULL,
    nome_destinatario TEXT DEFAULT NULL,
    telefone TEXT NOT NULL,
    tipo TEXT DEFAULT 'aviso_lote',
    tipo_envio TEXT DEFAULT 'aviso_lote',
    mensagem TEXT DEFAULT NULL,
    mensagem_texto TEXT DEFAULT NULL,
    status TEXT DEFAULT 'pendente',
    prioridade INT4 DEFAULT 5,
    tentativas INT4 DEFAULT 0,
    agendado_para TIMESTAMPTZ DEFAULT NULL,
    enviado_em TIMESTAMPTZ DEFAULT NULL,
    erro_log TEXT DEFAULT NULL,
    codigo_erro INT4 DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas caso a tabela já existisse com estrutura anterior
ALTER TABLE public.fila_mensagens_whatsapp 
ADD COLUMN IF NOT EXISTS lote_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS crismando_id INT4 DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nome_destinatario TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'aviso_lote',
ADD COLUMN IF NOT EXISTS tipo_envio TEXT DEFAULT 'aviso_lote',
ADD COLUMN IF NOT EXISTS mensagem TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mensagem_texto TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prioridade INT4 DEFAULT 5,
ADD COLUMN IF NOT EXISTS tentativas INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS agendado_para TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS enviado_em TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS erro_log TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS codigo_erro INT4 DEFAULT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Tabela de controle de volume diário e restrições (Anti-Ban)
CREATE TABLE IF NOT EXISTS public.controle_envios_diarios (
    data DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    total_enviados INT4 DEFAULT 0,
    limite_diario INT4 DEFAULT 60,
    timelock_ativo BOOLEAN DEFAULT FALSE,
    timelock_expira TIMESTAMPTZ DEFAULT NULL,
    instancia_status TEXT DEFAULT 'unknown',
    instancia_checada_em TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir registro do dia atual se não existir
INSERT INTO public.controle_envios_diarios (data, total_enviados, limite_diario)
VALUES (CURRENT_DATE, 0, 60)
ON CONFLICT (data) DO NOTHING;

-- Políticas de RLS para controle_envios_diarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'controle_envios_diarios' 
    AND policyname = 'Permitir tudo em controle_envios_diarios'
  ) THEN
    CREATE POLICY "Permitir tudo em controle_envios_diarios"
    ON public.controle_envios_diarios
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON public.controle_envios_diarios TO anon, authenticated, service_role;

-- 3. Tabela de configurações do sistema (garante suporte ao telefone do coordenador)
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
    chave TEXT PRIMARY KEY,
    valor JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices de alta performance para a fila
CREATE INDEX IF NOT EXISTS idx_fila_processamento ON public.fila_mensagens_whatsapp (status, prioridade, created_at)
WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_fila_reagendados ON public.fila_mensagens_whatsapp (status, agendado_para)
WHERE status IN ('reagendado_463', 'reagendado_500');

CREATE INDEX IF NOT EXISTS idx_fila_lote_id ON public.fila_mensagens_whatsapp (lote_id, status);

CREATE INDEX IF NOT EXISTS idx_fila_data_status ON public.fila_mensagens_whatsapp (created_at, status);

-- 5. Extensões pg_cron e pg_net já habilitadas no projeto
-- (Garantir apenas caso não existam via schema extensions)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 6. Agendamento do Worker Autônomo da Fila a cada 2 minutos
-- Remove agendamento antigo do worker se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'cron' AND tablename = 'job') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'processar-fila-whatsapp-worker';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Cria o agendamento do worker a cada 2 minutos
SELECT cron.schedule(
  'processar-fila-whatsapp-worker',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://yqqpugheqqknpbetysme.supabase.co/functions/v1/processar-fila-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxcXB1Z2hlcXFrbnBiZXR5c21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxOTkwNTUsImV4cCI6MjA2NTc3NTA1NX0.Q89vTdLgodaIsuLiIB6JijJPuzyrcRNPoTwUJ_gUQV4'
    ),
    body := '{}'::jsonb
  );
  $$
);
