-- =============================================================================
-- TURISMO CAJAMARCA PWA - SCRIPT 05: RLS Y POLÍTICAS DE SEGURIDAD REVISADAS
-- =============================================================================

BEGIN;

ALTER TABLE public.turismo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_tourist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_regulatory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_moderator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_auditor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_support_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_analyst_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_devops_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_ai_service_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. POLÍTICAS EN `turismo_profiles`
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

-- 2. POLÍTICAS EN `turismo_tourist_profiles` (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Turistas gestionan su propio perfil turista" ON public.turismo_tourist_profiles;
CREATE POLICY "Turistas gestionan su propio perfil turista"
  ON public.turismo_tourist_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 3. POLÍTICAS EN `turismo_provider_profiles`
DROP POLICY IF EXISTS "Prestadores gestionan su propio perfil" ON public.turismo_provider_profiles;
CREATE POLICY "Prestadores gestionan su propio perfil"
  ON public.turismo_provider_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Lectura pública de prestadores verificados turismo" ON public.turismo_provider_profiles;
CREATE POLICY "Lectura pública de prestadores verificados turismo"
  ON public.turismo_provider_profiles FOR SELECT
  USING (rnt_status = 'verificado');

-- 4. POLÍTICAS EN `turismo_affiliate_profiles`
DROP POLICY IF EXISTS "Afiliados gestionan sus datos de comisiones" ON public.turismo_affiliate_profiles;
CREATE POLICY "Afiliados gestionan sus datos de comisiones"
  ON public.turismo_affiliate_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 5. POLÍTICAS EN `turismo_regulatory_profiles`
DROP POLICY IF EXISTS "Reguladores gestionan sus datos de entidad" ON public.turismo_regulatory_profiles;
CREATE POLICY "Reguladores gestionan sus datos de entidad"
  ON public.turismo_regulatory_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 6. POLÍTICAS EN OTRAS TABLAS DE PERFILES
DROP POLICY IF EXISTS "Moderadores gestionan su perfil" ON public.turismo_moderator_profiles;
CREATE POLICY "Moderadores gestionan su perfil"
  ON public.turismo_moderator_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Auditores gestionan su perfil" ON public.turismo_auditor_profiles;
CREATE POLICY "Auditores gestionan su perfil"
  ON public.turismo_auditor_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Soporte gestiona su perfil" ON public.turismo_support_profiles;
CREATE POLICY "Soporte gestiona su perfil"
  ON public.turismo_support_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Analistas gestionan su perfil" ON public.turismo_analyst_profiles;
CREATE POLICY "Analistas gestionan su perfil"
  ON public.turismo_analyst_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "DevOps gestiona su perfil" ON public.turismo_devops_profiles;
CREATE POLICY "DevOps gestiona su perfil"
  ON public.turismo_devops_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Servicios IA gestionan su perfil" ON public.turismo_ai_service_profiles;
CREATE POLICY "Servicios IA gestionan su perfil"
  ON public.turismo_ai_service_profiles FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 7. POLÍTICAS EN LOGS DE AUDITORÍA
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
