-- Turismo Cajamarca: la cuenta es la persona; los roles son capacidades/personas.
-- Ejecutar después de las migraciones 08 a 15 en bases existentes.
BEGIN;

UPDATE public.turismo_roles
SET name = 'Usuario legado',
    description = 'Rol histórico de compatibilidad. Las nuevas cuentas utilizan el rol Turista.',
    is_active = TRUE,
    is_protected = FALSE,
    is_system = FALSE,
    updated_at = NOW()
WHERE code = 'usuario';

UPDATE public.turismo_roles
SET name = 'Turista',
    description = 'Usuario final que explora, planifica y reserva experiencias turísticas.',
    updated_at = NOW()
WHERE code = 'turista';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.turismo_roles
    WHERE code = 'usuario' AND is_active AND NOT is_protected AND NOT is_system
  ) THEN
    RAISE EXCEPTION 'No se pudo conservar el rol legado Usuario';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.turismo_roles
    WHERE code = 'turista' AND is_active AND NOT is_system
  ) THEN
    RAISE EXCEPTION 'El rol Turista debe existir y estar activo para corregir el modelo de cuentas';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_role_has_dashboard(p_role_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT COALESCE(p_role_code = ANY (ARRAY[
    'turista', 'prestador_turistico', 'admin', 'super_admin', 'moderador',
    'auditor', 'soporte', 'analista_datos', 'desarrollador', 'embajador',
    'afiliado', 'funcionario_mincit', 'camara_comercio'
  ]::TEXT[]), FALSE);
$$;

-- Reconcile legacy Usuario data without guessing which side of a mixed
-- system/human identity is erroneous. Mixed assignments remain for review.
DO $$
DECLARE
  mixed_system_human_accounts_detected INTEGER := 0;
  affiliate_without_tourist_detected INTEGER := 0;
  tourist_assignments_reconciled INTEGER;
  usuario_assignments_removed INTEGER;
  usuario_permissions_removed INTEGER;
  affiliate_tourist_permissions_removed INTEGER;
  invalid_primaries_cleared INTEGER;
  primary_assignments_repaired INTEGER := 0;
  target_user_id UUID;
  valid_primary_role_id UUID;
  fallback_role_id UUID;
BEGIN
  SELECT COUNT(*)::INTEGER INTO mixed_system_human_accounts_detected
  FROM (
    SELECT ur.user_id
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.is_active
    GROUP BY ur.user_id
    HAVING BOOL_OR(r.is_system) AND BOOL_OR(NOT r.is_system)
  ) mixed_accounts;

  SELECT COUNT(DISTINCT ur.user_id)::INTEGER INTO affiliate_without_tourist_detected
  FROM public.turismo_user_roles ur
  JOIN public.turismo_roles growth_role ON growth_role.id = ur.role_id
  WHERE ur.is_active AND growth_role.is_active
    AND growth_role.code IN ('afiliado', 'embajador')
    AND NOT EXISTS (
      SELECT 1
      FROM public.turismo_user_roles tourist_assignment
      JOIN public.turismo_roles tourist_role ON tourist_role.id = tourist_assignment.role_id
      WHERE tourist_assignment.user_id = ur.user_id
        AND tourist_assignment.is_active
        AND tourist_role.is_active
        AND tourist_role.code = 'turista'
        AND NOT tourist_role.is_system
    );

  DELETE FROM public.turismo_role_permissions rp
  USING public.turismo_roles r
  WHERE rp.role_id = r.id AND r.code = 'usuario';
  GET DIAGNOSTICS usuario_permissions_removed = ROW_COUNT;

  DELETE FROM public.turismo_role_permissions rp
  USING public.turismo_roles r
  WHERE rp.role_id = r.id
    AND r.code IN ('afiliado', 'embajador')
    AND rp.permission_code IN ('tourist:book', 'tourist:review', 'tourist:profile');
  GET DIAGNOSTICS affiliate_tourist_permissions_removed = ROW_COUNT;

  CREATE TEMP TABLE _turismo_m16_usuario_accounts ON COMMIT DROP AS
  SELECT DISTINCT ur.user_id
  FROM public.turismo_user_roles ur
  JOIN public.turismo_roles usuario_role ON usuario_role.id = ur.role_id
  WHERE ur.is_active
    AND usuario_role.code = 'usuario'
    AND NOT EXISTS (
      SELECT 1
      FROM public.turismo_user_roles system_assignment
      JOIN public.turismo_roles system_role ON system_role.id = system_assignment.role_id
      WHERE system_assignment.user_id = ur.user_id
        AND system_assignment.is_active
        AND system_role.is_system
    );

  CREATE TEMP TABLE _turismo_m16_usuario_only ON COMMIT DROP AS
  SELECT legacy.user_id
  FROM _turismo_m16_usuario_accounts legacy
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles other_assignment
    JOIN public.turismo_roles other_role ON other_role.id = other_assignment.role_id
    WHERE other_assignment.user_id = legacy.user_id
      AND other_assignment.is_active
      AND other_role.is_active
      AND NOT other_role.is_system
      AND other_role.code <> 'usuario'
  );

  -- A legacy-only account becomes a Turista account. Clear the old primary
  -- first so the partial unique index remains valid during the upsert.
  UPDATE public.turismo_user_roles assignment
  SET is_primary = FALSE
  WHERE assignment.user_id IN (SELECT user_id FROM _turismo_m16_usuario_only)
    AND assignment.is_active
    AND assignment.is_primary;

  INSERT INTO public.turismo_user_roles(user_id, role_id, is_active, is_primary)
  SELECT only_account.user_id, tourist_role.id, TRUE, TRUE
  FROM _turismo_m16_usuario_only only_account
  CROSS JOIN public.turismo_roles tourist_role
  WHERE tourist_role.code = 'turista'
    AND tourist_role.is_active
    AND NOT tourist_role.is_system
  ON CONFLICT (user_id, role_id) DO UPDATE
    SET is_active = TRUE, is_primary = TRUE;

  GET DIAGNOSTICS tourist_assignments_reconciled = ROW_COUNT;

  INSERT INTO public.turismo_tourist_profiles(profile_id)
  SELECT user_id FROM _turismo_m16_usuario_only
  ON CONFLICT (profile_id) DO NOTHING;

  UPDATE public.turismo_user_roles assignment
  SET is_active = FALSE, is_primary = FALSE
  FROM public.turismo_roles legacy_role
  WHERE assignment.role_id = legacy_role.id
    AND legacy_role.code = 'usuario'
    AND assignment.is_active
    AND assignment.user_id IN (SELECT user_id FROM _turismo_m16_usuario_accounts);
  GET DIAGNOSTICS usuario_assignments_removed = ROW_COUNT;

  UPDATE public.turismo_user_roles assignment
  SET is_primary = FALSE
  FROM public.turismo_roles assigned_role
  WHERE assignment.role_id = assigned_role.id
    AND assignment.is_active
    AND assignment.is_primary
    AND NOT EXISTS (
      SELECT 1
      FROM public.turismo_user_roles system_assignment
      JOIN public.turismo_roles system_role ON system_role.id = system_assignment.role_id
      WHERE system_assignment.user_id = assignment.user_id
        AND system_assignment.is_active
        AND system_role.is_system
    )
    AND (
      NOT assigned_role.is_active
      OR assigned_role.is_system
      OR assigned_role.code = 'usuario'
      OR NOT public.turismo_role_has_dashboard(assigned_role.code)
      OR (
        assigned_role.code IN ('afiliado', 'embajador')
        AND NOT EXISTS (
          SELECT 1
          FROM public.turismo_user_roles tourist_assignment
          JOIN public.turismo_roles tourist_role ON tourist_role.id = tourist_assignment.role_id
          WHERE tourist_assignment.user_id = assignment.user_id
            AND tourist_assignment.is_active
            AND tourist_role.is_active
            AND tourist_role.code = 'turista'
            AND NOT tourist_role.is_system
        )
      )
    );
  GET DIAGNOSTICS invalid_primaries_cleared = ROW_COUNT;

  -- Keep an existing valid primary. If the legacy assignment was primary (or
  -- the old primary has no dashboard), choose Turista, then the oldest routed
  -- active non-system role.
  FOR target_user_id IN
    SELECT p.id
    FROM public.turismo_profiles p
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.turismo_user_roles system_assignment
      JOIN public.turismo_roles system_role ON system_role.id = system_assignment.role_id
      WHERE system_assignment.user_id = p.id
        AND system_assignment.is_active
        AND system_role.is_system
    )
  LOOP
    SELECT ur.role_id INTO valid_primary_role_id
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = target_user_id
      AND ur.is_active
      AND ur.is_primary
      AND r.is_active
      AND NOT r.is_system
      AND r.code <> 'usuario'
      AND public.turismo_role_has_dashboard(r.code)
      AND (
        r.code NOT IN ('afiliado', 'embajador')
        OR EXISTS (
          SELECT 1
          FROM public.turismo_user_roles tourist_assignment
          JOIN public.turismo_roles tourist_role ON tourist_role.id = tourist_assignment.role_id
          WHERE tourist_assignment.user_id = ur.user_id
            AND tourist_assignment.is_active
            AND tourist_role.is_active
            AND tourist_role.code = 'turista'
            AND NOT tourist_role.is_system
        )
      )
    LIMIT 1;

    IF valid_primary_role_id IS NULL THEN
      UPDATE public.turismo_user_roles
      SET is_primary = FALSE
      WHERE user_id = target_user_id AND is_active AND is_primary;

      SELECT ur.role_id INTO fallback_role_id
      FROM public.turismo_user_roles ur
      JOIN public.turismo_roles r ON r.id = ur.role_id
      WHERE ur.user_id = target_user_id
        AND ur.is_active
        AND r.is_active
        AND NOT r.is_system
        AND r.code <> 'usuario'
        AND public.turismo_role_has_dashboard(r.code)
        AND (
          r.code NOT IN ('afiliado', 'embajador')
          OR EXISTS (
            SELECT 1
            FROM public.turismo_user_roles tourist_assignment
            JOIN public.turismo_roles tourist_role ON tourist_role.id = tourist_assignment.role_id
            WHERE tourist_assignment.user_id = ur.user_id
              AND tourist_assignment.is_active
              AND tourist_role.is_active
              AND tourist_role.code = 'turista'
              AND NOT tourist_role.is_system
          )
        )
      ORDER BY CASE WHEN r.code = 'turista' THEN 0 ELSE 1 END,
               ur.assigned_at ASC, ur.role_id
      LIMIT 1;

      IF fallback_role_id IS NOT NULL THEN
        UPDATE public.turismo_user_roles
        SET is_primary = TRUE
        WHERE user_id = target_user_id
          AND role_id = fallback_role_id
          AND is_active;
        primary_assignments_repaired := primary_assignments_repaired + 1;
      END IF;
    END IF;
  END LOOP;

  IF mixed_system_human_accounts_detected > 0
     OR affiliate_without_tourist_detected > 0
     OR tourist_assignments_reconciled > 0
     OR usuario_assignments_removed > 0
     OR usuario_permissions_removed > 0
     OR affiliate_tourist_permissions_removed > 0
     OR invalid_primaries_cleared > 0
     OR primary_assignments_repaired > 0 THEN
    INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
    VALUES (
      NULL,
      'rbac_legacy_usuario_reconciled',
      'migration:16_correct_account_role_semantics.sql',
      jsonb_build_object(
        'mixed_system_human_accounts_detected', mixed_system_human_accounts_detected,
        'affiliate_without_tourist_detected', affiliate_without_tourist_detected,
        'tourist_assignments_reconciled', tourist_assignments_reconciled,
        'usuario_assignments_deactivated', usuario_assignments_removed,
        'usuario_permissions_removed', usuario_permissions_removed,
        'affiliate_tourist_permissions_removed', affiliate_tourist_permissions_removed,
        'invalid_primaries_cleared', invalid_primaries_cleared,
        'primary_assignments_repaired', primary_assignments_repaired
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tourist_role_id UUID;
BEGIN
  INSERT INTO public.turismo_profiles(
    id, email, full_name, phone, document_type, document_number, is_active, is_verified
  )
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

  SELECT id INTO tourist_role_id
  FROM public.turismo_roles
  WHERE code = 'turista' AND is_active AND NOT is_system;
  IF tourist_role_id IS NULL THEN
    RAISE EXCEPTION 'El rol Turista no existe o está inactivo; no se puede crear la cuenta';
  END IF;

  INSERT INTO public.turismo_user_roles(user_id, role_id, is_active, is_primary)
  VALUES (NEW.id, tourist_role_id, TRUE, TRUE)
  ON CONFLICT (user_id, role_id) DO UPDATE
    SET is_active = TRUE, is_primary = TRUE;

  PERFORM public.turismo_initialize_user_role_extension(NEW.id, 'turista');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_turismo ON auth.users;
CREATE TRIGGER on_auth_user_created_turismo
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.turismo_handle_new_user();

CREATE OR REPLACE FUNCTION public.turismo_assign_user_role(
  p_user_id UUID, p_role_code TEXT, p_make_primary BOOLEAN DEFAULT FALSE
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_role public.turismo_roles%ROWTYPE;
  has_primary_routed_role BOOLEAN;
  has_devops BOOLEAN;
  caller_is_super BOOLEAN;
  make_primary BOOLEAN := COALESCE(p_make_primary, FALSE);
  assign_as_primary BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar usuarios';
  END IF;
  IF p_role_code = 'usuario' THEN
    RAISE EXCEPTION 'El rol Usuario es legado y no admite nuevas asignaciones';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'La cuenta objetivo no existe';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_system
  ) THEN
    RAISE EXCEPTION 'Las identidades de sistema no pueden recibir roles humanos';
  END IF;

  SELECT * INTO target_role
  FROM public.turismo_roles
  WHERE code = p_role_code AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'El rol no existe o está inactivo'; END IF;
  IF target_role.is_system THEN RAISE EXCEPTION 'Los roles de sistema no se asignan a personas'; END IF;
  IF p_role_code IN ('afiliado', 'embajador') AND NOT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_active
      AND r.code = 'turista' AND NOT r.is_system
  ) THEN
    RAISE EXCEPTION 'Afiliado y Embajador requieren que la cuenta tenga también el rol Turista';
  END IF;
  IF make_primary AND NOT public.turismo_role_has_dashboard(target_role.code) THEN
    RAISE EXCEPTION 'El rol no tiene un panel asociado y no puede ser principal';
  END IF;

  caller_is_super := public.turismo_is_super_admin();
  IF target_role.is_protected AND NOT caller_is_super THEN
    RAISE EXCEPTION 'Solo Super Admin puede gestionar roles protegidos';
  END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_protected
  ) THEN RAISE EXCEPTION 'El usuario tiene un rol protegido'; END IF;

  IF p_role_code IN ('funcionario_mincit', 'camara_comercio')
     AND EXISTS (
       SELECT 1 FROM public.turismo_user_roles ur
       JOIN public.turismo_roles r ON r.id = ur.role_id
       WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_active
         AND NOT r.is_system
         AND r.code = CASE p_role_code
           WHEN 'funcionario_mincit' THEN 'camara_comercio'
           ELSE 'funcionario_mincit'
         END
     ) THEN
    RAISE EXCEPTION 'Los roles MinCIT/FONTUR y Cámara de Comercio son mutuamente excluyentes';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_active
      AND NOT r.is_system AND r.code = 'desarrollador'
  ) INTO has_devops;
  IF p_role_code = 'desarrollador' AND EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_active
      AND NOT r.is_system AND r.code <> 'desarrollador'
  ) THEN RAISE EXCEPTION 'DevOps debe permanecer aislado de los roles de negocio'; END IF;
  IF has_devops AND p_role_code <> 'desarrollador' THEN
    RAISE EXCEPTION 'DevOps no puede coexistir con roles de negocio';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND ur.is_primary
      AND r.is_active AND NOT r.is_system
      AND public.turismo_role_has_dashboard(r.code)
  ) INTO has_primary_routed_role;

  assign_as_primary := make_primary
    OR (NOT has_primary_routed_role AND public.turismo_role_has_dashboard(target_role.code));
  IF assign_as_primary THEN
    UPDATE public.turismo_user_roles
    SET is_primary = FALSE
    WHERE user_id = p_user_id AND is_active;
  END IF;

  INSERT INTO public.turismo_user_roles(user_id, role_id, is_active, is_primary, assigned_by)
  VALUES (p_user_id, target_role.id, TRUE, assign_as_primary, auth.uid())
  ON CONFLICT (user_id, role_id) DO UPDATE SET
    is_active = TRUE,
    is_primary = CASE
      WHEN assign_as_primary THEN TRUE
      WHEN NOT public.turismo_role_has_dashboard(target_role.code) THEN FALSE
      ELSE public.turismo_user_roles.is_primary
    END,
    assigned_by = auth.uid(),
    assigned_at = NOW();

  PERFORM public.turismo_initialize_user_role_extension(p_user_id, target_role.code);
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_role_assigned', p_user_id::TEXT,
    jsonb_build_object('role_code', target_role.code, 'make_primary', assign_as_primary));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_revoke_user_role(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_id UUID;
  was_primary BOOLEAN;
  caller_is_super BOOLEAN;
  target_protected BOOLEAN;
  target_system BOOLEAN;
  fallback_role_id UUID;
  valid_primary_exists BOOLEAN;
  active_super_admin_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar usuarios';
  END IF;

  SELECT r.id, ur.is_primary, r.is_protected, r.is_system
  INTO target_id, was_primary, target_protected, target_system
  FROM public.turismo_user_roles ur
  JOIN public.turismo_roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND r.code = p_role_code AND ur.is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'El rol no está asignado activamente'; END IF;

  caller_is_super := public.turismo_is_super_admin();
  IF (target_protected OR target_system) AND NOT caller_is_super THEN
    RAISE EXCEPTION 'Solo Super Admin puede gestionar roles protegidos o del sistema';
  END IF;
  IF p_role_code = 'turista' AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_active
      AND r.code IN ('afiliado', 'embajador')
  ) THEN
    RAISE EXCEPTION 'No puedes retirar Turista mientras la cuenta tenga Afiliado o Embajador';
  END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_protected
  ) THEN RAISE EXCEPTION 'El usuario tiene un rol protegido'; END IF;

  IF p_role_code = 'super_admin'
     AND EXISTS (SELECT 1 FROM public.turismo_profiles WHERE id = p_user_id AND is_active) THEN
    SELECT COUNT(DISTINCT ur.user_id) INTO active_super_admin_count
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id AND r.is_active
    JOIN public.turismo_profiles p ON p.id = ur.user_id AND p.is_active
    WHERE ur.is_active AND r.code = 'super_admin';
    IF active_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'La plataforma debe conservar al menos un Super Admin activo';
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND ur.is_primary
      AND r.is_active AND NOT r.is_system
      AND r.code <> 'usuario'
      AND public.turismo_role_has_dashboard(r.code)
      AND (
        r.code NOT IN ('afiliado', 'embajador')
        OR EXISTS (
          SELECT 1
          FROM public.turismo_user_roles tourist_assignment
          JOIN public.turismo_roles tourist_role ON tourist_role.id = tourist_assignment.role_id
          WHERE tourist_assignment.user_id = ur.user_id
            AND tourist_assignment.is_active
            AND tourist_role.is_active
            AND tourist_role.code = 'turista'
            AND NOT tourist_role.is_system
        )
      )
      AND ur.role_id <> target_id
  ) INTO valid_primary_exists;

  IF was_primary OR NOT valid_primary_exists THEN
    SELECT ur.role_id INTO fallback_role_id
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND ur.role_id <> target_id
      AND r.is_active AND NOT r.is_system AND r.code <> 'usuario'
      AND public.turismo_role_has_dashboard(r.code)
      AND (
        r.code NOT IN ('afiliado', 'embajador')
        OR EXISTS (
          SELECT 1
          FROM public.turismo_user_roles tourist_assignment
          JOIN public.turismo_roles tourist_role ON tourist_role.id = tourist_assignment.role_id
          WHERE tourist_assignment.user_id = ur.user_id
            AND tourist_assignment.is_active
            AND tourist_role.is_active
            AND tourist_role.code = 'turista'
            AND NOT tourist_role.is_system
        )
      )
    ORDER BY CASE WHEN r.code = 'turista' THEN 0 ELSE 1 END,
             ur.assigned_at ASC, ur.role_id
    LIMIT 1;
  END IF;

  UPDATE public.turismo_user_roles
  SET is_active = FALSE, is_primary = FALSE
  WHERE user_id = p_user_id AND role_id = target_id;

  IF was_primary OR NOT valid_primary_exists THEN
    UPDATE public.turismo_user_roles
    SET is_primary = FALSE
    WHERE user_id = p_user_id AND is_active AND is_primary;
    IF fallback_role_id IS NOT NULL THEN
      UPDATE public.turismo_user_roles
      SET is_primary = TRUE
      WHERE user_id = p_user_id AND role_id = fallback_role_id AND is_active;
    END IF;
  END IF;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_role_revoked', p_user_id::TEXT,
    jsonb_build_object('role_code', p_role_code, 'was_primary', was_primary));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_primary_user_role(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_role_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el rol principal';
  END IF;
  IF p_role_code = 'usuario' OR NOT public.turismo_role_has_dashboard(p_role_code) THEN
    RAISE EXCEPTION 'El rol no tiene un panel seleccionable como principal';
  END IF;
  IF p_role_code IN ('afiliado', 'embajador') AND NOT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_active
      AND r.code = 'turista' AND NOT r.is_system
  ) THEN
    RAISE EXCEPTION 'Afiliado y Embajador requieren que la cuenta tenga también el rol Turista';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_system
  ) THEN RAISE EXCEPTION 'Las identidades de sistema no tienen roles humanos principales'; END IF;
  IF NOT public.turismo_is_super_admin() AND EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_protected
  ) THEN RAISE EXCEPTION 'El usuario tiene un rol protegido'; END IF;

  SELECT r.id INTO target_role_id
  FROM public.turismo_user_roles ur
  JOIN public.turismo_roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND ur.is_active
    AND r.is_active AND NOT r.is_system AND r.code = p_role_code;
  IF target_role_id IS NULL THEN
    RAISE EXCEPTION 'El rol no está asignado activamente o no tiene un panel';
  END IF;

  UPDATE public.turismo_user_roles SET is_primary = FALSE
  WHERE user_id = p_user_id AND is_active;
  UPDATE public.turismo_user_roles SET is_primary = TRUE
  WHERE user_id = p_user_id AND role_id = target_role_id AND is_active;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_primary_role_changed', p_user_id::TEXT,
    jsonb_build_object('role_code', p_role_code));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_role_permissions(p_role_code TEXT, p_permission_codes TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE role_row public.turismo_roles%ROWTYPE; caller_is_super BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('roles:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar permisos';
  END IF;
  SELECT * INTO role_row FROM public.turismo_roles WHERE code = p_role_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rol no encontrado'; END IF;
  IF p_role_code = 'usuario' THEN
    RAISE EXCEPTION 'El rol Usuario es legado y no admite permisos operativos';
  END IF;
  IF role_row.is_system THEN RAISE EXCEPTION 'Rol de sistema'; END IF;
  caller_is_super := public.turismo_is_super_admin();
  IF role_row.is_protected AND NOT caller_is_super THEN RAISE EXCEPTION 'Rol protegido'; END IF;
  IF p_role_code = 'super_admin' THEN RAISE EXCEPTION 'Los permisos de Super Admin son inmutables'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code) WHERE x.code = '*') THEN
    RAISE EXCEPTION 'El permiso * está reservado para super_admin';
  END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code)
    WHERE x.code NOT IN (
      'platform:read','content:moderate','content:approve','content:reject',
      'provider:catalog_manage','provider:offers_manage','provider:bookings_view',
      'provider:finances_view','tourist:book','tourist:review','tourist:profile',
      'support:tickets_manage','support:refund_issue','bi:analytics_read',
      'bi:reports_export','ambassador:referral_manage','ambassador:commissions_view'
    )
  ) THEN RAISE EXCEPTION 'El permiso no está permitido para un administrador'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code)
    WHERE NOT EXISTS (SELECT 1 FROM public.turismo_permissions p WHERE p.code = x.code)
  ) THEN RAISE EXCEPTION 'Permiso inexistente'; END IF;

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

CREATE OR REPLACE FUNCTION public.turismo_set_user_status(p_user_id UUID, p_is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE active_super_admin_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN
    RAISE EXCEPTION 'No tienes permiso';
  END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'No puedes cambiar tu propio estado'; END IF;
  IF NOT public.turismo_is_super_admin() AND EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_protected
  ) THEN RAISE EXCEPTION 'Usuario protegido'; END IF;

  IF NOT p_is_active AND EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    JOIN public.turismo_profiles target_profile ON target_profile.id = ur.user_id AND target_profile.is_active
    WHERE ur.user_id = p_user_id AND ur.is_active AND r.is_active AND r.code = 'super_admin'
  ) THEN
    SELECT COUNT(DISTINCT ur.user_id) INTO active_super_admin_count
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id AND r.is_active
    JOIN public.turismo_profiles p ON p.id = ur.user_id AND p.is_active
    WHERE ur.is_active AND r.code = 'super_admin';
    IF active_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'La plataforma debe conservar al menos un Super Admin activo';
    END IF;
  END IF;

  UPDATE public.turismo_profiles SET is_active = p_is_active, updated_at = NOW()
  WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_status_changed', p_user_id::TEXT,
    jsonb_build_object('is_active', p_is_active));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_create_role(
  p_code TEXT, p_name TEXT, p_description TEXT, p_badge_color TEXT, p_folder_name TEXT
)
RETURNS public.turismo_roles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  role_row public.turismo_roles%ROWTYPE;
  clean_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_is_super_admin() THEN RAISE EXCEPTION 'Solo Super Admin puede crear roles'; END IF;

  clean_code := TRIM(BOTH '_' FROM TRIM(REGEXP_REPLACE(LOWER(p_code), '[^a-z0-9]+', '_', 'g')));
  IF clean_code = '' THEN RAISE EXCEPTION 'Código de rol inválido'; END IF;
  IF EXISTS (SELECT 1 FROM public.turismo_roles WHERE code = clean_code) THEN
    RAISE EXCEPTION 'El código de rol ya existe';
  END IF;

  INSERT INTO public.turismo_roles(
    code, name, description, badge_color, folder_name, is_active, is_protected, is_system
  )
  VALUES (
    clean_code,
    TRIM(p_name),
    NULLIF(TRIM(p_description), ''),
    COALESCE(NULLIF(p_badge_color, ''), 'bg-slate-500/10 text-slate-300 border-slate-500/20'),
    COALESCE(NULLIF(p_folder_name, ''), clean_code),
    TRUE, FALSE, FALSE
  )
  RETURNING * INTO role_row;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (
    auth.uid(), 'role_created', role_row.code,
    jsonb_build_object('name', role_row.name, 'is_protected', FALSE, 'is_system', FALSE)
  );
  RETURN role_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_role_status(p_role_code TEXT, p_is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_role_id UUID; target_user_id UUID; fallback_role_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_is_super_admin() THEN RAISE EXCEPTION 'Solo Super Admin puede activar roles'; END IF;
  SELECT id INTO target_role_id FROM public.turismo_roles WHERE code = p_role_code;
  IF target_role_id IS NULL THEN RAISE EXCEPTION 'Rol no encontrado'; END IF;
  IF p_role_code = 'super_admin' AND NOT p_is_active THEN
    RAISE EXCEPTION 'El rol Super Admin no puede desactivarse';
  END IF;
  IF p_role_code = 'turista' AND NOT p_is_active THEN
    RAISE EXCEPTION 'El rol Turista no puede desactivarse mientras sea el rol de registro público';
  END IF;

  UPDATE public.turismo_roles SET is_active = p_is_active, updated_at = NOW()
  WHERE id = target_role_id;
  IF NOT p_is_active THEN
    FOR target_user_id IN
      SELECT DISTINCT ur.user_id FROM public.turismo_user_roles ur
      WHERE ur.role_id = target_role_id AND ur.is_active AND ur.is_primary
    LOOP
      UPDATE public.turismo_user_roles SET is_primary = FALSE
      WHERE user_id = target_user_id AND is_active;
      SELECT ur.role_id INTO fallback_role_id
      FROM public.turismo_user_roles ur
      JOIN public.turismo_roles r ON r.id = ur.role_id
      WHERE ur.user_id = target_user_id AND ur.is_active AND r.is_active
        AND NOT r.is_system AND r.code <> 'usuario'
        AND public.turismo_role_has_dashboard(r.code)
      ORDER BY CASE WHEN r.code = 'turista' THEN 0 ELSE 1 END,
               ur.assigned_at ASC, ur.role_id
      LIMIT 1;
      IF fallback_role_id IS NOT NULL THEN
        UPDATE public.turismo_user_roles SET is_primary = TRUE
        WHERE user_id = target_user_id AND role_id = fallback_role_id AND is_active;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'role_status_changed', p_role_code,
    jsonb_build_object('role_code', p_role_code, 'is_active', p_is_active));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_user_is_growth_eligible(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.turismo_profiles p
    WHERE p.id = p_user_id
      AND p.is_active
      AND EXISTS (
        SELECT 1
        FROM public.turismo_user_roles ur
        JOIN public.turismo_roles r ON r.id = ur.role_id
        WHERE ur.user_id = p.id AND ur.is_active AND r.is_active
          AND r.code IN ('afiliado', 'embajador')
      )
      AND EXISTS (
        SELECT 1
        FROM public.turismo_user_roles ur
        JOIN public.turismo_roles r ON r.id = ur.role_id
        WHERE ur.user_id = p.id AND ur.is_active AND r.is_active
          AND r.code = 'turista'
      )
  );
$$;
REVOKE ALL ON FUNCTION public.turismo_user_is_growth_eligible(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.turismo_register_referral_visit(
  p_referral_code TEXT, p_visitor_token TEXT, p_landing_path TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affiliate_id_value UUID;
BEGIN
  IF NOT public.turismo_feature_enabled('referrals_enabled')
     OR public.turismo_maintenance_blocks()
     OR NULLIF(TRIM(p_referral_code), '') IS NULL
     OR NULLIF(TRIM(p_visitor_token), '') IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT a.profile_id INTO affiliate_id_value
  FROM public.turismo_affiliate_profiles a
  WHERE LOWER(a.referral_code) = LOWER(TRIM(p_referral_code))
    AND public.turismo_user_is_growth_eligible(a.profile_id)
  LIMIT 1;
  IF affiliate_id_value IS NULL THEN RETURN FALSE; END IF;
  INSERT INTO public.turismo_referral_visits(affiliate_id, referral_code, visitor_token, landing_path)
  VALUES (affiliate_id_value, TRIM(p_referral_code), TRIM(p_visitor_token), p_landing_path)
  ON CONFLICT (affiliate_id, visitor_token) DO NOTHING;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_affiliate_dashboard()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affiliate_row public.turismo_affiliate_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_user_is_growth_eligible(auth.uid()) THEN
    RAISE EXCEPTION 'El rol Afiliado/Embajador requiere también el rol Turista';
  END IF;
  SELECT * INTO affiliate_row
  FROM public.turismo_affiliate_profiles WHERE profile_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil de afiliado no configurado'; END IF;
  RETURN jsonb_build_object(
    'referral_code', affiliate_row.referral_code,
    'commission_rate', affiliate_row.commission_rate,
    'total_earnings', COALESCE((SELECT SUM(amount) FROM public.turismo_affiliate_commissions WHERE affiliate_id = auth.uid() AND status IN ('earned','paid')), 0),
    'unique_visits', (SELECT COUNT(*) FROM public.turismo_referral_visits WHERE affiliate_id = auth.uid()),
    'referred_reservations', (SELECT COUNT(*) FROM public.turismo_reservations WHERE affiliate_id = auth.uid()),
    'pending_commission', COALESCE((SELECT SUM(amount) FROM public.turismo_affiliate_commissions WHERE affiliate_id = auth.uid() AND status = 'pending'), 0),
    'earned_commission', COALESCE((SELECT SUM(amount) FROM public.turismo_affiliate_commissions WHERE affiliate_id = auth.uid() AND status = 'earned'), 0),
    'paid_commission', COALESCE((SELECT SUM(amount) FROM public.turismo_affiliate_commissions WHERE affiliate_id = auth.uid() AND status = 'paid'), 0),
    'payout_method', affiliate_row.payout_method,
    'recent_commissions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'reservation_id', c.reservation_id, 'catalog_item_title', i.title,
        'status', c.status, 'base_amount', c.base_amount,
        'commission_amount', c.amount, 'created_at', c.created_at
      ) ORDER BY c.created_at DESC)
      FROM public.turismo_affiliate_commissions c
      JOIN public.turismo_reservations r ON r.id = c.reservation_id
      JOIN public.turismo_catalog_items i ON i.id = r.item_id
      WHERE c.affiliate_id = auth.uid()
      LIMIT 10
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_own_affiliate_preferences(
  p_payout_method TEXT, p_payout_account_info JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'La cuenta está inactiva'; END IF;
  IF NOT public.turismo_user_is_growth_eligible(auth.uid()) THEN
    RAISE EXCEPTION 'El rol Afiliado/Embajador requiere también el rol Turista';
  END IF;
  IF p_payout_method IS NOT NULL
     AND p_payout_method NOT IN ('nequi','daviplata','transferencia','yape','plin','cci') THEN
    RAISE EXCEPTION 'Método de pago inválido';
  END IF;
  UPDATE public.turismo_affiliate_profiles
  SET payout_method = p_payout_method,
      payout_account_info = COALESCE(p_payout_account_info, payout_account_info),
      updated_at = NOW()
  WHERE profile_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_create_reservation(
  p_item_id UUID,
  p_reservation_date DATE,
  p_end_date DATE,
  p_guests INTEGER,
  p_notes TEXT,
  p_referral_code TEXT DEFAULT NULL,
  p_promotion_code TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item_row public.turismo_catalog_items%ROWTYPE;
  affiliate_row public.turismo_affiliate_profiles%ROWTYPE;
  promotion_row public.turismo_promotions%ROWTYPE;
  reservation_id UUID;
  day_value DATE;
  requested_end DATE;
  explicit_schedule BOOLEAN;
  availability_row public.turismo_catalog_availability%ROWTYPE;
  existing_guests INTEGER;
  day_count INTEGER;
  available_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista')
     OR NOT public.turismo_current_user_has_permission('tourist:book') THEN
    RAISE EXCEPTION 'No tienes permiso para reservar';
  END IF;
  IF NOT public.turismo_feature_enabled('reservations_enabled') THEN RAISE EXCEPTION 'Las reservas están deshabilitadas temporalmente'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_guests IS NULL OR p_guests < 1 OR p_reservation_date IS NULL OR p_reservation_date < CURRENT_DATE THEN RAISE EXCEPTION 'Datos de reserva inválidos'; END IF;

  requested_end := COALESCE(p_end_date, p_reservation_date);
  IF requested_end < p_reservation_date OR requested_end > p_reservation_date + 30 THEN RAISE EXCEPTION 'El rango de reserva no es válido'; END IF;
  SELECT * INTO item_row FROM public.turismo_catalog_items WHERE id = p_item_id AND status = 'published' AND is_reservable = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La oferta no está publicada o no acepta reservas'; END IF;

  IF public.turismo_feature_enabled('referrals_enabled') AND NULLIF(TRIM(p_referral_code), '') IS NOT NULL THEN
    SELECT a.* INTO affiliate_row
    FROM public.turismo_affiliate_profiles a
    JOIN public.turismo_profiles p ON p.id = a.profile_id AND p.is_active
    JOIN public.turismo_user_roles ur ON ur.user_id = a.profile_id AND ur.is_active
    JOIN public.turismo_roles r ON r.id = ur.role_id AND r.is_active AND r.code IN ('afiliado', 'embajador')
    WHERE LOWER(a.referral_code) = LOWER(TRIM(p_referral_code)) AND a.profile_id <> auth.uid()
      AND public.turismo_user_is_growth_eligible(a.profile_id)
    LIMIT 1;
  END IF;
  IF public.turismo_feature_enabled('promotions_enabled') AND NULLIF(TRIM(p_promotion_code), '') IS NOT NULL THEN
    SELECT * INTO promotion_row FROM public.turismo_promotions
    WHERE item_id = p_item_id AND is_active AND NOW() BETWEEN starts_at AND ends_at
      AND LOWER(code) = LOWER(TRIM(p_promotion_code)) LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'El código de promoción no es válido o no está vigente'; END IF;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.turismo_catalog_availability WHERE item_id = p_item_id AND available_date >= CURRENT_DATE)
  INTO explicit_schedule;
  IF explicit_schedule THEN
    SELECT COUNT(*)::INTEGER, COUNT(*) FILTER (WHERE is_available)::INTEGER
    INTO day_count, available_count
    FROM public.turismo_catalog_availability
    WHERE item_id = p_item_id AND available_date BETWEEN p_reservation_date AND requested_end;
    IF day_count <> (requested_end - p_reservation_date + 1) OR available_count <> day_count THEN
      RAISE EXCEPTION 'La oferta no tiene disponibilidad para todas las fechas';
    END IF;
    PERFORM 1 FROM public.turismo_catalog_availability
    WHERE item_id = p_item_id AND available_date BETWEEN p_reservation_date AND requested_end FOR UPDATE;
    FOR day_value IN SELECT generate_series(p_reservation_date, requested_end, '1 day')::DATE LOOP
      SELECT * INTO availability_row FROM public.turismo_catalog_availability
      WHERE item_id = p_item_id AND available_date = day_value;
      IF availability_row.capacity IS NOT NULL THEN
        SELECT COALESCE(SUM(r.guests), 0)::INTEGER INTO existing_guests
        FROM public.turismo_reservations r
        WHERE r.item_id = p_item_id AND r.status IN ('requested', 'confirmed')
          AND r.reservation_date <= day_value AND COALESCE(r.end_date, r.reservation_date) >= day_value;
        IF existing_guests + p_guests > availability_row.capacity THEN RAISE EXCEPTION 'La capacidad disponible se ha agotado'; END IF;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.turismo_reservations(
    item_id, tourist_id, provider_id, reservation_date, end_date, guests, notes, status,
    currency, affiliate_id, referral_code, commission_rate_snapshot, promotion_id, promotion_code
  )
  VALUES (
    p_item_id, auth.uid(), item_row.provider_id, p_reservation_date, p_end_date, p_guests,
    p_notes, 'requested', COALESCE(item_row.currency, 'COP'), affiliate_row.profile_id,
    CASE WHEN affiliate_row.profile_id IS NOT NULL THEN TRIM(p_referral_code) ELSE NULL END,
    affiliate_row.commission_rate, promotion_row.id,
    CASE WHEN promotion_row.id IS NOT NULL THEN promotion_row.code ELSE NULL END
  ) RETURNING id INTO reservation_id;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'reservation_created', reservation_id::TEXT, jsonb_build_object('item_id', p_item_id, 'guests', p_guests));
  RETURN reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_cancel_reservation(p_reservation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affiliate_id_value UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista')
     OR NOT public.turismo_current_user_has_permission('tourist:book') THEN
    RAISE EXCEPTION 'No tienes permiso para cancelar reservas';
  END IF;
  UPDATE public.turismo_reservations
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_reservation_id AND tourist_id = auth.uid() AND status IN ('requested', 'confirmed')
  RETURNING affiliate_id INTO affiliate_id_value;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada o no se puede cancelar'; END IF;
  IF affiliate_id_value IS NOT NULL THEN
    UPDATE public.turismo_affiliate_commissions SET status = 'void' WHERE reservation_id = p_reservation_id;
    PERFORM public.turismo_recalculate_affiliate_earnings(affiliate_id_value);
  END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'reservation_cancelled', p_reservation_id::TEXT, '{}'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_create_review(p_reservation_id UUID, p_rating INTEGER, p_comment TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reservation_row public.turismo_reservations%ROWTYPE; review_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista')
     OR NOT public.turismo_current_user_has_permission('tourist:review') THEN
    RAISE EXCEPTION 'No tienes permiso para reseñar';
  END IF;
  IF NOT public.turismo_feature_enabled('reviews_enabled') THEN RAISE EXCEPTION 'Las reseñas están deshabilitadas temporalmente'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations
  WHERE id = p_reservation_id AND tourist_id = auth.uid() AND status = 'completed';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo puedes reseñar reservas completadas propias'; END IF;
  IF p_rating NOT BETWEEN 1 AND 5 OR EXISTS (SELECT 1 FROM public.turismo_reviews WHERE reservation_id = p_reservation_id) THEN
    RAISE EXCEPTION 'La reseña no es válida o ya existe';
  END IF;
  INSERT INTO public.turismo_reviews(item_id, tourist_id, reservation_id, rating, comment, status)
  VALUES (reservation_row.item_id, auth.uid(), p_reservation_id, p_rating, NULLIF(TRIM(p_comment), ''), 'pending')
  RETURNING id INTO review_id;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'review_created', review_id::TEXT,
    jsonb_build_object('item_id', reservation_row.item_id, 'rating', p_rating));
  RETURN review_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_tourist_preferences(p_preferences TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cleaned TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista')
     OR NOT public.turismo_current_user_has_permission('tourist:profile') THEN
    RAISE EXCEPTION 'Solo un turista activo puede actualizar sus preferencias';
  END IF;
  IF COALESCE(array_length(p_preferences, 1), 0) > 9 THEN RAISE EXCEPTION 'Puedes seleccionar máximo 9 intereses'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_preferences, ARRAY[]::TEXT[])) value
    WHERE LOWER(TRIM(value)) NOT IN ('naturaleza', 'aventura', 'gastronomia', 'cultura', 'descanso', 'familia', 'artesania', 'eventos', 'alojamiento')
  ) THEN RAISE EXCEPTION 'Una preferencia no pertenece al vocabulario permitido'; END IF;
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::TEXT[]) INTO cleaned
  FROM (
    SELECT DISTINCT LOWER(TRIM(value)) AS value
    FROM unnest(COALESCE(p_preferences, ARRAY[]::TEXT[])) value
    WHERE NULLIF(TRIM(value), '') IS NOT NULL
  ) values_table;
  UPDATE public.turismo_tourist_profiles SET travel_preferences = cleaned, updated_at = NOW()
  WHERE profile_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO public.turismo_tourist_profiles(profile_id, travel_preferences) VALUES (auth.uid(), cleaned);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_save_itinerary(
  p_name TEXT, p_days INTEGER, p_interests TEXT[], p_budget_level TEXT, p_items JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE itinerary_id UUID; item_record RECORD; clean_interests TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista')
     OR NOT public.turismo_current_user_has_permission('tourist:profile') THEN
    RAISE EXCEPTION 'Solo un turista activo puede guardar itinerarios';
  END IF;
  IF NULLIF(TRIM(p_name), '') IS NULL THEN RAISE EXCEPTION 'El nombre del itinerario es obligatorio'; END IF;
  IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'El itinerario debe tener entre 1 y 7 días'; END IF;
  IF p_budget_level NOT IN ('economico', 'moderado', 'premium', 'flexible') THEN RAISE EXCEPTION 'Presupuesto inválido'; END IF;
  IF COALESCE(array_length(p_interests, 1), 0) > 9 THEN RAISE EXCEPTION 'Puedes seleccionar máximo 9 intereses'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_interests, ARRAY[]::TEXT[])) value
    WHERE LOWER(TRIM(value)) NOT IN ('naturaleza', 'aventura', 'gastronomia', 'cultura', 'descanso', 'familia', 'artesania', 'eventos', 'alojamiento')
  ) THEN RAISE EXCEPTION 'Un interés no es válido'; END IF;
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::TEXT[]) INTO clean_interests
  FROM (
    SELECT DISTINCT LOWER(TRIM(value)) AS value
    FROM unnest(COALESCE(p_interests, ARRAY[]::TEXT[])) value
    WHERE NULLIF(TRIM(value), '') IS NOT NULL
  ) values_table;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'Los elementos del itinerario deben ser un arreglo'; END IF;
  FOR item_record IN SELECT * FROM jsonb_to_recordset(p_items) AS x(catalog_item_id UUID, day_number INTEGER, slot TEXT, position INTEGER) LOOP
    IF item_record.catalog_item_id IS NULL OR item_record.day_number IS NULL
       OR item_record.day_number NOT BETWEEN 1 AND p_days
       OR item_record.slot NOT IN ('morning', 'midday', 'afternoon', 'evening')
       OR COALESCE(item_record.position, 0) < 0 THEN
      RAISE EXCEPTION 'Un elemento del itinerario tiene una estructura inválida';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = item_record.catalog_item_id AND status = 'published') THEN
      RAISE EXCEPTION 'Todos los elementos deben pertenecer al catálogo publicado';
    END IF;
  END LOOP;
  INSERT INTO public.turismo_itineraries(tourist_id, name, days, interests, budget_level)
  VALUES (auth.uid(), TRIM(p_name), p_days, clean_interests, p_budget_level) RETURNING id INTO itinerary_id;
  INSERT INTO public.turismo_itinerary_items(itinerary_id, catalog_item_id, day_number, slot, position)
  SELECT itinerary_id, x.catalog_item_id, x.day_number, x.slot, COALESCE(x.position, 0)
  FROM jsonb_to_recordset(p_items) AS x(catalog_item_id UUID, day_number INTEGER, slot TEXT, position INTEGER);
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'itinerary_saved', itinerary_id::TEXT, jsonb_build_object('days', p_days, 'items', jsonb_array_length(p_items)));
  RETURN itinerary_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_delete_itinerary(p_itinerary_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista')
     OR NOT public.turismo_current_user_has_permission('tourist:profile') THEN
    RAISE EXCEPTION 'Solo un turista activo puede eliminar itinerarios';
  END IF;
  DELETE FROM public.turismo_itineraries WHERE id = p_itinerary_id AND tourist_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Itinerario no encontrado o no te pertenece'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'itinerary_deleted', p_itinerary_id::TEXT, '{}'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_declare_external_payment(
  p_reservation_id UUID, p_method TEXT, p_external_reference TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reservation_row public.turismo_reservations%ROWTYPE; payment_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista')
     OR NOT public.turismo_current_user_has_permission('tourist:book') THEN
    RAISE EXCEPTION 'Solo un turista con permiso de reserva puede registrar pagos';
  END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_method NOT IN ('nequi', 'daviplata', 'bank_transfer', 'cash_provider')
     OR (p_method = 'bank_transfer' AND NULLIF(TRIM(p_external_reference), '') IS NULL) THEN
    RAISE EXCEPTION 'Método o referencia inválida';
  END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations
  WHERE id = p_reservation_id AND tourist_id = auth.uid() AND status IN ('confirmed', 'completed');
  IF NOT FOUND OR reservation_row.quoted_amount IS NULL OR reservation_row.quoted_amount <= 0 THEN
    RAISE EXCEPTION 'Solo puedes registrar pagos de reservas confirmadas o completadas con cotización';
  END IF;
  INSERT INTO public.turismo_payment_records(
    reservation_id, tourist_id, provider_id, amount, currency, method, external_reference, notes
  )
  VALUES (
    p_reservation_id, auth.uid(), reservation_row.provider_id, reservation_row.quoted_amount,
    reservation_row.currency, p_method, NULLIF(TRIM(p_external_reference), ''), NULLIF(TRIM(p_notes), '')
  ) RETURNING id INTO payment_id;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'external_payment_declared', payment_id::TEXT, jsonb_build_object('reservation_id', p_reservation_id, 'method', p_method));
  RETURN payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.turismo_role_has_dashboard(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.turismo_handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.turismo_assign_user_role(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_revoke_user_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_set_primary_user_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_set_role_permissions(TEXT, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_set_user_status(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_create_role(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_set_role_status(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_assign_user_role(UUID, TEXT, BOOLEAN),
  public.turismo_revoke_user_role(UUID, TEXT),
  public.turismo_set_primary_user_role(UUID, TEXT),
  public.turismo_set_role_permissions(TEXT, TEXT[]),
  public.turismo_set_user_status(UUID, BOOLEAN),
  public.turismo_create_role(TEXT, TEXT, TEXT, TEXT, TEXT),
  public.turismo_set_role_status(TEXT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.turismo_create_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_cancel_reservation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_create_review(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_update_tourist_preferences(TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_save_itinerary(TEXT, INTEGER, TEXT[], TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_delete_itinerary(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.turismo_declare_external_payment(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_create_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT),
  public.turismo_cancel_reservation(UUID),
  public.turismo_create_review(UUID, INTEGER, TEXT),
  public.turismo_update_tourist_preferences(TEXT[]),
  public.turismo_save_itinerary(TEXT, INTEGER, TEXT[], TEXT, JSONB),
  public.turismo_delete_itinerary(UUID),
  public.turismo_declare_external_payment(UUID, TEXT, TEXT, TEXT) TO authenticated;

INSERT INTO public.turismo_schema_version(version, migration_name)
VALUES (16, '16_correct_account_role_semantics.sql')
ON CONFLICT (version) DO UPDATE SET migration_name = EXCLUDED.migration_name;

COMMIT;
