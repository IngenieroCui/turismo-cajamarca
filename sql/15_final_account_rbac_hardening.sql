-- Turismo Cajamarca: hardening final de cuentas humanas y RBAC multirol.
-- Ejecutar después de 08, 09, 10, 11, 12, 13 y 14 en bases existentes.
BEGIN;

DO $$
DECLARE
  base_role public.turismo_roles%ROWTYPE;
BEGIN
  SELECT * INTO base_role
  FROM public.turismo_roles
  WHERE code = 'usuario';

  IF NOT FOUND OR NOT base_role.is_active THEN
    RAISE EXCEPTION 'El rol base Usuario no existe o está inactivo';
  END IF;

  UPDATE public.turismo_roles
  SET name = 'Usuario General',
      description = 'Usuario base de la plataforma. Puede acceder a su cuenta y recibir roles adicionales.',
      is_active = TRUE,
      is_protected = FALSE,
      is_system = FALSE,
      updated_at = NOW()
  WHERE id = base_role.id;

  DELETE FROM public.turismo_role_permissions
  WHERE role_id = base_role.id;

  INSERT INTO public.turismo_user_roles(user_id, role_id, is_active, is_primary)
  SELECT p.id, base_role.id, TRUE, FALSE
  FROM public.turismo_profiles p
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles system_assignment
    JOIN public.turismo_roles system_role ON system_role.id = system_assignment.role_id
    WHERE system_assignment.user_id = p.id
      AND system_assignment.is_active
      AND system_role.is_system
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles usuario_assignment
    WHERE usuario_assignment.user_id = p.id
      AND usuario_assignment.role_id = base_role.id
      AND usuario_assignment.is_active
  )
  ON CONFLICT (user_id, role_id) DO UPDATE SET
    is_active = TRUE,
    is_primary = CASE
      WHEN public.turismo_user_roles.is_active THEN public.turismo_user_roles.is_primary
      ELSE FALSE
    END;

  UPDATE public.turismo_user_roles assignment
  SET is_primary = FALSE
  WHERE assignment.is_active
    AND NOT EXISTS (
      SELECT 1
      FROM public.turismo_user_roles system_assignment
      JOIN public.turismo_roles system_role ON system_role.id = system_assignment.role_id
      WHERE system_assignment.user_id = assignment.user_id
        AND system_assignment.is_active
        AND system_role.is_system
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.turismo_user_roles primary_assignment
      JOIN public.turismo_roles primary_role ON primary_role.id = primary_assignment.role_id
      WHERE primary_assignment.user_id = assignment.user_id
        AND primary_assignment.is_active
        AND primary_assignment.is_primary
        AND primary_role.is_active
        AND NOT primary_role.is_system
    )
    AND assignment.is_primary;

  UPDATE public.turismo_user_roles assignment
  SET is_primary = TRUE
  WHERE assignment.role_id = base_role.id
    AND assignment.is_active
    AND NOT EXISTS (
      SELECT 1
      FROM public.turismo_user_roles system_assignment
      JOIN public.turismo_roles system_role ON system_role.id = system_assignment.role_id
      WHERE system_assignment.user_id = assignment.user_id
        AND system_assignment.is_active
        AND system_role.is_system
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.turismo_user_roles primary_assignment
      JOIN public.turismo_roles primary_role ON primary_role.id = primary_assignment.role_id
      WHERE primary_assignment.user_id = assignment.user_id
        AND primary_assignment.is_active
        AND primary_assignment.is_primary
        AND primary_role.is_active
        AND NOT primary_role.is_system
    );
END;
$$;

ALTER TABLE public.turismo_provider_profiles ALTER COLUMN ruc DROP NOT NULL;
ALTER TABLE public.turismo_provider_profiles ALTER COLUMN razon_social DROP NOT NULL;
ALTER TABLE public.turismo_regulatory_profiles ALTER COLUMN entity_type DROP NOT NULL;
ALTER TABLE public.turismo_regulatory_profiles ALTER COLUMN institutional_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.turismo_initialize_user_role_extension(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_role_code = 'turista' THEN
    INSERT INTO public.turismo_tourist_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'prestador_turistico' THEN
    INSERT INTO public.turismo_provider_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'moderador' THEN
    INSERT INTO public.turismo_moderator_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'auditor' THEN
    INSERT INTO public.turismo_auditor_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'soporte' THEN
    INSERT INTO public.turismo_support_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'analista_datos' THEN
    INSERT INTO public.turismo_analyst_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'desarrollador' THEN
    INSERT INTO public.turismo_devops_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code IN ('funcionario_mincit', 'camara_comercio') THEN
    INSERT INTO public.turismo_regulatory_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code IN ('embajador', 'afiliado') THEN
    INSERT INTO public.turismo_affiliate_profiles(profile_id, referral_code)
    VALUES (p_user_id, 'CAJ-' || upper(substr(replace(p_user_id::TEXT, '-', ''), 1, 12)))
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_role_id UUID;
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

  SELECT id INTO base_role_id
  FROM public.turismo_roles
  WHERE code = 'usuario'
    AND is_active = TRUE
    AND is_system = FALSE;
  IF base_role_id IS NULL THEN
    RAISE EXCEPTION 'El rol base Usuario no está configurado; no se puede crear la cuenta';
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
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.turismo_handle_new_user();

CREATE OR REPLACE FUNCTION public.turismo_assign_user_role(p_user_id UUID, p_role_code TEXT, p_make_primary BOOLEAN DEFAULT FALSE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_role public.turismo_roles%ROWTYPE;
  has_primary_human BOOLEAN;
  has_devops BOOLEAN;
  caller_is_super BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar usuarios';
  END IF;

  SELECT * INTO target_role
  FROM public.turismo_roles
  WHERE code = p_role_code
    AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El rol no existe o está inactivo';
  END IF;
  IF target_role.is_system THEN
    RAISE EXCEPTION 'Los roles de sistema no se asignan a personas';
  END IF;
  IF p_role_code = 'usuario' AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_system
  ) THEN
    RAISE EXCEPTION 'Las identidades de sistema no reciben el rol base Usuario';
  END IF;

  caller_is_super := public.turismo_is_super_admin();
  IF target_role.is_protected AND NOT caller_is_super THEN
    RAISE EXCEPTION 'Solo Super Admin puede gestionar roles protegidos';
  END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_protected
  ) THEN
    RAISE EXCEPTION 'El usuario tiene un rol protegido';
  END IF;

  IF p_role_code IN ('funcionario_mincit', 'camara_comercio')
     AND EXISTS (
       SELECT 1
       FROM public.turismo_user_roles ur
       JOIN public.turismo_roles r ON r.id = ur.role_id
       WHERE ur.user_id = p_user_id
         AND ur.is_active
         AND r.is_active
         AND r.is_system = FALSE
         AND r.code = CASE p_role_code
           WHEN 'funcionario_mincit' THEN 'camara_comercio'
           ELSE 'funcionario_mincit'
         END
     ) THEN
    RAISE EXCEPTION 'Los roles MinCIT/FONTUR y Cámara de Comercio son mutuamente excluyentes';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_active
      AND r.is_system = FALSE
      AND r.code = 'desarrollador'
  ) INTO has_devops;

  IF p_role_code = 'desarrollador' AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_active
      AND r.is_system = FALSE
      AND r.code NOT IN ('usuario', 'desarrollador')
  ) THEN
    RAISE EXCEPTION 'DevOps debe permanecer aislado de los roles de negocio';
  END IF;
  IF has_devops AND p_role_code NOT IN ('usuario', 'desarrollador') THEN
    RAISE EXCEPTION 'DevOps no puede coexistir con roles de negocio';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND ur.is_primary
      AND r.is_active
      AND r.is_system = FALSE
  ) INTO has_primary_human;

  IF p_make_primary OR NOT has_primary_human THEN
    UPDATE public.turismo_user_roles
    SET is_primary = FALSE
    WHERE user_id = p_user_id
      AND is_active;
  END IF;

  INSERT INTO public.turismo_user_roles(user_id, role_id, is_active, is_primary, assigned_by)
  VALUES (p_user_id, target_role.id, TRUE, (p_make_primary OR NOT has_primary_human), auth.uid())
  ON CONFLICT (user_id, role_id) DO UPDATE SET
    is_active = TRUE,
    is_primary = CASE
      WHEN p_make_primary OR NOT has_primary_human THEN TRUE
      ELSE public.turismo_user_roles.is_primary
    END,
    assigned_by = auth.uid(),
    assigned_at = NOW();

  PERFORM public.turismo_initialize_user_role_extension(p_user_id, target_role.code);
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_role_assigned', p_user_id::TEXT,
    jsonb_build_object('role_code', target_role.code, 'make_primary', p_make_primary));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_revoke_user_role(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_id UUID;
  was_primary BOOLEAN;
  remaining INTEGER;
  caller_is_super BOOLEAN;
  target_protected BOOLEAN;
  target_system BOOLEAN;
  fallback_role_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar usuarios';
  END IF;
  IF p_role_code = 'usuario' THEN
    RAISE EXCEPTION 'El rol Usuario es el rol base de las cuentas humanas y no puede revocarse';
  END IF;

  SELECT r.id, ur.is_primary, r.is_protected, r.is_system
  INTO target_id, was_primary, target_protected, target_system
  FROM public.turismo_user_roles ur
  JOIN public.turismo_roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND r.code = p_role_code
    AND ur.is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El rol no está asignado';
  END IF;

  caller_is_super := public.turismo_is_super_admin();
  IF (target_protected OR target_system) AND NOT caller_is_super THEN
    RAISE EXCEPTION 'Solo Super Admin puede gestionar roles protegidos o del sistema';
  END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_protected
  ) THEN
    RAISE EXCEPTION 'El usuario tiene un rol protegido';
  END IF;

  SELECT COUNT(*) INTO remaining
  FROM public.turismo_user_roles
  WHERE user_id = p_user_id
    AND is_active;
  IF NOT target_system AND remaining <= 1 THEN
    RAISE EXCEPTION 'El usuario debe conservar el rol base Usuario';
  END IF;

  IF was_primary OR NOT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND ur.is_primary
      AND r.is_active
      AND r.is_system = FALSE
  ) THEN
    SELECT ur.role_id INTO fallback_role_id
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND ur.role_id <> target_id
      AND r.is_active
      AND r.is_system = FALSE
    ORDER BY CASE WHEN r.code = 'usuario' THEN 0 ELSE 1 END, ur.assigned_at ASC, ur.role_id
    LIMIT 1;
    IF fallback_role_id IS NULL AND NOT target_system THEN
      RAISE EXCEPTION 'No existe un rol humano activo utilizable para el rol principal';
    END IF;
  END IF;

  UPDATE public.turismo_user_roles
  SET is_active = FALSE, is_primary = FALSE
  WHERE user_id = p_user_id
    AND role_id = target_id;

  IF was_primary OR NOT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND ur.is_primary
      AND r.is_active
      AND r.is_system = FALSE
  ) THEN
    UPDATE public.turismo_user_roles
    SET is_primary = FALSE
    WHERE user_id = p_user_id
      AND is_active;
    IF fallback_role_id IS NOT NULL THEN
      UPDATE public.turismo_user_roles
      SET is_primary = TRUE
      WHERE user_id = p_user_id
        AND role_id = fallback_role_id
        AND is_active;
    END IF;
  END IF;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_role_revoked', p_user_id::TEXT,
    jsonb_build_object('role_code', p_role_code, 'was_primary', was_primary));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_primary_user_role(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_role_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el rol principal';
  END IF;
  IF NOT public.turismo_is_super_admin() AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_protected
  ) THEN
    RAISE EXCEPTION 'El usuario tiene un rol protegido';
  END IF;

  SELECT r.id INTO target_role_id
  FROM public.turismo_user_roles ur
  JOIN public.turismo_roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
    AND r.is_active = TRUE
    AND r.is_system = FALSE
    AND r.code = p_role_code;
  IF target_role_id IS NULL THEN
    RAISE EXCEPTION 'El rol no está asignado activamente o es un rol de sistema';
  END IF;

  UPDATE public.turismo_user_roles
  SET is_primary = FALSE
  WHERE user_id = p_user_id
    AND is_active;
  UPDATE public.turismo_user_roles
  SET is_primary = TRUE
  WHERE user_id = p_user_id
    AND role_id = target_role_id
    AND is_active;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_primary_role_changed', p_user_id::TEXT,
    jsonb_build_object('role_code', p_role_code));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_role_permissions(p_role_code TEXT, p_permission_codes TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  role_row public.turismo_roles%ROWTYPE;
  caller_is_super BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('roles:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar permisos';
  END IF;
  SELECT * INTO role_row FROM public.turismo_roles WHERE code = p_role_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rol no encontrado';
  END IF;
  IF p_role_code = 'usuario' THEN
    RAISE EXCEPTION 'Los permisos del rol base Usuario son inmutables';
  END IF;
  IF role_row.is_system THEN
    RAISE EXCEPTION 'Rol de sistema';
  END IF;
  caller_is_super := public.turismo_is_super_admin();
  IF role_row.is_protected AND NOT caller_is_super THEN
    RAISE EXCEPTION 'Rol protegido';
  END IF;
  IF p_role_code = 'super_admin' THEN
    RAISE EXCEPTION 'Los permisos de Super Admin son inmutables';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code) WHERE x.code = '*'
  ) THEN
    RAISE EXCEPTION 'El permiso * está reservado para super_admin';
  END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code)
    WHERE x.code NOT IN ('platform:read','content:moderate','content:approve','content:reject','provider:catalog_manage','provider:offers_manage','provider:bookings_view','provider:finances_view','tourist:book','tourist:review','tourist:profile','support:tickets_manage','support:refund_issue','bi:analytics_read','bi:reports_export','ambassador:referral_manage','ambassador:commissions_view')
  ) THEN
    RAISE EXCEPTION 'El permiso no está permitido para un administrador';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code)
    WHERE NOT EXISTS (SELECT 1 FROM public.turismo_permissions p WHERE p.code = x.code)
  ) THEN
    RAISE EXCEPTION 'Permiso inexistente';
  END IF;

  DELETE FROM public.turismo_role_permissions WHERE role_id = role_row.id;
  INSERT INTO public.turismo_role_permissions(role_id, permission_code)
  SELECT role_row.id, code
  FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'role_permissions_changed', p_role_code,
    jsonb_build_object('role_code', p_role_code, 'permission_codes', COALESCE(p_permission_codes, ARRAY[]::TEXT[])));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_role_status(p_role_code TEXT, p_is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_role_id UUID;
  target_user_id UUID;
  fallback_role_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_is_super_admin() THEN
    RAISE EXCEPTION 'Solo Super Admin puede activar roles';
  END IF;
  SELECT id INTO target_role_id FROM public.turismo_roles WHERE code = p_role_code;
  IF target_role_id IS NULL THEN
    RAISE EXCEPTION 'Rol no encontrado';
  END IF;
  IF p_role_code = 'usuario' AND NOT p_is_active THEN
    RAISE EXCEPTION 'El rol base Usuario no puede desactivarse';
  END IF;
  IF p_role_code = 'super_admin' AND NOT p_is_active THEN
    RAISE EXCEPTION 'Super Admin no puede desactivarse';
  END IF;

  UPDATE public.turismo_roles
  SET is_active = p_is_active, updated_at = NOW()
  WHERE id = target_role_id;

  IF NOT p_is_active THEN
    FOR target_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.turismo_user_roles ur
      WHERE ur.role_id = target_role_id
        AND ur.is_active
        AND ur.is_primary
    LOOP
      UPDATE public.turismo_user_roles
      SET is_primary = FALSE
      WHERE user_id = target_user_id
        AND is_active;

      SELECT ur.role_id INTO fallback_role_id
      FROM public.turismo_user_roles ur
      JOIN public.turismo_roles r ON r.id = ur.role_id
      WHERE ur.user_id = target_user_id
        AND ur.is_active
        AND r.is_active
        AND r.is_system = FALSE
      ORDER BY CASE WHEN r.code = 'usuario' THEN 0 ELSE 1 END, ur.assigned_at ASC, ur.role_id
      LIMIT 1;

      IF fallback_role_id IS NOT NULL THEN
        UPDATE public.turismo_user_roles
        SET is_primary = TRUE
        WHERE user_id = target_user_id
          AND role_id = fallback_role_id
          AND is_active;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'role_status_changed', p_role_code,
    jsonb_build_object('role_code', p_role_code, 'is_active', p_is_active));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_own_provider_profile(
  p_ruc TEXT, p_razon_social TEXT, p_nombre_comercial TEXT, p_sub_type TEXT, p_org_role TEXT,
  p_rnt_number TEXT, p_address TEXT, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION,
  p_website_url TEXT, p_social_links JSONB, p_specific_metadata JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_role('prestador_turistico') THEN
    RAISE EXCEPTION 'El usuario no tiene rol de Prestador Turístico';
  END IF;
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
    nombre_comercial = EXCLUDED.nombre_comercial,
    sub_type = EXCLUDED.sub_type,
    org_role = EXCLUDED.org_role,
    rnt_number = EXCLUDED.rnt_number,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    website_url = EXCLUDED.website_url,
    social_links = EXCLUDED.social_links,
    specific_metadata = EXCLUDED.specific_metadata,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_tourist_preferences(p_preferences TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cleaned TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista') THEN
    RAISE EXCEPTION 'Solo un turista activo puede actualizar sus preferencias';
  END IF;
  IF COALESCE(array_length(p_preferences, 1), 0) > 9 THEN
    RAISE EXCEPTION 'Puedes seleccionar máximo 9 intereses';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_preferences, ARRAY[]::TEXT[])) value
    WHERE LOWER(TRIM(value)) NOT IN ('naturaleza','aventura','gastronomia','cultura','descanso','familia','artesania','eventos','alojamiento')
  ) THEN
    RAISE EXCEPTION 'Una preferencia no pertenece al vocabulario permitido';
  END IF;
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::TEXT[]) INTO cleaned
  FROM (
    SELECT DISTINCT LOWER(TRIM(value)) AS value
    FROM unnest(COALESCE(p_preferences, ARRAY[]::TEXT[])) value
    WHERE NULLIF(TRIM(value), '') IS NOT NULL
  ) values_table;
  UPDATE public.turismo_tourist_profiles
  SET travel_preferences = cleaned, updated_at = NOW()
  WHERE profile_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO public.turismo_tourist_profiles(profile_id, travel_preferences)
    VALUES (auth.uid(), cleaned);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_save_itinerary(
  p_name TEXT, p_days INTEGER, p_interests TEXT[], p_budget_level TEXT, p_items JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  itinerary_id UUID;
  item_record RECORD;
  clean_interests TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista') THEN
    RAISE EXCEPTION 'Solo un turista activo puede guardar itinerarios';
  END IF;
  IF NULLIF(TRIM(p_name), '') IS NULL THEN RAISE EXCEPTION 'El nombre del itinerario es obligatorio'; END IF;
  IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'El itinerario debe tener entre 1 y 7 días'; END IF;
  IF p_budget_level NOT IN ('economico','moderado','premium','flexible') THEN RAISE EXCEPTION 'Presupuesto inválido'; END IF;
  IF COALESCE(array_length(p_interests, 1), 0) > 9 THEN RAISE EXCEPTION 'Puedes seleccionar máximo 9 intereses'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_interests, ARRAY[]::TEXT[])) value WHERE LOWER(TRIM(value)) NOT IN ('naturaleza','aventura','gastronomia','cultura','descanso','familia','artesania','eventos','alojamiento')) THEN RAISE EXCEPTION 'Un interés no es válido'; END IF;
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::TEXT[]) INTO clean_interests
  FROM (SELECT DISTINCT LOWER(TRIM(value)) value FROM unnest(COALESCE(p_interests, ARRAY[]::TEXT[])) value WHERE NULLIF(TRIM(value),'') IS NOT NULL) values_table;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'Los elementos del itinerario deben ser un arreglo'; END IF;
  FOR item_record IN SELECT * FROM jsonb_to_recordset(p_items) AS x(catalog_item_id UUID, day_number INTEGER, slot TEXT, position INTEGER) LOOP
    IF item_record.catalog_item_id IS NULL OR item_record.day_number IS NULL OR item_record.day_number NOT BETWEEN 1 AND p_days OR item_record.slot NOT IN ('morning','midday','afternoon','evening') OR COALESCE(item_record.position, 0) < 0 THEN RAISE EXCEPTION 'Un elemento del itinerario tiene una estructura inválida'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = item_record.catalog_item_id AND status = 'published') THEN RAISE EXCEPTION 'Todos los elementos deben pertenecer al catálogo publicado'; END IF;
  END LOOP;
  INSERT INTO public.turismo_itineraries(tourist_id, name, days, interests, budget_level) VALUES (auth.uid(), TRIM(p_name), p_days, clean_interests, p_budget_level) RETURNING id INTO itinerary_id;
  INSERT INTO public.turismo_itinerary_items(itinerary_id, catalog_item_id, day_number, slot, position)
  SELECT itinerary_id, x.catalog_item_id, x.day_number, x.slot, COALESCE(x.position, 0) FROM jsonb_to_recordset(p_items) AS x(catalog_item_id UUID, day_number INTEGER, slot TEXT, position INTEGER);
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'itinerary_saved', itinerary_id::TEXT, jsonb_build_object('days', p_days, 'items', jsonb_array_length(p_items)));
  RETURN itinerary_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_delete_itinerary(p_itinerary_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista') THEN
    RAISE EXCEPTION 'Solo un turista activo puede eliminar itinerarios';
  END IF;
  DELETE FROM public.turismo_itineraries
  WHERE id = p_itinerary_id
    AND tourist_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Itinerario no encontrado o no te pertenece'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'itinerary_deleted', p_itinerary_id::TEXT, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_system_health()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT (public.turismo_current_user_has_permission('devops:infra_manage') OR public.turismo_is_super_admin()) THEN
    RAISE EXCEPTION 'No tienes permiso para consultar la salud del sistema';
  END IF;
  RETURN jsonb_build_object(
    'database_time', NOW(),
    'active_users', (SELECT COUNT(*) FROM public.turismo_profiles WHERE is_active),
    'active_roles', (SELECT COUNT(*) FROM public.turismo_user_roles WHERE is_active),
    'published_catalog', (SELECT COUNT(*) FROM public.turismo_catalog_items WHERE status = 'published'),
    'open_support_tickets', (SELECT COUNT(*) FROM public.turismo_support_tickets WHERE status IN ('open','in_progress','waiting_user')),
    'pending_catalog_moderation', (SELECT COUNT(*) FROM public.turismo_catalog_items WHERE status = 'pending_review'),
    'pending_reviews', (SELECT COUNT(*) FROM public.turismo_reviews WHERE status = 'pending'),
    'pending_deletion_requests', (SELECT COUNT(*) FROM public.turismo_account_deletion_requests WHERE status = 'pending'),
    'latest_audit_event_at', (SELECT MAX(created_at) FROM public.turismo_audit_logs),
    'notification_count_24h', (SELECT COUNT(*) FROM public.turismo_notifications WHERE created_at >= NOW() - INTERVAL '24 hours'),
    'schema_version', (SELECT COALESCE(MAX(version), 0) FROM public.turismo_schema_version)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.turismo_initialize_user_role_extension(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.turismo_handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.turismo_assign_user_role(UUID, TEXT, BOOLEAN), public.turismo_revoke_user_role(UUID, TEXT), public.turismo_set_primary_user_role(UUID, TEXT), public.turismo_set_role_permissions(TEXT, TEXT[]), public.turismo_set_role_status(TEXT, BOOLEAN), public.turismo_update_own_provider_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, JSONB, JSONB), public.turismo_update_tourist_preferences(TEXT[]), public.turismo_save_itinerary(TEXT, INTEGER, TEXT[], TEXT, JSONB), public.turismo_delete_itinerary(UUID), public.turismo_get_system_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_assign_user_role(UUID, TEXT, BOOLEAN), public.turismo_revoke_user_role(UUID, TEXT), public.turismo_set_primary_user_role(UUID, TEXT), public.turismo_set_role_permissions(TEXT, TEXT[]), public.turismo_set_role_status(TEXT, BOOLEAN), public.turismo_update_own_provider_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, JSONB, JSONB), public.turismo_update_tourist_preferences(TEXT[]), public.turismo_save_itinerary(TEXT, INTEGER, TEXT[], TEXT, JSONB), public.turismo_delete_itinerary(UUID), public.turismo_get_system_health() TO authenticated;

INSERT INTO public.turismo_schema_version(version, migration_name)
VALUES (14, '14_default_user_role_and_role_switching.sql'),
       (15, '15_final_account_rbac_hardening.sql')
ON CONFLICT (version) DO UPDATE SET migration_name = EXCLUDED.migration_name;
COMMIT;
