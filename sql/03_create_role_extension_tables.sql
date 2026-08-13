-- =============================================================================
-- TURISMO CAJAMARCA PWA - SCRIPT 03: TABLAS ESPECIALIZADAS POR ROL (turismo_)
-- =============================================================================

-- 1. DATOS DE TURISTA (turismo_tourist_profiles)
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

-- 2. DATOS DE PRESTADOR TURÍSTICO (turismo_provider_profiles)
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

-- 3. DATOS DE EMBAJADORES & AFILIADOS (turismo_affiliate_profiles)
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

-- 4. DATOS DE ENTIDADES REGULADORAS (turismo_regulatory_profiles)
CREATE TABLE IF NOT EXISTS public.turismo_regulatory_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  entity_type public.turismo_regulatory_entity_enum NOT NULL,
  institutional_id TEXT NOT NULL,
  jurisdiction_scope TEXT,
  credential_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REGISTROS DE AUDITORÍA E INTEGRIDAD (turismo_audit_logs)
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
