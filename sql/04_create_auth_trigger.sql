-- =============================================================================
-- TURISMO CAJAMARCA PWA - SCRIPT 04: TRIGGER AUTOMÁTICO DE AUTH (turismo_)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.turismo_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role public.turismo_user_role_enum;
  user_full_name TEXT;
BEGIN
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.turismo_user_role_enum,
    'usuario'::public.turismo_user_role_enum
  );

  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- 1. Insertar en `turismo_profiles`
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
    user_role,
    TRUE,
    FALSE,
    CASE WHEN user_role = 'super_admin' THEN ARRAY['*'] ELSE ARRAY[]::TEXT[] END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.turismo_profiles.full_name),
    role = EXCLUDED.role;

  -- 2. Si el rol es Turista o Usuario, crear perfil inicial en `turismo_tourist_profiles`
  IF user_role = 'turista' OR user_role = 'usuario' THEN
    INSERT INTO public.turismo_tourist_profiles (profile_id, country_of_origin, preferred_language)
    VALUES (NEW.id, 'Perú', 'es')
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador en la tabla interna `auth.users`
DROP TRIGGER IF EXISTS on_auth_user_created_turismo ON auth.users;
CREATE TRIGGER on_auth_user_created_turismo
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.turismo_handle_new_user();
