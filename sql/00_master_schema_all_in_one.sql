-- =============================================================================
-- TURISMO CAJAMARCA PWA - ESQUEMA COMPLETO CON PREFIJO (turismo_)
-- Ejecuta este script en el SQL Editor de Supabase para inicializar las tablas.
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
  is_verified BOOLEAN DEFAULT TRUE,
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

-- 4. TRIGGER AUTOMÁTICO DE AUTH DE SUPABASE (Guarda Todos los Campos)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_turismo ON auth.users;

CREATE OR REPLACE FUNCTION public.turismo_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_text TEXT;
  user_role_val public.turismo_user_role_enum;
  user_full_name TEXT;
  user_phone TEXT;
  user_doc_type_text TEXT;
  user_doc_type_val public.turismo_document_type_enum;
  user_doc_num TEXT;
  user_country TEXT;
  user_nationality TEXT;
  user_lang TEXT;
  user_emerg_name TEXT;
  user_emerg_phone TEXT;
BEGIN
  user_role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'turista');
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  user_phone := NEW.raw_user_meta_data->>'phone';
  user_doc_type_text := COALESCE(NEW.raw_user_meta_data->>'document_type', 'DNI');
  user_doc_num := NEW.raw_user_meta_data->>'document_number';

  user_country := COALESCE(NEW.raw_user_meta_data->>'country_of_origin', 'Colombia');
  user_nationality := COALESCE(NEW.raw_user_meta_data->>'nationality', 'Colombiana');
  user_lang := COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'es');
  user_emerg_name := NEW.raw_user_meta_data->>'emergency_contact_name';
  user_emerg_phone := NEW.raw_user_meta_data->>'emergency_contact_phone';

  BEGIN
    user_role_val := user_role_text::public.turismo_user_role_enum;
  EXCEPTION WHEN OTHERS THEN
    user_role_val := 'turista'::public.turismo_user_role_enum;
  END;

  BEGIN
    user_doc_type_val := user_doc_type_text::public.turismo_document_type_enum;
  EXCEPTION WHEN OTHERS THEN
    user_doc_type_val := 'DNI'::public.turismo_document_type_enum;
  END;

  -- Auto-confirmación del correo en auth.users
  BEGIN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = NEW.id AND email_confirmed_at IS NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Insertar perfil en `turismo_profiles`
  BEGIN
    INSERT INTO public.turismo_profiles (
      id,
      email,
      full_name,
      phone,
      document_type,
      document_number,
      role,
      is_active,
      is_verified,
      permissions
    ) VALUES (
      NEW.id,
      NEW.email,
      user_full_name,
      user_phone,
      user_doc_type_val,
      user_doc_num,
      user_role_val,
      TRUE,
      TRUE,
      CASE WHEN user_role_val = 'super_admin' THEN ARRAY['*'] ELSE ARRAY[]::TEXT[] END
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.turismo_profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.turismo_profiles.phone),
      document_type = COALESCE(EXCLUDED.document_type, public.turismo_profiles.document_type),
      document_number = COALESCE(EXCLUDED.document_number, public.turismo_profiles.document_number),
      role = EXCLUDED.role,
      is_verified = TRUE;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    IF user_role_val = 'turista' OR user_role_val = 'usuario' THEN
      INSERT INTO public.turismo_tourist_profiles (
        profile_id,
        country_of_origin,
        nationality,
        preferred_language,
        emergency_contact_name,
        emergency_contact_phone
      )
      VALUES (
        NEW.id,
        user_country,
        user_nationality,
        user_lang,
        user_emerg_name,
        user_emerg_phone
      )
      ON CONFLICT (profile_id) DO UPDATE
      SET
        country_of_origin = COALESCE(EXCLUDED.country_of_origin, public.turismo_tourist_profiles.country_of_origin),
        nationality = COALESCE(EXCLUDED.nationality, public.turismo_tourist_profiles.nationality),
        preferred_language = COALESCE(EXCLUDED.preferred_language, public.turismo_tourist_profiles.preferred_language),
        emergency_contact_name = COALESCE(EXCLUDED.emergency_contact_name, public.turismo_tourist_profiles.emergency_contact_name),
        emergency_contact_phone = COALESCE(EXCLUDED.emergency_contact_phone, public.turismo_tourist_profiles.emergency_contact_phone);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

DROP POLICY IF EXISTS "Permitir insercion del propio perfil turismo" ON public.turismo_profiles;
CREATE POLICY "Permitir insercion del propio perfil turismo"
  ON public.turismo_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

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

-- Políticas de Tourist Profiles
DROP POLICY IF EXISTS "Turistas leen su propio perfil turista turismo" ON public.turismo_tourist_profiles;
CREATE POLICY "Turistas leen su propio perfil turista turismo"
  ON public.turismo_tourist_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Turistas insertan su propio perfil turista turismo" ON public.turismo_tourist_profiles;
CREATE POLICY "Turistas insertan su propio perfil turista turismo"
  ON public.turismo_tourist_profiles FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Turistas editan su propio perfil turista turismo" ON public.turismo_tourist_profiles;
CREATE POLICY "Turistas editan su propio perfil turista turismo"
  ON public.turismo_tourist_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

-- Políticas de Provider Profiles
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

-- Políticas de Affiliate Profiles
DROP POLICY IF EXISTS "Afiliados leen sus datos de comisiones turismo" ON public.affiliate_profiles;
CREATE POLICY "Afiliados leen sus datos de comisiones turismo"
  ON public.turismo_affiliate_profiles FOR SELECT
  USING (auth.uid() = profile_id);

-- Políticas de Regulatory Profiles
DROP POLICY IF EXISTS "Reguladores leen sus datos de entidad turismo" ON public.turismo_regulatory_profiles;
CREATE POLICY "Reguladores leen sus datos de entidad turismo"
  ON public.turismo_regulatory_profiles FOR SELECT
  USING (auth.uid() = profile_id);

-- Políticas de Audit Logs
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

-- =============================================================================
-- TABLA DE ROLES DINÁMICOS (turismo_roles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.turismo_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  badge_color TEXT DEFAULT 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  folder_name TEXT DEFAULT 'turista',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turismo_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de roles activos" ON public.turismo_roles;
CREATE POLICY "Lectura pública de roles activos"
  ON public.turismo_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Edición de roles por administradores" ON public.turismo_roles;
CREATE POLICY "Edición de roles por administradores"
  ON public.turismo_roles FOR ALL
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.turismo_profiles
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
      )
    )
  );

INSERT INTO public.turismo_roles (code, name, description, badge_color, folder_name)
VALUES
  ('usuario', 'Usuario General', 'Rol base por defecto al registrarse en la plataforma.', 'bg-slate-500/10 text-slate-300 border-slate-500/20', 'usuario'),
  ('turista', 'Turista', 'Viajeros y consumidores finales de experiencias turísticas.', 'bg-blue-500/10 text-blue-400 border-blue-500/20', 'turista'),
  ('prestador_turistico', 'Prestador Turístico', 'Empresas, guías, hoteles y operadores de servicios turísticos.', 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 'prestador_turistico'),
  ('admin', 'Administrador', 'Operación diaria de la plataforma y usuarios.', 'bg-purple-500/10 text-purple-400 border-purple-500/20', 'admin'),
  ('super_admin', 'Super Administrador', 'Control absoluto del sistema e infraestructura.', 'bg-red-500/10 text-red-400 border-red-500/20', 'super_admin'),
  ('moderador', 'Moderador', 'Revisión y aprobación de contenidos y opiniones.', 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', 'moderador'),
  ('auditor', 'Auditor', 'Supervisión de trazabilidad, logs e integridad legal.', 'bg-amber-500/10 text-amber-400 border-amber-500/20', 'auditor'),
  ('soporte', 'Soporte Técnico', 'Atención de incidencias y asistencia técnica.', 'bg-teal-500/10 text-teal-400 border-teal-500/20', 'soporte'),
  ('analista_datos', 'Analista de Datos', 'Inteligencia de negocios y datos agregados.', 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', 'analista_datos'),
  ('servicios_ia', 'Servicio IA / Sistema', 'Motor de recomendaciones e identidades de servicio.', 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20', 'servicios_ia'),
  ('desarrollador', 'Desarrollador / DevOps', 'Acceso técnico, despliegues e infraestructura.', 'bg-slate-600/10 text-slate-300 border-slate-600/20', 'desarrollador'),
  ('embajador', 'Embajador', 'Promotores de turismo y enlaces de afiliación.', 'bg-orange-500/10 text-orange-400 border-orange-500/20', 'embajador'),
  ('afiliado', 'Afiliado', 'Red de referidos y promociones turísticas.', 'bg-rose-500/10 text-rose-400 border-rose-500/20', 'afiliado'),
  ('funcionario_mincit', 'Funcionario MinCIT / FONTUR', 'Supervisión regulatoria y fiscalización RNT.', 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', 'funcionario_mincit'),
  ('camara_comercio', 'Cámara de Comercio', 'Validación de registro mercantil y formalización empresarial.', 'bg-lime-500/10 text-lime-400 border-lime-500/20', 'camara_comercio')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  badge_color = EXCLUDED.badge_color,
  folder_name = EXCLUDED.folder_name;

-- 8. TABLAS DE PERFILES ESPECIALIZADOS ADICIONALES POR ROL
CREATE TABLE IF NOT EXISTS public.turismo_moderator_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  specialty_area TEXT DEFAULT 'General',
  assigned_categories TEXT[] DEFAULT '{}',
  moderation_level TEXT DEFAULT 'Junior',
  daily_quota INT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.turismo_moderator_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.turismo_auditor_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  audit_certification_id TEXT,
  institutional_scope TEXT DEFAULT 'Regional',
  security_clearance_level TEXT DEFAULT 'Nivel 2',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.turismo_auditor_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.turismo_support_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  support_level TEXT DEFAULT 'Nivel 1',
  assigned_queue TEXT DEFAULT 'Atencion General',
  max_refund_limit NUMERIC(10,2) DEFAULT 500.00,
  shift_hours TEXT DEFAULT '8am - 5pm',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.turismo_support_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.turismo_analyst_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  bi_tool TEXT DEFAULT 'Metabase',
  dataset_access_scope TEXT DEFAULT 'Datos Agregados Anonimizados',
  export_format_permission BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.turismo_analyst_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.turismo_devops_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  git_handle TEXT,
  environment_access TEXT DEFAULT 'Staging',
  public_ssh_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.turismo_devops_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.turismo_ai_service_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  service_name TEXT DEFAULT 'Recomendador Gemini 2.5',
  model_version TEXT DEFAULT 'v2.5-flash',
  daily_token_quota INT DEFAULT 500000,
  endpoint_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.turismo_ai_service_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;
