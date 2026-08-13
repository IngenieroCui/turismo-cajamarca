-- =============================================================================
-- TURISMO CAJAMARCA PWA - SCRIPT 04: TRIGGER AUTOMÁTICO DE AUTH (Todos los Campos)
-- =============================================================================

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

  -- Casting seguro de ENUMs
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

  -- 1. Auto-confirmación del correo en `auth.users`
  BEGIN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = NEW.id AND email_confirmed_at IS NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2. Insertar perfil completo en `turismo_profiles`
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

  -- 3. Insertar extensión en `turismo_tourist_profiles`
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

-- Re-crear el trigger en `auth.users`
CREATE TRIGGER on_auth_user_created_turismo
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.turismo_handle_new_user();
