-- Turismo Cajamarca: cuenta base usuario y extensiones inicializadas por asignación.
-- Ejecutar después de 08, 09, 10, 11, 12 y 13 en bases existentes.
BEGIN;

UPDATE public.turismo_roles
SET name = 'Usuario General',
    description = 'Usuario base de la plataforma. Puede acceder a su cuenta y recibir roles adicionales.',
    is_active = TRUE,
    is_protected = FALSE,
    is_system = FALSE,
    updated_at = NOW()
WHERE code = 'usuario';

DELETE FROM public.turismo_role_permissions rp
USING public.turismo_roles r
WHERE r.id = rp.role_id
  AND r.code = 'usuario'
  AND rp.permission_code IN ('tourist:book', 'tourist:review', 'tourist:profile');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.turismo_roles WHERE code = 'usuario' AND is_active) THEN
    RAISE EXCEPTION 'El rol base usuario no está configurado; no se puede completar la migración';
  END IF;
END;
$$;

-- Estas extensiones se completan después por la persona o el equipo autorizado.
ALTER TABLE public.turismo_provider_profiles ALTER COLUMN ruc DROP NOT NULL;
ALTER TABLE public.turismo_provider_profiles ALTER COLUMN razon_social DROP NOT NULL;
ALTER TABLE public.turismo_regulatory_profiles ALTER COLUMN entity_type DROP NOT NULL;
ALTER TABLE public.turismo_regulatory_profiles ALTER COLUMN institutional_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.turismo_initialize_user_role_extension(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_role_code = 'turista' THEN
    INSERT INTO public.turismo_tourist_profiles(profile_id) VALUES (p_user_id) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'prestador_turistico' THEN
    INSERT INTO public.turismo_provider_profiles(profile_id) VALUES (p_user_id) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'moderador' THEN
    INSERT INTO public.turismo_moderator_profiles(profile_id) VALUES (p_user_id) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'auditor' THEN
    INSERT INTO public.turismo_auditor_profiles(profile_id) VALUES (p_user_id) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'soporte' THEN
    INSERT INTO public.turismo_support_profiles(profile_id) VALUES (p_user_id) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'analista_datos' THEN
    INSERT INTO public.turismo_analyst_profiles(profile_id) VALUES (p_user_id) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'desarrollador' THEN
    INSERT INTO public.turismo_devops_profiles(profile_id) VALUES (p_user_id) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code IN ('funcionario_mincit', 'camara_comercio') THEN
    INSERT INTO public.turismo_regulatory_profiles(profile_id) VALUES (p_user_id) ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code IN ('embajador', 'afiliado') THEN
    INSERT INTO public.turismo_affiliate_profiles(profile_id, referral_code)
    VALUES (p_user_id, 'CAJ-' || upper(substr(replace(p_user_id::TEXT, '-', ''), 1, 12)))
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base_role_id UUID;
BEGIN
  INSERT INTO public.turismo_profiles(id, email, full_name, phone, document_type, document_number, is_active, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'document_type')::public.turismo_document_type_enum, 'DNI'),
    NEW.raw_user_meta_data->>'document_number',
    TRUE,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.turismo_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.turismo_profiles.phone);

  SELECT id INTO base_role_id FROM public.turismo_roles WHERE code = 'usuario' AND is_active = TRUE;
  IF base_role_id IS NULL THEN
    RAISE EXCEPTION 'El rol base usuario no está configurado; no se puede crear la cuenta';
  END IF;

  INSERT INTO public.turismo_user_roles(user_id, role_id, is_active, is_primary)
  VALUES (NEW.id, base_role_id, TRUE, TRUE)
  ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = TRUE, is_primary = TRUE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_turismo ON auth.users;
CREATE TRIGGER on_auth_user_created_turismo
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.turismo_handle_new_user();

CREATE OR REPLACE FUNCTION public.turismo_assign_user_role(p_user_id UUID, p_role_code TEXT, p_make_primary BOOLEAN DEFAULT FALSE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_role public.turismo_roles%ROWTYPE;
  active_count INTEGER;
  has_primary_human BOOLEAN;
  has_devops BOOLEAN;
  caller_is_super BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN RAISE EXCEPTION 'No tienes permiso para gestionar usuarios'; END IF;
  SELECT * INTO target_role FROM public.turismo_roles WHERE code = p_role_code AND is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El rol no existe o está inactivo'; END IF;
  IF target_role.is_system THEN RAISE EXCEPTION 'Los roles de sistema no se asignan a personas'; END IF;
  caller_is_super := public.turismo_is_super_admin();
  IF target_role.is_protected AND NOT caller_is_super THEN RAISE EXCEPTION 'Solo Super Admin puede gestionar roles protegidos'; END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_protected
  ) THEN RAISE EXCEPTION 'El usuario tiene un rol protegido'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.code = 'desarrollador'
  ) INTO has_devops;
  IF p_role_code = 'desarrollador' AND EXISTS (SELECT 1 FROM public.turismo_user_roles WHERE user_id = p_user_id AND is_active AND role_id <> target_role.id) THEN
    RAISE EXCEPTION 'DevOps debe permanecer aislado';
  END IF;
  IF has_devops AND p_role_code <> 'desarrollador' THEN RAISE EXCEPTION 'DevOps no puede coexistir con roles de negocio'; END IF;

  SELECT count(*) INTO active_count FROM public.turismo_user_roles WHERE user_id = p_user_id AND is_active;
  SELECT EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND ur.is_primary AND r.is_active AND NOT r.is_system
  ) INTO has_primary_human;
  IF p_make_primary OR NOT has_primary_human THEN
    UPDATE public.turismo_user_roles SET is_primary = FALSE WHERE user_id = p_user_id AND is_active;
  END IF;

  INSERT INTO public.turismo_user_roles(user_id, role_id, is_active, is_primary, assigned_by)
  VALUES (p_user_id, target_role.id, TRUE, (p_make_primary OR NOT has_primary_human), auth.uid())
  ON CONFLICT (user_id, role_id) DO UPDATE SET
    is_active = TRUE,
    is_primary = CASE WHEN p_make_primary OR NOT has_primary_human THEN TRUE ELSE public.turismo_user_roles.is_primary END,
    assigned_by = auth.uid(),
    assigned_at = NOW();

  PERFORM public.turismo_initialize_user_role_extension(p_user_id, p_role_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_primary_user_role(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_role_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'La cuenta está inactiva'; END IF;
  IF p_user_id <> auth.uid() AND NOT public.turismo_current_user_has_permission('users:manage') THEN RAISE EXCEPTION 'No tienes permiso'; END IF;
  IF p_user_id <> auth.uid() AND NOT public.turismo_is_super_admin() AND EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_protected
  ) THEN RAISE EXCEPTION 'El usuario tiene un rol protegido'; END IF;
  SELECT r.id INTO target_role_id
  FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_active AND NOT r.is_system AND r.code = p_role_code;
  IF target_role_id IS NULL THEN RAISE EXCEPTION 'El rol no está asignado activamente o es un rol de sistema'; END IF;
  UPDATE public.turismo_user_roles SET is_primary = FALSE WHERE user_id = p_user_id AND is_active;
  UPDATE public.turismo_user_roles SET is_primary = TRUE WHERE user_id = p_user_id AND role_id = target_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_role_status(p_role_code TEXT, p_is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_role_id UUID; target_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_is_super_admin() THEN RAISE EXCEPTION 'Solo Super Admin puede activar roles'; END IF;
  SELECT id INTO target_role_id FROM public.turismo_roles WHERE code = p_role_code;
  IF target_role_id IS NULL THEN RAISE EXCEPTION 'Rol no encontrado'; END IF;
  IF p_role_code = 'super_admin' AND NOT p_is_active THEN RAISE EXCEPTION 'Super Admin no puede desactivarse'; END IF;
  UPDATE public.turismo_roles SET is_active = p_is_active, updated_at = NOW() WHERE id = target_role_id;

  IF NOT p_is_active THEN
    UPDATE public.turismo_user_roles SET is_primary = FALSE WHERE role_id = target_role_id AND is_active;
    FOR target_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id = ur.role_id
      WHERE ur.is_active AND r.is_active AND NOT r.is_system
        AND NOT EXISTS (
          SELECT 1 FROM public.turismo_user_roles current_primary
          JOIN public.turismo_roles primary_role ON primary_role.id = current_primary.role_id
          WHERE current_primary.user_id = ur.user_id AND current_primary.is_active AND current_primary.is_primary
            AND primary_role.is_active AND NOT primary_role.is_system
        )
    LOOP
      UPDATE public.turismo_user_roles SET is_primary = TRUE
      WHERE user_id = target_user_id AND role_id = (
        SELECT fallback.role_id
        FROM public.turismo_user_roles fallback
        JOIN public.turismo_roles fallback_role ON fallback_role.id = fallback.role_id
        WHERE fallback.user_id = target_user_id AND fallback.is_active AND fallback_role.is_active AND NOT fallback_role.is_system
        ORDER BY fallback.assigned_at ASC LIMIT 1
      );
    END LOOP;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_own_provider_profile(
  p_ruc TEXT, p_razon_social TEXT, p_nombre_comercial TEXT, p_sub_type TEXT, p_org_role TEXT,
  p_rnt_number TEXT, p_address TEXT, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION,
  p_website_url TEXT, p_social_links JSONB, p_specific_metadata JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'La cuenta está inactiva'; END IF;
  IF NOT public.turismo_current_user_has_role('prestador_turistico') THEN RAISE EXCEPTION 'El usuario no tiene rol de Prestador Turístico'; END IF;
  INSERT INTO public.turismo_provider_profiles(profile_id, ruc, razon_social, nombre_comercial, sub_type, org_role, rnt_number, address, latitude, longitude, website_url, social_links, specific_metadata)
  VALUES (
    auth.uid(), NULLIF(TRIM(p_ruc), ''), NULLIF(TRIM(p_razon_social), ''), NULLIF(TRIM(p_nombre_comercial), ''),
    CASE WHEN p_sub_type IS NULL OR p_sub_type = '' THEN NULL ELSE p_sub_type::public.turismo_provider_sub_type_enum END,
    CASE WHEN p_org_role IS NULL OR p_org_role = '' THEN 'dueno'::public.turismo_provider_org_role_enum ELSE p_org_role::public.turismo_provider_org_role_enum END,
    NULLIF(TRIM(p_rnt_number), ''), NULLIF(TRIM(p_address), ''), p_latitude, p_longitude, NULLIF(TRIM(p_website_url), ''), COALESCE(p_social_links, '{}'), COALESCE(p_specific_metadata, '{}')
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    ruc = COALESCE(EXCLUDED.ruc, public.turismo_provider_profiles.ruc),
    razon_social = COALESCE(EXCLUDED.razon_social, public.turismo_provider_profiles.razon_social),
    nombre_comercial = EXCLUDED.nombre_comercial, sub_type = EXCLUDED.sub_type, org_role = EXCLUDED.org_role,
    rnt_number = EXCLUDED.rnt_number, address = EXCLUDED.address, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
    website_url = EXCLUDED.website_url, social_links = EXCLUDED.social_links, specific_metadata = EXCLUDED.specific_metadata, updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.turismo_initialize_user_role_extension(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.turismo_assign_user_role(UUID, TEXT, BOOLEAN), public.turismo_set_primary_user_role(UUID, TEXT), public.turismo_set_role_status(TEXT, BOOLEAN), public.turismo_update_own_provider_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, JSONB, JSONB) TO authenticated;

INSERT INTO public.turismo_schema_version(version, migration_name)
VALUES (14, '14_default_user_role_and_role_switching.sql')
ON CONFLICT (version) DO UPDATE SET migration_name = EXCLUDED.migration_name;
COMMIT;
