-- =============================================================================
-- TURISMO CAJAMARCA PWA - SCRIPT 05: RLS Y POLÍTICAS (Prefijo: turismo_)
-- =============================================================================

ALTER TABLE public.turismo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_tourist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_regulatory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. POLÍTICAS DE ACCESO EN `turismo_profiles`
CREATE POLICY "Permitir lectura del propio perfil turismo"
  ON public.turismo_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Permitir a Admin y SuperAdmin leer todos los perfiles turismo"
  ON public.turismo_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Permitir edición de propio perfil turismo"
  ON public.turismo_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Permitir a SuperAdmin administrar perfiles turismo"
  ON public.turismo_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- 2. POLÍTICAS DE ACCESO EN `turismo_tourist_profiles`
CREATE POLICY "Turistas leen su propio perfil turista turismo"
  ON public.turismo_tourist_profiles FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Turistas editan su propio perfil turista turismo"
  ON public.turismo_tourist_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

-- 3. POLÍTICAS DE ACCESO EN `turismo_provider_profiles`
CREATE POLICY "Prestadores leen su propio perfil turismo"
  ON public.turismo_provider_profiles FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Prestadores editan su propio perfil turismo"
  ON public.turismo_provider_profiles FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Lectura pública de prestadores verificados turismo"
  ON public.turismo_provider_profiles FOR SELECT
  USING (rnt_status = 'verificado');

CREATE POLICY "Entidades Reguladoras leen prestadores turismo"
  ON public.turismo_provider_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('funcionario_mincit', 'camara_comercio', 'admin', 'super_admin')
    )
  );

-- 4. POLÍTICAS DE ACCESO EN `turismo_affiliate_profiles`
CREATE POLICY "Afiliados leen sus datos de comisiones turismo"
  ON public.turismo_affiliate_profiles FOR SELECT
  USING (auth.uid() = profile_id);

-- 5. POLÍTICAS DE ACCESO EN `turismo_regulatory_profiles`
CREATE POLICY "Reguladores leen sus datos de entidad turismo"
  ON public.turismo_regulatory_profiles FOR SELECT
  USING (auth.uid() = profile_id);

-- 6. POLÍTICAS DE ACCESO EN `turismo_audit_logs`
CREATE POLICY "Auditores y Admins leen logs de auditoria turismo"
  ON public.turismo_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('auditor', 'admin', 'super_admin')
    )
  );
