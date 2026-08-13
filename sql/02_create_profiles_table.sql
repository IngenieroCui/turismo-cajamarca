-- =============================================================================
-- TURISMO CAJAMARCA PWA - SCRIPT 02: TABLA PRINCIPAL (turismo_profiles)
-- =============================================================================

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
