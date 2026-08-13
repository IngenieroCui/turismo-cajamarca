-- =============================================================================
-- TURISMO CAJAMARCA PWA - ESQUEMA COMPLETO CON PREFIJO (turismo_)
-- Ejecuta este script en el SQL Editor de Supabase.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TIPOS Y ENUMS CON PREFIJO turismo_
DO $$ BEGIN
  CREATE TYPE public.turismo_user_role_enum AS ENUM (
    'usuario',
    'turista',
    'prestador_turistico',
    'admin',
    'super_admin',
    'moderador',
    'auditor',
    'soporte',
    'analista_datos',
    'servicios_ia',
    'desarrollador',
    'embajador',
    'afiliado',
    'funcionario_mincit',
    'camara_comercio'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.turismo_provider_sub_type_enum AS ENUM (
    'alojamiento',
    'gastronomia',
    'agencia_viajes',
    'transporte',
    'guia',
    'artesania',
    'entretenimiento'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.turismo_provider_org_role_enum AS ENUM (
    'dueno',
    'colaborador'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.turismo_rnt_status_enum AS ENUM (
    'verificado',
    'pendiente',
    'vencido',
    'sin_rnt'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.turismo_regulatory_entity_enum AS ENUM (
    'MINCIT',
    'FONTUR',
    'DIRCETUR',
    'CAMARA_COMERCIO'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.turismo_document_type_enum AS ENUM (
    'DNI',
    'RUC',
    'PASAPORTE',
    'CE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABLA PRINCIPAL (turismo_profiles)
CREATE TABLE IF NOT EXISTS public.turismo_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  document_type public.turismo_document_type_enum DEFAULT 'DNI',
  document_number TEXT,
  role public.turismo_user_role_enum NOT NULL DEFAULT 'usuario',
  tenant_id UUID,
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turismo_profiles_role ON public.turismo_profiles(role);
CREATE INDEX IF NOT EXISTS idx_turismo_profiles_tenant ON public.turismo_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_turismo_profiles_email ON public.turismo_profiles(email);

CREATE OR REPLACE FUNCTION public.turismo_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_turismo_profiles_updated_at ON public.turismo_profiles;
CREATE TRIGGER trg_turismo_profiles_updated_at
  BEFORE UPDATE ON public.turismo_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.turismo_update_updated_at_column();

-- 3. TABLAS ESPECIALIZADAS POR ROL
CREATE TABLE IF NOT EXISTS public.turismo_tourist_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  country_of_origin TEXT,
  nationality TEXT,
  preferred_language TEXT DEFAULT 'es',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  travel_preferences TEXT[] DEFAULT '{}',
  habeas_data_consent BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.turismo_provider_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  ruc TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  sub_type public.turismo_provider_sub_type_enum,
  org_role public.turismo_provider_org_role_enum DEFAULT 'dueno',
  rnt_number TEXT,
  rnt_status public.turismo_rnt_status_enum DEFAULT 'pendiente',
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  website_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  specific_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turismo_provider_ruc ON public.turismo_provider_profiles(ruc);
CREATE INDEX IF NOT EXISTS idx_turismo_provider_rnt ON public.turismo_provider_profiles(rnt_number);
CREATE INDEX IF NOT EXISTS idx_turismo_provider_sub_type ON public.turismo_provider_profiles(sub_type);

CREATE TABLE IF NOT EXISTS public.turismo_affiliate_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC(5,2) DEFAULT 5.00,
  payout_method TEXT CHECK (payout_method IN ('yape', 'plin', 'cci', 'transferencia')) DEFAULT 'yape',
  payout_account_info JSONB DEFAULT '{}'::jsonb,
  total_earnings NUMERIC(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turismo_affiliate_code ON public.turismo_affiliate_profiles(referral_code);

CREATE TABLE IF NOT EXISTS public.turismo_regulatory_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  entity_type public.turismo_regulatory_entity_enum NOT NULL,
  institutional_id TEXT NOT NULL,
  jurisdiction_scope TEXT,
  credential_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.turismo_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.turismo_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_target TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turismo_audit_actor ON public.turismo_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_turismo_audit_created ON public.turismo_audit_logs(created_at);

-- 4. TRIGGER AUTOMÁTICO DE AUTH DE SUPABASE
CREATE OR REPLACE FUNCTION public.turismo_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role public.turismo_user_role_enum;
  user_full_name TEXT;
BEGIN
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.turismo_user_role_enum,
    'usuario'::public.turismo_user_role_enum
  );

  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.turismo_profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    is_verified,
    permissions
  ) VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_role,
    TRUE,
    FALSE,
    CASE WHEN user_role = 'super_admin' THEN ARRAY['*'] ELSE ARRAY[]::TEXT[] END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.turismo_profiles.full_name),
    role = EXCLUDED.role;

  IF user_role = 'turista' OR user_role = 'usuario' THEN
    INSERT INTO public.turismo_tourist_profiles (profile_id, country_of_origin, preferred_language)
    VALUES (NEW.id, 'Perú', 'es')
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_turismo ON auth.users;
CREATE TRIGGER on_auth_user_created_turismo
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.turismo_handle_new_user();

-- 5. SEGURIDAD RLS Y POLÍTICAS
ALTER TABLE public.turismo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_tourist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_regulatory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura del propio perfil turismo" ON public.turismo_profiles;
CREATE POLICY "Permitir lectura del propio perfil turismo"
  ON public.turismo_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Permitir a Admin y SuperAdmin leer todos los perfiles turismo" ON public.turismo_profiles;
CREATE POLICY "Permitir a Admin y SuperAdmin leer todos los perfiles turismo"
  ON public.turismo_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Permitir edición de propio perfil turismo" ON public.turismo_profiles;
CREATE POLICY "Permitir edición de propio perfil turismo"
  ON public.turismo_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Permitir a SuperAdmin administrar perfiles turismo" ON public.turismo_profiles;
CREATE POLICY "Permitir a SuperAdmin administrar perfiles turismo"
  ON public.turismo_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Turistas leen su propio perfil turista turismo" ON public.turismo_tourist_profiles;
CREATE POLICY "Turistas leen su propio perfil turista turismo"
  ON public.turismo_tourist_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Turistas editan su propio perfil turista turismo" ON public.turismo_tourist_profiles;
CREATE POLICY "Turistas editan su propio perfil turista turismo"
  ON public.turismo_tourist_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Prestadores leen su propio perfil turismo" ON public.turismo_provider_profiles;
CREATE POLICY "Prestadores leen su propio perfil turismo"
  ON public.turismo_provider_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Prestadores editan su propio perfil turismo" ON public.turismo_provider_profiles;
CREATE POLICY "Prestadores editan su propio perfil turismo"
  ON public.turismo_provider_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Lectura pública de prestadores verificados turismo" ON public.turismo_provider_profiles;
CREATE POLICY "Lectura pública de prestadores verificados turismo"
  ON public.turismo_provider_profiles FOR SELECT
  USING (rnt_status = 'verificado');

DROP POLICY IF EXISTS "Entidades Reguladoras leen prestadores turismo" ON public.turismo_provider_profiles;
CREATE POLICY "Entidades Reguladoras leen prestadores turismo"
  ON public.turismo_provider_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('funcionario_mincit', 'camara_comercio', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Afiliados leen sus datos de comisiones turismo" ON public.turismo_affiliate_profiles;
CREATE POLICY "Afiliados leen sus datos de comisiones turismo"
  ON public.turismo_affiliate_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Reguladores leen sus datos de entidad turismo" ON public.turismo_regulatory_profiles;
CREATE POLICY "Reguladores leen sus datos de entidad turismo"
  ON public.turismo_regulatory_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Auditores y Admins leen logs de auditoria turismo" ON public.turismo_audit_logs;
CREATE POLICY "Auditores y Admins leen logs de auditoria turismo"
  ON public.turismo_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('auditor', 'admin', 'super_admin')
    )
  );

COMMIT;
