-- ============================================
-- DIMENSY - SCHEMA COMPLETO COM HISTÓRICO, ASSINATURA E STORAGE
-- Execute este arquivo no SQL Editor do Supabase.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  creditos INTEGER NOT NULL DEFAULT 3 CHECK (creditos >= 0),
  plano TEXT NOT NULL DEFAULT 'free'
    CHECK (plano IN ('free', '10_creditos', '20_creditos', 'ilimitado')),
  assinatura_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (assinatura_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assinatura_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_stripe_customer_id'
  ) THEN
    CREATE UNIQUE INDEX idx_profiles_stripe_customer_id
      ON public.profiles (stripe_customer_id)
      WHERE stripe_customer_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_stripe_subscription_id'
  ) THEN
    CREATE UNIQUE INDEX idx_profiles_stripe_subscription_id
      ON public.profiles (stripe_subscription_id)
      WHERE stripe_subscription_id IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- TABELA: USO DE CRÉDITOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.uso_creditos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ferramenta TEXT NOT NULL,
  creditos_antes INTEGER NOT NULL,
  creditos_depois INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.uso_creditos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================
-- TABELA: PAGAMENTOS / ASSINATURAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plano TEXT NOT NULL
    CHECK (plano IN ('10_creditos', '20_creditos', 'ilimitado')),
  creditos INTEGER NOT NULL CHECK (creditos >= 0),
  stripe_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tipo_cobranca TEXT NOT NULL DEFAULT 'subscription'
    CHECK (tipo_cobranca IN ('one_time', 'subscription')),
  valor DECIMAL(10,2),
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS tipo_cobranca TEXT NOT NULL DEFAULT 'subscription';
ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================
-- TABELA: PROJETOS GERADOS / HISTÓRICO
-- ============================================
CREATE TABLE IF NOT EXISTS public.projetos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  dados_entrada JSONB NOT NULL DEFAULT '{}'::jsonb,
  resultados JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_registros INTEGER NOT NULL DEFAULT 0 CHECK (total_registros >= 0),
  total_ferramentas INTEGER NOT NULL DEFAULT 0 CHECK (total_ferramentas >= 0),
  creditos_consumidos INTEGER NOT NULL DEFAULT 1 CHECK (creditos_consumidos >= 0),
  storage_bucket TEXT,
  arquivo_json_path TEXT,
  arquivo_json_mime TEXT,
  arquivo_json_tamanho BIGINT,
  ultima_geracao_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS storage_bucket TEXT;
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS arquivo_json_path TEXT;
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS arquivo_json_mime TEXT;
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS arquivo_json_tamanho BIGINT;
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS ultima_geracao_em TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_uso_creditos_user_created_at
  ON public.uso_creditos (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pagamentos_user_created_at
  ON public.pagamentos (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pagamentos_subscription
  ON public.pagamentos (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projetos_user_geracao
  ON public.projetos (user_id, ultima_geracao_em DESC);

CREATE INDEX IF NOT EXISTS idx_projetos_storage_path
  ON public.projetos (arquivo_json_path)
  WHERE arquivo_json_path IS NOT NULL;

-- ============================================
-- FUNÇÃO/TRIGGER PARA updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projetos_updated_at ON public.projetos;
CREATE TRIGGER update_projetos_updated_at
BEFORE UPDATE ON public.projetos
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================
-- STORAGE BUCKET DOS PROJETOS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dimensy-projects',
  'dimensy-projects',
  false,
  52428800,
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS NAS TABELAS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: PROFILES
-- ============================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- POLICIES: USO_CREDITOS
-- ============================================
DROP POLICY IF EXISTS "Users can view own usage" ON public.uso_creditos;
CREATE POLICY "Users can view own usage"
ON public.uso_creditos
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: PAGAMENTOS
-- ============================================
DROP POLICY IF EXISTS "Users can view own payments" ON public.pagamentos;
CREATE POLICY "Users can view own payments"
ON public.pagamentos
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: PROJETOS
-- ============================================
DROP POLICY IF EXISTS "Users can view own projects" ON public.projetos;
CREATE POLICY "Users can view own projects"
ON public.projetos
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projetos;
CREATE POLICY "Users can insert own projects"
ON public.projetos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projetos;
CREATE POLICY "Users can update own projects"
ON public.projetos
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projetos;
CREATE POLICY "Users can delete own projects"
ON public.projetos
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: STORAGE (bucket dimensy-projects)
-- Os arquivos ficam dentro do padrão: {auth.uid()}/{project_id}-{slug}/projeto-completo.json
-- ============================================
DROP POLICY IF EXISTS "Users can view own Dimensy project files" ON storage.objects;
CREATE POLICY "Users can view own Dimensy project files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dimensy-projects'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload own Dimensy project files" ON storage.objects;
CREATE POLICY "Users can upload own Dimensy project files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dimensy-projects'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own Dimensy project files" ON storage.objects;
CREATE POLICY "Users can update own Dimensy project files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dimensy-projects'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'dimensy-projects'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own Dimensy project files" ON storage.objects;
CREATE POLICY "Users can delete own Dimensy project files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dimensy-projects'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
