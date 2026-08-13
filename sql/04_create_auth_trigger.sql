-- =============================================================================
-- TURISMO CAJAMARCA PWA - SCRIPT 04: TRIGGER AUTOMÁTICO DE AUTH (Resiliente)
-- =============================================================================

-- Eliminar posibles triggers antiguos que causen error 500 en Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_turismo ON auth.users;

CREATE OR REPLACE FUNCTION public.turismo_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_text TEXT;
  user_role_val public.turismo_user_role_enum;
  user_full_name TEXT;
BEGIN
  user_role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'turista');
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Manejo seguro del casting de ENUM
  BEGIN
    user_role_val := user_role_text::public.turismo_user_role_enum;
  EXCEPTION WHEN OTHERS THEN
    user_role_val := 'turista'::public.turismo_user_role_enum;
  END;

  -- Insertar perfil en `turismo_profiles` sin bloquear Supabase Auth si la tabla no existe
  BEGIN
    INSERT INTO public.turismo_profiles (
      id,
      email,
      full_name,
      role,
      is_active,
      is_verified,
      permissions
    ) VALUES (
      NEW.id,
      NEW.email,
      user_full_name,
      user_role_val,
      TRUE,
      FALSE,
      CASE WHEN user_role_val = 'super_admin' THEN ARRAY['*'] ELSE ARRAY[]::TEXT[] END
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.turismo_profiles.full_name),
      role = EXCLUDED.role;
  EXCEPTION WHEN OTHERS THEN
    -- Si la tabla aún no existe en Supabase, ignora el error para no arrojar 500
    NULL;
  END;

  -- Insertar extensión en `turismo_tourist_profiles`
  BEGIN
    IF user_role_val = 'turista' OR user_role_val = 'usuario' THEN
      INSERT INTO public.turismo_tourist_profiles (profile_id, country_of_origin, preferred_language)
      VALUES (NEW.id, 'Colombia', 'es')
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-crear el trigger único en `auth.users`
CREATE TRIGGER on_auth_user_created_turismo
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.turismo_handle_new_user();
