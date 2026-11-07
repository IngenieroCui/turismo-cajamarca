-- Turismo Cajamarca migration 18: isolate the shared Auth trigger.
-- Komerizo users must not receive Turismo profiles or roles. The application
-- marker is used only to opt out of this trigger; it never grants privileges.
BEGIN;

CREATE OR REPLACE FUNCTION public.turismo_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  application_code TEXT;
  tourist_role_id UUID;
  document_type_value public.turismo_document_type_enum;
BEGIN
  application_code := lower(trim(coalesce(
    NEW.raw_app_meta_data ->> 'application',
    NEW.raw_user_meta_data ->> 'application',
    NEW.raw_user_meta_data ->> 'app'
  )));

  -- This database shares auth.users with Komerizo. A foreign application
  -- marker opts out, while a missing marker preserves existing Turismo
  -- sign-up behaviour. No role is ever selected from user metadata.
  IF application_code IN ('komerizo', 'komerizo-web', 'komerizo-api') THEN
    RETURN NEW;
  END IF;

  BEGIN
    document_type_value := coalesce(
      nullif(NEW.raw_user_meta_data ->> 'document_type', '')::public.turismo_document_type_enum,
      'DNI'::public.turismo_document_type_enum
    );
  EXCEPTION WHEN invalid_text_representation THEN
    document_type_value := 'DNI'::public.turismo_document_type_enum;
  END;

  INSERT INTO public.turismo_profiles(
    id, email, full_name, phone, document_type, document_number, is_active, is_verified
  ) VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'phone',
    document_type_value,
    NEW.raw_user_meta_data ->> 'document_number',
    true,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.turismo_profiles.full_name),
    phone = coalesce(excluded.phone, public.turismo_profiles.phone),
    document_type = coalesce(excluded.document_type, public.turismo_profiles.document_type),
    document_number = coalesce(excluded.document_number, public.turismo_profiles.document_number);

  SELECT id INTO tourist_role_id
  FROM public.turismo_roles
  WHERE code = 'turista' AND is_active AND NOT is_system;
  IF tourist_role_id IS NULL THEN
    RAISE EXCEPTION 'El rol Turista no existe o está inactivo; no se puede crear la cuenta';
  END IF;

  INSERT INTO public.turismo_user_roles(user_id, role_id, is_active, is_primary)
  VALUES (NEW.id, tourist_role_id, true, true)
  ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true, is_primary = true;

  PERFORM public.turismo_initialize_user_role_extension(NEW.id, 'turista');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_turismo ON auth.users;
CREATE TRIGGER on_auth_user_created_turismo
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.turismo_handle_new_user();

INSERT INTO public.turismo_schema_version(version, migration_name)
VALUES (18, '18_isolate_auth_trigger_by_application.sql')
ON CONFLICT (version) DO UPDATE
SET migration_name = excluded.migration_name, applied_at = now();

COMMIT;
