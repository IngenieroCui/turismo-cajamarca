-- =============================================================================
-- TURISMO CAJAMARCA PWA - SCRIPT 07: TABLAS DE PERFILES ESPECIALIZADOS POR ROL
-- =============================================================================

BEGIN;

-- 1. TABLA PARA PERFIL DE MODERADOR (turismo_moderator_profiles)
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

DROP POLICY IF EXISTS "Moderadores leen su propio perfil moderador" ON public.turismo_moderator_profiles;
CREATE POLICY "Moderadores leen su propio perfil moderador"
  ON public.turismo_moderator_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Moderadores editan su propio perfil moderador" ON public.turismo_moderator_profiles;
CREATE POLICY "Moderadores editan su propio perfil moderador"
  ON public.turismo_moderator_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Admins y SuperAdmins gestionan perfiles moderador" ON public.turismo_moderator_profiles;
CREATE POLICY "Admins y SuperAdmins gestionan perfiles moderador"
  ON public.turismo_moderator_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- 2. TABLA PARA PERFIL DE AUDITOR (turismo_auditor_profiles)
CREATE TABLE IF NOT EXISTS public.turismo_auditor_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  audit_certification_id TEXT,
  institutional_scope TEXT DEFAULT 'Regional',
  security_clearance_level TEXT DEFAULT 'Nivel 2',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turismo_auditor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auditores leen su propio perfil auditor" ON public.turismo_auditor_profiles;
CREATE POLICY "Auditores leen su propio perfil auditor"
  ON public.turismo_auditor_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Auditores editan su propio perfil auditor" ON public.turismo_auditor_profiles;
CREATE POLICY "Auditores editan su propio perfil auditor"
  ON public.turismo_auditor_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "SuperAdmins gestionan perfiles auditor" ON public.turismo_auditor_profiles;
CREATE POLICY "SuperAdmins gestionan perfiles auditor"
  ON public.turismo_auditor_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- 3. TABLA PARA PERFIL DE SOPORTE TÉCNICO (turismo_support_profiles)
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

DROP POLICY IF EXISTS "Soporte lee su propio perfil" ON public.turismo_support_profiles;
CREATE POLICY "Soporte lee su propio perfil"
  ON public.turismo_support_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Soporte edita su propio perfil" ON public.turismo_support_profiles;
CREATE POLICY "Soporte edita su propio perfil"
  ON public.turismo_support_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

-- 4. TABLA PARA PERFIL DE ANALISTA DE DATOS (turismo_analyst_profiles)
CREATE TABLE IF NOT EXISTS public.turismo_analyst_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  bi_tool TEXT DEFAULT 'Metabase',
  dataset_access_scope TEXT DEFAULT 'Datos Agregados Anonimizados',
  export_format_permission BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turismo_analyst_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Analistas leen su propio perfil" ON public.turismo_analyst_profiles;
CREATE POLICY "Analistas leen su propio perfil"
  ON public.turismo_analyst_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Analistas editan su propio perfil" ON public.turismo_analyst_profiles;
CREATE POLICY "Analistas editan su propio perfil"
  ON public.turismo_analyst_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

-- 5. TABLA PARA PERFIL DE DESARROLLADOR / DEVOPS (turismo_devops_profiles)
CREATE TABLE IF NOT EXISTS public.turismo_devops_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  git_handle TEXT,
  environment_access TEXT DEFAULT 'Staging',
  public_ssh_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turismo_devops_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DevOps leen su propio perfil" ON public.turismo_devops_profiles;
CREATE POLICY "DevOps leen su propio perfil"
  ON public.turismo_devops_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "DevOps editan su propio perfil" ON public.turismo_devops_profiles;
CREATE POLICY "DevOps editan su propio perfil"
  ON public.turismo_devops_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

-- 6. TABLA PARA PERFIL DE SERVICIOS DE IA / SISTEMA (turismo_ai_service_profiles)
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

DROP POLICY IF EXISTS "Servicios IA leen su propio perfil" ON public.turismo_ai_service_profiles;
CREATE POLICY "Servicios IA leen su propio perfil"
  ON public.turismo_ai_service_profiles FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Servicios IA editan su propio perfil" ON public.turismo_ai_service_profiles;
CREATE POLICY "Servicios IA editan su propio perfil"
  ON public.turismo_ai_service_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

COMMIT;
