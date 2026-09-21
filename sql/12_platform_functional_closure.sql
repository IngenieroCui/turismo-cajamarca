-- Turismo Cajamarca: cierre funcional de plataforma.
-- Ejecutar después de 08, 09, 10 y 11. La migración es idempotente.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Metadata del motor actual: reglas determinísticas, sin modelo de tokens.
ALTER TABLE public.turismo_ai_service_profiles ALTER COLUMN service_name SET DEFAULT 'Motor de recomendaciones determinísticas';
ALTER TABLE public.turismo_ai_service_profiles ALTER COLUMN model_version SET DEFAULT 'rules-v1';
ALTER TABLE public.turismo_ai_service_profiles ALTER COLUMN daily_token_quota SET DEFAULT 0;
UPDATE public.turismo_ai_service_profiles
SET service_name = 'Motor de recomendaciones determinísticas', model_version = 'rules-v1', daily_token_quota = 0, updated_at = NOW()
WHERE (service_name IN ('Recomendador', 'Recomendador Gemini 2.5') OR model_version IN ('v2.5-flash', 'Gemini 2.5'))
  AND (service_name IS NULL OR service_name IN ('Recomendador', 'Recomendador Gemini 2.5'))
  AND (model_version IS NULL OR model_version IN ('v2.5-flash', 'Gemini 2.5'))
  AND (daily_token_quota IS NULL OR daily_token_quota = 500000);

CREATE TABLE IF NOT EXISTS public.turismo_platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES public.turismo_profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.turismo_platform_settings(key, value, category, description, is_public) VALUES
  ('maintenance_mode', 'false'::jsonb, 'system', 'Deshabilita operaciones nuevas durante mantenimiento.', FALSE),
  ('reservations_enabled', 'true'::jsonb, 'marketplace', 'Permite crear nuevas reservas.', TRUE),
  ('reviews_enabled', 'true'::jsonb, 'marketplace', 'Permite crear nuevas reseñas.', TRUE),
  ('promotions_enabled', 'true'::jsonb, 'marketplace', 'Permite gestionar promociones.', TRUE),
  ('referrals_enabled', 'true'::jsonb, 'growth', 'Permite atribuir nuevas visitas y reservas.', TRUE),
  ('assistant_enabled', 'true'::jsonb, 'intelligence', 'Muestra el asistente de recomendaciones.', TRUE),
  ('support_enabled', 'true'::jsonb, 'operations', 'Permite crear nuevos tickets de soporte.', TRUE),
  ('default_affiliate_commission_rate', '5'::jsonb, 'growth', 'Tasa predeterminada para nuevos afiliados.', FALSE),
  ('platform_name', '"Turismo Cajamarca"'::jsonb, 'branding', 'Nombre público de la plataforma.', TRUE),
  ('support_contact_email', '""'::jsonb, 'support', 'Correo público de soporte.', TRUE)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.turismo_feature_enabled(p_key TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_key = 'maintenance_mode' THEN COALESCE((SELECT CASE WHEN jsonb_typeof(value) = 'boolean' THEN value::text::boolean ELSE FALSE END FROM public.turismo_platform_settings WHERE key = p_key), FALSE)
    ELSE COALESCE((SELECT CASE WHEN jsonb_typeof(value) = 'boolean' THEN value::text::boolean ELSE TRUE END FROM public.turismo_platform_settings WHERE key = p_key), TRUE)
  END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_public_settings()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM public.turismo_platform_settings WHERE is_public = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_platform_settings()
RETURNS TABLE(key TEXT, value JSONB, category TEXT, description TEXT, is_public BOOLEAN, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('platform:config') THEN
    RAISE EXCEPTION 'No tienes permiso para consultar la configuración';
  END IF;
  RETURN QUERY SELECT s.key, s.value, s.category, s.description, s.is_public, s.updated_at FROM public.turismo_platform_settings s ORDER BY s.category, s.key;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_platform_setting(p_key TEXT, p_value JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_role TEXT; setting_category TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('platform:config') THEN
    RAISE EXCEPTION 'No tienes permiso para modificar la configuración';
  END IF;
  SELECT category INTO setting_category FROM public.turismo_platform_settings WHERE key = p_key;
  IF setting_category IS NULL THEN RAISE EXCEPTION 'La configuración no existe'; END IF;
  SELECT r.code INTO current_role FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND ur.is_active AND r.is_active AND r.code IN ('admin','super_admin') ORDER BY r.code DESC LIMIT 1;
  IF current_role IS NULL THEN RAISE EXCEPTION 'Solo Admin o Super Admin puede modificar configuración'; END IF;
  IF current_role = 'admin' AND p_key <> 'support_contact_email' THEN RAISE EXCEPTION 'Admin solo puede modificar el correo de soporte'; END IF;
  IF p_key IN ('maintenance_mode','reservations_enabled','reviews_enabled','promotions_enabled','referrals_enabled','assistant_enabled','support_enabled') AND jsonb_typeof(p_value) <> 'boolean' THEN RAISE EXCEPTION 'El valor debe ser booleano'; END IF;
  IF p_key = 'default_affiliate_commission_rate' AND (jsonb_typeof(p_value) <> 'number' OR (p_value::text)::numeric < 0 OR (p_value::text)::numeric > 100) THEN RAISE EXCEPTION 'La comisión debe ser un número entre 0 y 100'; END IF;
  IF p_key IN ('platform_name','support_contact_email') AND jsonb_typeof(p_value) <> 'string' THEN RAISE EXCEPTION 'El valor debe ser texto'; END IF;
  UPDATE public.turismo_platform_settings SET value = p_value, updated_by = auth.uid(), updated_at = NOW() WHERE key = p_key;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'platform_setting_updated', p_key, jsonb_build_object('key', p_key));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_maintenance_blocks()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.turismo_feature_enabled('maintenance_mode') AND NOT public.turismo_is_super_admin();
$$;

GRANT EXECUTE ON FUNCTION public.turismo_get_public_settings() TO anon, authenticated;
REVOKE ALL ON FUNCTION public.turismo_feature_enabled(TEXT), public.turismo_get_platform_settings(), public.turismo_update_platform_setting(TEXT,JSONB), public.turismo_maintenance_blocks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_feature_enabled(TEXT), public.turismo_get_platform_settings(), public.turismo_update_platform_setting(TEXT,JSONB), public.turismo_maintenance_blocks() TO authenticated;

CREATE TABLE IF NOT EXISTS public.turismo_provider_collaborators (
  provider_id UUID NOT NULL REFERENCES public.turismo_provider_profiles(profile_id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'colaborador' CHECK (member_role IN ('owner','manager','colaborador')),
  permissions TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  added_by UUID NOT NULL REFERENCES public.turismo_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, collaborator_id),
  CHECK (provider_id <> collaborator_id),
  CHECK (permissions <@ ARRAY['catalog','availability','promotions','reservations','reviews','finance','support']::TEXT[])
);

CREATE OR REPLACE FUNCTION public.turismo_can_manage_provider(p_provider_id UUID, p_permission TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.turismo_current_user_is_active()
    AND EXISTS (SELECT 1 FROM public.turismo_provider_profiles pp JOIN public.turismo_profiles owner_profile ON owner_profile.id = pp.profile_id WHERE pp.profile_id = p_provider_id AND owner_profile.is_active)
    AND (auth.uid() = p_provider_id OR EXISTS (
      SELECT 1 FROM public.turismo_provider_collaborators c
      WHERE c.provider_id = p_provider_id AND c.collaborator_id = auth.uid() AND c.status = 'active'
        AND (c.member_role = 'manager' AND (p_permission <> 'finance' OR 'finance' = ANY(c.permissions)) OR p_permission = ANY(c.permissions))
    ));
$$;

CREATE OR REPLACE FUNCTION public.turismo_add_provider_collaborator(p_email TEXT, p_member_role TEXT, p_permissions TEXT[], p_provider_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid()); target_id UUID; permissions_value TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_role('prestador_turistico') OR provider_id_value <> auth.uid() THEN RAISE EXCEPTION 'Solo el propietario activo puede gestionar su equipo'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_provider_profiles WHERE profile_id = auth.uid()) THEN RAISE EXCEPTION 'El perfil del prestador no existe'; END IF;
  IF p_member_role NOT IN ('manager','colaborador') THEN RAISE EXCEPTION 'Rol interno inválido'; END IF;
  IF p_permissions IS NULL OR NOT (p_permissions <@ ARRAY['catalog','availability','promotions','reservations','reviews','finance','support']::TEXT[]) THEN RAISE EXCEPTION 'Permiso interno inválido'; END IF;
  SELECT id INTO target_id FROM public.turismo_profiles WHERE LOWER(email) = LOWER(TRIM(p_email)) AND is_active;
  IF target_id IS NULL THEN RAISE EXCEPTION 'No existe un usuario activo con ese correo'; END IF;
  IF target_id = auth.uid() THEN RAISE EXCEPTION 'No puedes agregarte como colaborador'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id = ur.role_id WHERE ur.user_id = target_id AND ur.is_active AND r.is_active AND r.code = 'prestador_turistico') THEN RAISE EXCEPTION 'El colaborador debe tener previamente el rol Prestador Turístico'; END IF;
  permissions_value := ARRAY(SELECT DISTINCT permission FROM unnest(CASE WHEN p_member_role = 'manager' THEN p_permissions || ARRAY['catalog','availability','promotions','reservations','reviews','support']::TEXT[] ELSE p_permissions END) AS permission);
  INSERT INTO public.turismo_provider_collaborators(provider_id, collaborator_id, member_role, permissions, status, added_by) VALUES (auth.uid(), target_id, p_member_role, permissions_value, 'active', auth.uid()) ON CONFLICT (provider_id, collaborator_id) DO UPDATE SET member_role = EXCLUDED.member_role, permissions = EXCLUDED.permissions, status = 'active', updated_at = NOW();
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'provider_collaborator_added', target_id::TEXT, jsonb_build_object('provider_id', auth.uid()));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_provider_collaborator(p_collaborator_id UUID, p_member_role TEXT, p_permissions TEXT[], p_status TEXT, p_provider_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid()); permissions_value TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR provider_id_value <> auth.uid() THEN RAISE EXCEPTION 'Solo el propietario activo puede gestionar su equipo'; END IF;
  IF p_member_role NOT IN ('manager','colaborador') OR p_status NOT IN ('active','inactive') OR p_permissions IS NULL OR NOT (p_permissions <@ ARRAY['catalog','availability','promotions','reservations','reviews','finance','support']::TEXT[]) THEN RAISE EXCEPTION 'Datos de colaboración inválidos'; END IF;
  permissions_value := ARRAY(SELECT DISTINCT permission FROM unnest(CASE WHEN p_member_role = 'manager' THEN p_permissions || ARRAY['catalog','availability','promotions','reservations','reviews','support']::TEXT[] ELSE p_permissions END) AS permission);
  UPDATE public.turismo_provider_collaborators SET member_role = p_member_role, permissions = permissions_value, status = p_status, updated_at = NOW() WHERE provider_id = auth.uid() AND collaborator_id = p_collaborator_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Colaborador no encontrado'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'provider_collaborator_updated', p_collaborator_id::TEXT, jsonb_build_object('provider_id', auth.uid()));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_remove_provider_collaborator(p_collaborator_id UUID, p_provider_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR COALESCE(p_provider_id, auth.uid()) <> auth.uid() THEN RAISE EXCEPTION 'Solo el propietario activo puede gestionar su equipo'; END IF;
  DELETE FROM public.turismo_provider_collaborators WHERE provider_id = auth.uid() AND collaborator_id = p_collaborator_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Colaborador no encontrado'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'provider_collaborator_removed', p_collaborator_id::TEXT, jsonb_build_object('provider_id', auth.uid()));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_my_provider_contexts()
RETURNS TABLE(provider_id UUID, business_name TEXT, is_owner BOOLEAN, member_role TEXT, permissions TEXT[])
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pp.profile_id, COALESCE(NULLIF(pp.nombre_comercial,''), NULLIF(pp.razon_social,''), p.full_name, 'Negocio turístico'), TRUE, 'owner', ARRAY['catalog','availability','promotions','reservations','reviews','finance','support']::TEXT[]
  FROM public.turismo_provider_profiles pp JOIN public.turismo_profiles p ON p.id = pp.profile_id
  WHERE pp.profile_id = auth.uid() AND p.is_active
  UNION ALL
  SELECT c.provider_id, COALESCE(NULLIF(pp.nombre_comercial,''), NULLIF(pp.razon_social,''), owner_profile.full_name, 'Negocio turístico'), FALSE, c.member_role, c.permissions
  FROM public.turismo_provider_collaborators c JOIN public.turismo_provider_profiles pp ON pp.profile_id = c.provider_id JOIN public.turismo_profiles owner_profile ON owner_profile.id = c.provider_id
  WHERE c.collaborator_id = auth.uid() AND c.status = 'active' AND public.turismo_current_user_is_active() AND owner_profile.is_active;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_provider_collaborators(p_provider_id UUID)
RETURNS TABLE(provider_id UUID, collaborator_id UUID, full_name TEXT, email TEXT, member_role TEXT, permissions TEXT[], status TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.provider_id, c.collaborator_id, p.full_name, p.email, c.member_role, c.permissions, c.status, c.created_at, c.updated_at
  FROM public.turismo_provider_collaborators c JOIN public.turismo_profiles p ON p.id = c.collaborator_id
  WHERE c.provider_id = p_provider_id AND public.turismo_can_manage_provider(p_provider_id, 'support') AND auth.uid() = p_provider_id;
$$;

ALTER TABLE public.turismo_provider_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_provider_collaborators_read ON public.turismo_provider_collaborators;
CREATE POLICY turismo_provider_collaborators_read ON public.turismo_provider_collaborators FOR SELECT TO authenticated USING (provider_id = auth.uid() OR collaborator_id = auth.uid());
REVOKE ALL ON TABLE public.turismo_provider_collaborators FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.turismo_provider_collaborators TO authenticated;
REVOKE ALL ON FUNCTION public.turismo_can_manage_provider(UUID,TEXT), public.turismo_add_provider_collaborator(TEXT,TEXT,TEXT[],UUID), public.turismo_update_provider_collaborator(UUID,TEXT,TEXT[],TEXT,UUID), public.turismo_remove_provider_collaborator(UUID,UUID), public.turismo_get_my_provider_contexts(), public.turismo_get_provider_collaborators(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_can_manage_provider(UUID,TEXT), public.turismo_add_provider_collaborator(TEXT,TEXT,TEXT[],UUID), public.turismo_update_provider_collaborator(UUID,TEXT,TEXT[],TEXT,UUID), public.turismo_remove_provider_collaborator(UUID,UUID), public.turismo_get_my_provider_contexts(), public.turismo_get_provider_collaborators(UUID) TO authenticated;

-- Reemplazo de mutaciones de catálogo con contexto de negocio explícito.
DROP FUNCTION IF EXISTS public.turismo_create_catalog_item(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB);
CREATE OR REPLACE FUNCTION public.turismo_create_catalog_item(p_item_type TEXT,p_title TEXT,p_slug TEXT,p_category TEXT,p_short_description TEXT,p_description TEXT,p_location TEXT,p_address TEXT,p_latitude DOUBLE PRECISION,p_longitude DOUBLE PRECISION,p_cover_image_url TEXT,p_contact_whatsapp TEXT,p_price_from NUMERIC,p_price_to NUMERIC,p_price_label TEXT,p_currency TEXT,p_duration_text TEXT,p_difficulty TEXT,p_is_reservable BOOLEAN,p_metadata JSONB,p_provider_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid()); created_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'catalog') THEN RAISE EXCEPTION 'No tienes permiso para gestionar el catálogo'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF NULLIF(TRIM(p_title),'') IS NULL OR NULLIF(TRIM(p_short_description),'') IS NULL OR NULLIF(TRIM(p_slug),'') IS NULL THEN RAISE EXCEPTION 'Título, slug y descripción corta son obligatorios'; END IF;
  INSERT INTO public.turismo_catalog_items(provider_id,item_type,title,slug,category,short_description,description,location,address,latitude,longitude,cover_image_url,contact_whatsapp,price_from,price_to,price_label,currency,duration_text,difficulty,is_reservable,metadata,status) VALUES(provider_id_value,p_item_type,TRIM(p_title),TRIM(p_slug),NULLIF(TRIM(p_category),''),TRIM(p_short_description),NULLIF(TRIM(p_description),''),NULLIF(TRIM(p_location),''),NULLIF(TRIM(p_address),''),p_latitude,p_longitude,NULLIF(TRIM(p_cover_image_url),''),NULLIF(TRIM(p_contact_whatsapp),''),p_price_from,p_price_to,NULLIF(TRIM(p_price_label),''),COALESCE(NULLIF(TRIM(p_currency),''),'COP'),NULLIF(TRIM(p_duration_text),''),NULLIF(TRIM(p_difficulty),''),COALESCE(p_is_reservable,FALSE),COALESCE(p_metadata,'{}'::jsonb),'draft') RETURNING id INTO created_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'catalog_item_created',created_id::TEXT,jsonb_build_object('provider_id',provider_id_value,'item_type',p_item_type)); RETURN created_id;
END; $$;

DROP FUNCTION IF EXISTS public.turismo_update_catalog_item(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB);
CREATE OR REPLACE FUNCTION public.turismo_update_catalog_item(p_item_id UUID,p_item_type TEXT,p_title TEXT,p_slug TEXT,p_category TEXT,p_short_description TEXT,p_description TEXT,p_location TEXT,p_address TEXT,p_latitude DOUBLE PRECISION,p_longitude DOUBLE PRECISION,p_cover_image_url TEXT,p_contact_whatsapp TEXT,p_price_from NUMERIC,p_price_to NUMERIC,p_price_label TEXT,p_currency TEXT,p_duration_text TEXT,p_difficulty TEXT,p_is_reservable BOOLEAN,p_metadata JSONB,p_provider_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid()); updated_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'catalog') THEN RAISE EXCEPTION 'No tienes permiso para gestionar el catálogo'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  UPDATE public.turismo_catalog_items SET item_type=p_item_type,title=TRIM(p_title),slug=TRIM(p_slug),category=NULLIF(TRIM(p_category),''),short_description=TRIM(p_short_description),description=NULLIF(TRIM(p_description),''),location=NULLIF(TRIM(p_location),''),address=NULLIF(TRIM(p_address),''),latitude=p_latitude,longitude=p_longitude,cover_image_url=NULLIF(TRIM(p_cover_image_url),''),contact_whatsapp=NULLIF(TRIM(p_contact_whatsapp),''),price_from=p_price_from,price_to=p_price_to,price_label=NULLIF(TRIM(p_price_label),''),currency=COALESCE(NULLIF(TRIM(p_currency),''),'COP'),duration_text=NULLIF(TRIM(p_duration_text),''),difficulty=NULLIF(TRIM(p_difficulty),''),is_reservable=COALESCE(p_is_reservable,FALSE),metadata=COALESCE(p_metadata,'{}'::jsonb) WHERE id=p_item_id AND provider_id=provider_id_value AND status IN ('draft','rejected') RETURNING id INTO updated_id;
  IF updated_id IS NULL THEN RAISE EXCEPTION 'La oferta no existe, no pertenece al negocio o no está editable'; END IF; RETURN updated_id;
END; $$;

DROP FUNCTION IF EXISTS public.turismo_submit_catalog_item(UUID);
CREATE OR REPLACE FUNCTION public.turismo_submit_catalog_item(p_item_id UUID,p_provider_id UUID DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid()); item_row public.turismo_catalog_items%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'catalog') THEN RAISE EXCEPTION 'No tienes permiso para enviar ofertas'; END IF;
  SELECT * INTO item_row FROM public.turismo_catalog_items WHERE id=p_item_id AND provider_id=provider_id_value;
  IF NOT FOUND OR item_row.status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'La oferta no está disponible para envío'; END IF;
  IF NULLIF(TRIM(item_row.title),'') IS NULL OR NULLIF(TRIM(item_row.short_description),'') IS NULL OR NULLIF(TRIM(item_row.location),'') IS NULL OR NULLIF(TRIM(item_row.cover_image_url),'') IS NULL THEN RAISE EXCEPTION 'Completa título, descripción corta, ubicación e imagen'; END IF;
  UPDATE public.turismo_catalog_items SET status='pending_review', moderation_reason=NULL, updated_at=NOW() WHERE id=p_item_id;
END; $$;

DROP FUNCTION IF EXISTS public.turismo_archive_catalog_item(UUID);
CREATE OR REPLACE FUNCTION public.turismo_archive_catalog_item(p_item_id UUID,p_provider_id UUID DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid());
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'catalog') THEN RAISE EXCEPTION 'No tienes permiso para archivar ofertas'; END IF;
  UPDATE public.turismo_catalog_items SET status='archived',updated_at=NOW() WHERE id=p_item_id AND provider_id=provider_id_value AND status IN ('draft','rejected','published');
  IF NOT FOUND THEN RAISE EXCEPTION 'La oferta no existe o no se puede archivar'; END IF;
END; $$;

-- Disponibilidad y promociones respetan el mismo contexto y las banderas.
DROP FUNCTION IF EXISTS public.turismo_set_catalog_availability(UUID,DATE,DATE,BOOLEAN,INTEGER,NUMERIC,TEXT);
CREATE OR REPLACE FUNCTION public.turismo_set_catalog_availability(p_item_id UUID,p_start_date DATE,p_end_date DATE,p_is_available BOOLEAN,p_capacity INTEGER DEFAULT NULL,p_price_override NUMERIC DEFAULT NULL,p_notes TEXT DEFAULT NULL,p_provider_id UUID DEFAULT NULL) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid()); day_value DATE; affected_days INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'availability') THEN RAISE EXCEPTION 'No tienes permiso para gestionar disponibilidad'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date OR p_end_date > p_start_date + 179 THEN RAISE EXCEPTION 'El rango de disponibilidad no es válido'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id=p_item_id AND provider_id=provider_id_value AND status <> 'archived') THEN RAISE EXCEPTION 'La oferta no existe o no pertenece al negocio'; END IF;
  FOR day_value IN SELECT generate_series(p_start_date,p_end_date,'1 day')::DATE LOOP
    INSERT INTO public.turismo_catalog_availability(item_id,available_date,is_available,capacity,price_override,notes) VALUES(p_item_id,day_value,p_is_available,p_capacity,p_price_override,NULLIF(TRIM(p_notes),'')) ON CONFLICT(item_id,available_date) DO UPDATE SET is_available=EXCLUDED.is_available,capacity=EXCLUDED.capacity,price_override=EXCLUDED.price_override,notes=EXCLUDED.notes,updated_at=NOW(); affected_days := affected_days + 1;
  END LOOP; RETURN affected_days;
END; $$;

DROP FUNCTION IF EXISTS public.turismo_clear_catalog_availability(UUID,DATE,DATE);
CREATE OR REPLACE FUNCTION public.turismo_clear_catalog_availability(p_item_id UUID,p_start_date DATE,p_end_date DATE,p_provider_id UUID DEFAULT NULL) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid()); affected_days INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'availability') THEN RAISE EXCEPTION 'No tienes permiso para gestionar disponibilidad'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id=p_item_id AND provider_id=provider_id_value) THEN RAISE EXCEPTION 'La oferta no pertenece al negocio'; END IF;
  DELETE FROM public.turismo_catalog_availability WHERE item_id=p_item_id AND available_date BETWEEN p_start_date AND p_end_date; GET DIAGNOSTICS affected_days = ROW_COUNT; RETURN affected_days;
END; $$;

DROP FUNCTION IF EXISTS public.turismo_create_promotion(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.turismo_create_promotion(p_item_id UUID,p_title TEXT,p_description TEXT,p_code TEXT,p_promotion_type TEXT,p_discount_value NUMERIC,p_starts_at TIMESTAMPTZ,p_ends_at TIMESTAMPTZ,p_provider_id UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid()); promotion_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'promotions') OR NOT public.turismo_feature_enabled('promotions_enabled') THEN RAISE EXCEPTION 'Las promociones están deshabilitadas temporalmente o no tienes permiso'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_ends_at <= p_starts_at OR NULLIF(TRIM(p_title),'') IS NULL OR p_promotion_type NOT IN ('percentage','fixed','benefit') THEN RAISE EXCEPTION 'Datos de promoción inválidos'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id=p_item_id AND provider_id=provider_id_value AND status <> 'archived') THEN RAISE EXCEPTION 'La oferta no pertenece al negocio'; END IF;
  INSERT INTO public.turismo_promotions(provider_id,item_id,title,description,code,promotion_type,discount_value,starts_at,ends_at) VALUES(provider_id_value,p_item_id,TRIM(p_title),NULLIF(TRIM(p_description),''),NULLIF(TRIM(p_code),''),p_promotion_type,p_discount_value,p_starts_at,p_ends_at) RETURNING id INTO promotion_id; RETURN promotion_id;
END; $$;

DROP FUNCTION IF EXISTS public.turismo_update_promotion(UUID,UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.turismo_update_promotion(p_promotion_id UUID,p_item_id UUID,p_title TEXT,p_description TEXT,p_code TEXT,p_promotion_type TEXT,p_discount_value NUMERIC,p_starts_at TIMESTAMPTZ,p_ends_at TIMESTAMPTZ,p_provider_id UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid()); promotion_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'promotions') OR NOT public.turismo_feature_enabled('promotions_enabled') THEN RAISE EXCEPTION 'Las promociones están deshabilitadas temporalmente o no tienes permiso'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  UPDATE public.turismo_promotions SET item_id=p_item_id,title=TRIM(p_title),description=NULLIF(TRIM(p_description),''),code=NULLIF(TRIM(p_code),''),promotion_type=p_promotion_type,discount_value=p_discount_value,starts_at=p_starts_at,ends_at=p_ends_at,updated_at=NOW() WHERE id=p_promotion_id AND provider_id=provider_id_value RETURNING id INTO promotion_id;
  IF promotion_id IS NULL THEN RAISE EXCEPTION 'La promoción no existe o no pertenece al negocio'; END IF; RETURN promotion_id;
END; $$;

DROP FUNCTION IF EXISTS public.turismo_deactivate_promotion(UUID);
CREATE OR REPLACE FUNCTION public.turismo_deactivate_promotion(p_promotion_id UUID,p_provider_id UUID DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid());
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'promotions') OR NOT public.turismo_feature_enabled('promotions_enabled') THEN RAISE EXCEPTION 'Las promociones están deshabilitadas temporalmente o no tienes permiso'; END IF;
  UPDATE public.turismo_promotions SET is_active=FALSE,updated_at=NOW() WHERE id=p_promotion_id AND provider_id=provider_id_value;
END; $$;

-- Reservas: bandera, mantenimiento y atribución conservando disponibilidad existente.
DROP FUNCTION IF EXISTS public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION public.turismo_create_reservation(p_item_id UUID,p_reservation_date DATE,p_end_date DATE,p_guests INTEGER,p_notes TEXT,p_referral_code TEXT DEFAULT NULL,p_promotion_code TEXT DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item_row public.turismo_catalog_items%ROWTYPE; affiliate_row public.turismo_affiliate_profiles%ROWTYPE; promotion_row public.turismo_promotions%ROWTYPE; reservation_id UUID; day_value DATE; requested_end DATE; explicit_schedule BOOLEAN; availability_row public.turismo_catalog_availability%ROWTYPE; existing_guests INTEGER; day_count INTEGER; available_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:book') THEN RAISE EXCEPTION 'No tienes permiso para reservar'; END IF;
  IF NOT public.turismo_feature_enabled('reservations_enabled') THEN RAISE EXCEPTION 'Las reservas están deshabilitadas temporalmente'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_guests IS NULL OR p_guests < 1 OR p_reservation_date IS NULL OR p_reservation_date < CURRENT_DATE THEN RAISE EXCEPTION 'Datos de reserva inválidos'; END IF;
  requested_end := COALESCE(p_end_date,p_reservation_date); IF requested_end < p_reservation_date OR requested_end > p_reservation_date + 30 THEN RAISE EXCEPTION 'El rango de reserva no es válido'; END IF;
  SELECT * INTO item_row FROM public.turismo_catalog_items WHERE id=p_item_id AND status='published' AND is_reservable=TRUE; IF NOT FOUND THEN RAISE EXCEPTION 'La oferta no está publicada o no acepta reservas'; END IF;
  IF public.turismo_feature_enabled('referrals_enabled') AND NULLIF(TRIM(p_referral_code),'') IS NOT NULL THEN SELECT a.* INTO affiliate_row FROM public.turismo_affiliate_profiles a JOIN public.turismo_profiles p ON p.id=a.profile_id AND p.is_active JOIN public.turismo_user_roles ur ON ur.user_id=a.profile_id AND ur.is_active JOIN public.turismo_roles r ON r.id=ur.role_id AND r.is_active AND r.code IN ('afiliado','embajador') WHERE LOWER(a.referral_code)=LOWER(TRIM(p_referral_code)) AND a.profile_id<>auth.uid() LIMIT 1; END IF;
  IF public.turismo_feature_enabled('promotions_enabled') AND NULLIF(TRIM(p_promotion_code),'') IS NOT NULL THEN SELECT * INTO promotion_row FROM public.turismo_promotions WHERE item_id=p_item_id AND is_active AND NOW() BETWEEN starts_at AND ends_at AND LOWER(code)=LOWER(TRIM(p_promotion_code)) LIMIT 1; IF NOT FOUND THEN RAISE EXCEPTION 'El código de promoción no es válido o no está vigente'; END IF; END IF;
  SELECT EXISTS(SELECT 1 FROM public.turismo_catalog_availability WHERE item_id=p_item_id AND available_date>=CURRENT_DATE) INTO explicit_schedule;
  IF explicit_schedule THEN
    SELECT COUNT(*)::INTEGER,COUNT(*) FILTER(WHERE is_available)::INTEGER INTO day_count,available_count FROM public.turismo_catalog_availability WHERE item_id=p_item_id AND available_date BETWEEN p_reservation_date AND requested_end;
    IF day_count <> (requested_end-p_reservation_date+1) OR available_count <> day_count THEN RAISE EXCEPTION 'La oferta no tiene disponibilidad para todas las fechas'; END IF;
    PERFORM 1 FROM public.turismo_catalog_availability WHERE item_id=p_item_id AND available_date BETWEEN p_reservation_date AND requested_end FOR UPDATE;
    FOR day_value IN SELECT generate_series(p_reservation_date,requested_end,'1 day')::DATE LOOP SELECT * INTO availability_row FROM public.turismo_catalog_availability WHERE item_id=p_item_id AND available_date=day_value; IF availability_row.capacity IS NOT NULL THEN SELECT COALESCE(SUM(r.guests),0)::INTEGER INTO existing_guests FROM public.turismo_reservations r WHERE r.item_id=p_item_id AND r.status IN ('requested','confirmed') AND r.reservation_date<=day_value AND COALESCE(r.end_date,r.reservation_date)>=day_value; IF existing_guests+p_guests>availability_row.capacity THEN RAISE EXCEPTION 'La capacidad disponible se ha agotado'; END IF; END IF; END LOOP;
  END IF;
  INSERT INTO public.turismo_reservations(item_id,tourist_id,provider_id,reservation_date,end_date,guests,notes,status,currency,affiliate_id,referral_code,commission_rate_snapshot,promotion_id,promotion_code) VALUES(p_item_id,auth.uid(),item_row.provider_id,p_reservation_date,p_end_date,p_guests,p_notes,'requested',COALESCE(item_row.currency,'COP'),affiliate_row.profile_id,CASE WHEN affiliate_row.profile_id IS NOT NULL THEN TRIM(p_referral_code) ELSE NULL END,affiliate_row.commission_rate,promotion_row.id,CASE WHEN promotion_row.id IS NOT NULL THEN promotion_row.code ELSE NULL END) RETURNING id INTO reservation_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'reservation_created',reservation_id::TEXT,jsonb_build_object('item_id',p_item_id,'guests',p_guests)); RETURN reservation_id;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_create_review(p_reservation_id UUID,p_rating INTEGER,p_comment TEXT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reservation_row public.turismo_reservations%ROWTYPE; review_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:review') THEN RAISE EXCEPTION 'No tienes permiso para reseñar'; END IF;
  IF NOT public.turismo_feature_enabled('reviews_enabled') THEN RAISE EXCEPTION 'Las reseñas están deshabilitadas temporalmente'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id=p_reservation_id AND tourist_id=auth.uid() AND status='completed'; IF NOT FOUND THEN RAISE EXCEPTION 'Solo puedes reseñar reservas completadas propias'; END IF;
  IF p_rating NOT BETWEEN 1 AND 5 OR EXISTS(SELECT 1 FROM public.turismo_reviews WHERE reservation_id=p_reservation_id) THEN RAISE EXCEPTION 'La reseña no es válida o ya existe'; END IF;
  INSERT INTO public.turismo_reviews(item_id,tourist_id,reservation_id,rating,comment,status) VALUES(reservation_row.item_id,auth.uid(),p_reservation_id,p_rating,NULLIF(TRIM(p_comment),''),'pending') RETURNING id INTO review_id; RETURN review_id;
END; $$;

DROP FUNCTION IF EXISTS public.turismo_provider_update_reservation(UUID,TEXT,NUMERIC,TEXT);
CREATE OR REPLACE FUNCTION public.turismo_provider_update_reservation(p_reservation_id UUID,p_action TEXT,p_quoted_amount NUMERIC DEFAULT NULL,p_response TEXT DEFAULT NULL,p_provider_id UUID DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid()); current_status TEXT; next_status TEXT; reservation_row public.turismo_reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'reservations') THEN RAISE EXCEPTION 'No tienes permiso para gestionar reservas'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id=p_reservation_id AND provider_id=provider_id_value; IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada o no pertenece al negocio'; END IF;
  current_status := reservation_row.status; next_status := CASE WHEN p_action='confirm' AND current_status='requested' THEN 'confirmed' WHEN p_action='reject' AND current_status='requested' THEN 'rejected' WHEN p_action='complete' AND current_status='confirmed' THEN 'completed' ELSE NULL END; IF next_status IS NULL THEN RAISE EXCEPTION 'Transición de reserva inválida'; END IF;
  UPDATE public.turismo_reservations SET status=next_status,quoted_amount=COALESCE(p_quoted_amount,quoted_amount),provider_response=COALESCE(NULLIF(TRIM(p_response),''),provider_response),updated_at=NOW() WHERE id=p_reservation_id;
END; $$;

DROP FUNCTION IF EXISTS public.turismo_respond_to_review(UUID,TEXT);
CREATE OR REPLACE FUNCTION public.turismo_respond_to_review(p_review_id UUID,p_response TEXT,p_provider_id UUID DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id,auth.uid());
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value,'reviews') OR NULLIF(TRIM(p_response),'') IS NULL THEN RAISE EXCEPTION 'No tienes permiso o la respuesta está vacía'; END IF;
  UPDATE public.turismo_reviews r SET provider_response=TRIM(p_response),provider_responded_at=NOW(),updated_at=NOW() FROM public.turismo_catalog_items i WHERE r.id=p_review_id AND r.item_id=i.id AND i.provider_id=provider_id_value AND r.status='published'; IF NOT FOUND THEN RAISE EXCEPTION 'La reseña no existe o no pertenece al negocio'; END IF;
END; $$;

ALTER TABLE public.turismo_catalog_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_catalog_collaborator_read ON public.turismo_catalog_items;
CREATE POLICY turismo_catalog_collaborator_read ON public.turismo_catalog_items FOR SELECT TO authenticated USING (provider_id = auth.uid() OR (provider_id IS NOT NULL AND public.turismo_can_manage_provider(provider_id,'catalog')));
ALTER TABLE public.turismo_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_reservations_collaborator_read ON public.turismo_reservations;
CREATE POLICY turismo_reservations_collaborator_read ON public.turismo_reservations FOR SELECT TO authenticated USING (tourist_id = auth.uid() OR (provider_id IS NOT NULL AND public.turismo_can_manage_provider(provider_id,'reservations')));
ALTER TABLE public.turismo_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_reviews_collaborator_read ON public.turismo_reviews;
CREATE POLICY turismo_reviews_collaborator_read ON public.turismo_reviews FOR SELECT TO authenticated USING (tourist_id = auth.uid() OR EXISTS (SELECT 1 FROM public.turismo_catalog_items i WHERE i.id = item_id AND public.turismo_can_manage_provider(i.provider_id,'reviews')));
ALTER TABLE public.turismo_promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_promotions_collaborator_read ON public.turismo_promotions;
CREATE POLICY turismo_promotions_collaborator_read ON public.turismo_promotions FOR SELECT TO authenticated USING (provider_id = auth.uid() OR public.turismo_can_manage_provider(provider_id,'promotions'));

DROP FUNCTION IF EXISTS public.turismo_create_support_ticket(TEXT,TEXT,TEXT,TEXT,UUID,UUID);
ALTER TABLE public.turismo_support_tickets ADD COLUMN IF NOT EXISTS provider_context_id UUID REFERENCES public.turismo_provider_profiles(profile_id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.turismo_create_support_ticket(p_category TEXT,p_subject TEXT,p_description TEXT,p_priority TEXT DEFAULT 'normal',p_reservation_id UUID DEFAULT NULL,p_catalog_item_id UUID DEFAULT NULL,p_provider_context_id UUID DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created_id UUID; reservation_row public.turismo_reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'Autenticación y cuenta activa requeridas'; END IF;
  IF NOT public.turismo_feature_enabled('support_enabled') THEN RAISE EXCEPTION 'El soporte está deshabilitado temporalmente'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_reservation_id IS NOT NULL THEN SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id=p_reservation_id; IF NOT FOUND OR (reservation_row.tourist_id<>auth.uid() AND reservation_row.provider_id<>auth.uid() AND NOT public.turismo_current_user_has_permission('support:tickets_manage')) THEN RAISE EXCEPTION 'No puedes vincular esa reserva a un ticket'; END IF; END IF;
  IF p_provider_context_id IS NOT NULL AND NOT public.turismo_can_manage_provider(p_provider_context_id,'support') THEN RAISE EXCEPTION 'No puedes usar ese negocio como contexto'; END IF;
  INSERT INTO public.turismo_support_tickets(requester_id,category,reservation_id,catalog_item_id,provider_context_id,subject,description,priority,status) VALUES(auth.uid(),p_category,p_reservation_id,p_catalog_item_id,p_provider_context_id,TRIM(p_subject),TRIM(p_description),p_priority,'open') RETURNING id INTO created_id; RETURN created_id;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_register_referral_visit(p_referral_code TEXT,p_visitor_token TEXT,p_landing_path TEXT DEFAULT NULL) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affiliate_id_value UUID;
BEGIN
  IF NOT public.turismo_feature_enabled('referrals_enabled') OR public.turismo_maintenance_blocks() OR NULLIF(TRIM(p_referral_code),'') IS NULL OR NULLIF(TRIM(p_visitor_token),'') IS NULL THEN RETURN FALSE; END IF;
  SELECT a.profile_id INTO affiliate_id_value FROM public.turismo_affiliate_profiles a JOIN public.turismo_profiles p ON p.id=a.profile_id AND p.is_active WHERE LOWER(a.referral_code)=LOWER(TRIM(p_referral_code)) LIMIT 1; IF affiliate_id_value IS NULL THEN RETURN FALSE; END IF;
  INSERT INTO public.turismo_referral_visits(affiliate_id,referral_code,visitor_token,landing_path) VALUES(affiliate_id_value,TRIM(p_referral_code),TRIM(p_visitor_token),p_landing_path) ON CONFLICT(affiliate_id,visitor_token) DO NOTHING; RETURN TRUE;
END; $$;

-- Pagos manuales/externos: el sistema registra declaraciones, nunca procesa dinero.
CREATE TABLE IF NOT EXISTS public.turismo_payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reservation_id UUID NOT NULL REFERENCES public.turismo_reservations(id) ON DELETE RESTRICT,
  tourist_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE RESTRICT, provider_id UUID REFERENCES public.turismo_profiles(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL, currency TEXT NOT NULL DEFAULT 'COP', method TEXT NOT NULL CHECK (method IN ('nequi','daviplata','bank_transfer','cash_provider')),
  external_reference TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'declared' CHECK (status IN ('declared','verified','rejected','cancelled')),
  declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), verified_at TIMESTAMPTZ, verified_by UUID REFERENCES public.turismo_profiles(id) ON DELETE SET NULL, rejection_reason TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS turismo_payment_active_reservation_idx ON public.turismo_payment_records(reservation_id) WHERE status IN ('declared','verified');

CREATE OR REPLACE FUNCTION public.turismo_declare_external_payment(p_reservation_id UUID,p_method TEXT,p_external_reference TEXT DEFAULT NULL,p_notes TEXT DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reservation_row public.turismo_reservations%ROWTYPE; payment_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_role('turista') THEN RAISE EXCEPTION 'Solo un turista activo puede registrar pagos'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_method NOT IN ('nequi','daviplata','bank_transfer','cash_provider') OR (p_method='bank_transfer' AND NULLIF(TRIM(p_external_reference),'') IS NULL) THEN RAISE EXCEPTION 'Método o referencia inválida'; END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id=p_reservation_id AND tourist_id=auth.uid() AND status IN ('confirmed','completed'); IF NOT FOUND OR reservation_row.quoted_amount IS NULL OR reservation_row.quoted_amount <= 0 THEN RAISE EXCEPTION 'Solo puedes registrar pagos de reservas confirmadas o completadas con cotización'; END IF;
  INSERT INTO public.turismo_payment_records(reservation_id,tourist_id,provider_id,amount,currency,method,external_reference,notes) VALUES(p_reservation_id,auth.uid(),reservation_row.provider_id,reservation_row.quoted_amount,reservation_row.currency,p_method,NULLIF(TRIM(p_external_reference),''),NULLIF(TRIM(p_notes),'')) RETURNING id INTO payment_id; INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'external_payment_declared',payment_id::TEXT,jsonb_build_object('reservation_id',p_reservation_id,'method',p_method)); RETURN payment_id;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_provider_review_payment(p_payment_id UUID,p_action TEXT,p_rejection_reason TEXT DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payment_row public.turismo_payment_records%ROWTYPE;
BEGIN
  SELECT * INTO payment_row FROM public.turismo_payment_records WHERE id=p_payment_id; IF NOT FOUND OR payment_row.provider_id IS NULL OR NOT public.turismo_can_manage_provider(payment_row.provider_id,'finance') THEN RAISE EXCEPTION 'No tienes permiso para revisar este pago'; END IF;
  IF payment_row.status <> 'declared' OR p_action NOT IN ('verify','reject') THEN RAISE EXCEPTION 'El pago no está pendiente'; END IF;
  IF p_action='reject' AND NULLIF(TRIM(p_rejection_reason),'') IS NULL THEN RAISE EXCEPTION 'Indica el motivo del rechazo'; END IF;
  UPDATE public.turismo_payment_records SET status=CASE WHEN p_action='verify' THEN 'verified' ELSE 'rejected' END,verified_at=CASE WHEN p_action='verify' THEN NOW() ELSE NULL END,verified_by=auth.uid(),rejection_reason=CASE WHEN p_action='reject' THEN TRIM(p_rejection_reason) ELSE NULL END WHERE id=p_payment_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),CASE WHEN p_action='verify' THEN 'external_payment_verified' ELSE 'external_payment_rejected' END,p_payment_id::TEXT,'{}'::jsonb);
END; $$;

ALTER TABLE public.turismo_payment_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_payment_records_select ON public.turismo_payment_records;
CREATE POLICY turismo_payment_records_select ON public.turismo_payment_records FOR SELECT TO authenticated USING (tourist_id=auth.uid() OR (provider_id IS NOT NULL AND public.turismo_can_manage_provider(provider_id,'finance')) OR public.turismo_current_user_has_permission('support:tickets_manage'));
REVOKE INSERT,UPDATE,DELETE ON public.turismo_payment_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.turismo_payment_records TO authenticated;
REVOKE ALL ON FUNCTION public.turismo_declare_external_payment(UUID,TEXT,TEXT,TEXT), public.turismo_provider_review_payment(UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_declare_external_payment(UUID,TEXT,TEXT,TEXT), public.turismo_provider_review_payment(UUID,TEXT,TEXT) TO authenticated;

-- Exportación propia y solicitudes de eliminación revisables.
CREATE TABLE IF NOT EXISTS public.turismo_account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE, reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','processed')), requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ, reviewed_by UUID REFERENCES public.turismo_profiles(id) ON DELETE SET NULL, review_note TEXT, processed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS turismo_one_pending_deletion_per_user ON public.turismo_account_deletion_requests(user_id) WHERE status='pending';

CREATE OR REPLACE FUNCTION public.turismo_export_my_data() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'Autenticación y cuenta activa requeridas'; END IF;
  SELECT jsonb_build_object(
    'profile',(SELECT to_jsonb(p) FROM public.turismo_profiles p WHERE p.id=auth.uid()),
    'active_roles',COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=auth.uid() AND ur.is_active),'[]'::jsonb),
    'tourist_profile',COALESCE((SELECT to_jsonb(tp) FROM public.turismo_tourist_profiles tp WHERE tp.profile_id=auth.uid()),'null'::jsonb),
    'provider_profile',COALESCE((SELECT to_jsonb(pp) FROM public.turismo_provider_profiles pp WHERE pp.profile_id=auth.uid()),'null'::jsonb),
    'reservations',COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.turismo_reservations r WHERE r.tourist_id=auth.uid()),'[]'::jsonb),
    'favorites',COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM public.turismo_favorites f WHERE f.user_id=auth.uid()),'[]'::jsonb),
    'reviews',COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.turismo_reviews r WHERE r.tourist_id=auth.uid()),'[]'::jsonb),
    'saved_itineraries',COALESCE((SELECT jsonb_agg(to_jsonb(i)) FROM public.turismo_itineraries i WHERE i.tourist_id=auth.uid()),'[]'::jsonb),
    'support_tickets',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.turismo_support_tickets t WHERE t.requester_id=auth.uid()),'[]'::jsonb),
    'notifications',COALESCE((SELECT jsonb_agg(to_jsonb(n)) FROM public.turismo_notifications n WHERE n.user_id=auth.uid()),'[]'::jsonb),
    'affiliate_profile',COALESCE((SELECT to_jsonb(a) FROM public.turismo_affiliate_profiles a WHERE a.profile_id=auth.uid()),'null'::jsonb),
    'commission_records',COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.turismo_affiliate_commissions c WHERE c.affiliate_id=auth.uid()),'[]'::jsonb)
  ) INTO result; RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_request_account_deletion(p_reason TEXT DEFAULT NULL) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE request_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'Autenticación y cuenta activa requeridas'; END IF;
  INSERT INTO public.turismo_account_deletion_requests(user_id,reason) VALUES(auth.uid(),NULLIF(TRIM(p_reason),'')) RETURNING id INTO request_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'account_deletion_requested',request_id::TEXT,'{}'::jsonb); RETURN request_id;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_get_my_account_deletion_request() RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT to_jsonb(r) FROM public.turismo_account_deletion_requests r WHERE r.user_id=auth.uid() AND r.status='pending' LIMIT 1; $$;
CREATE OR REPLACE FUNCTION public.turismo_cancel_account_deletion_request() RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN UPDATE public.turismo_account_deletion_requests SET status='cancelled' WHERE user_id=auth.uid() AND status='pending'; IF NOT FOUND THEN RAISE EXCEPTION 'No tienes una solicitud pendiente'; END IF; END; $$;
CREATE OR REPLACE FUNCTION public.turismo_get_pending_account_deletion_requests() RETURNS SETOF JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT jsonb_build_object('id',r.id,'user_id',r.user_id,'email',p.email,'full_name',p.full_name,'reason',r.reason,'status',r.status,'requested_at',r.requested_at,'reviewed_at',r.reviewed_at,'reviewed_by',r.reviewed_by,'review_note',r.review_note) FROM public.turismo_account_deletion_requests r JOIN public.turismo_profiles p ON p.id=r.user_id WHERE r.status='pending' AND public.turismo_is_super_admin() ORDER BY r.requested_at; $$;
CREATE OR REPLACE FUNCTION public.turismo_review_account_deletion_request(p_request_id UUID,p_decision TEXT,p_note TEXT DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NOT public.turismo_is_super_admin() OR p_decision NOT IN ('approve','reject') THEN RAISE EXCEPTION 'Solo Super Admin puede revisar solicitudes'; END IF; UPDATE public.turismo_account_deletion_requests SET status=CASE WHEN p_decision='approve' THEN 'approved' ELSE 'rejected' END,reviewed_at=NOW(),reviewed_by=auth.uid(),review_note=NULLIF(TRIM(p_note),'') WHERE id=p_request_id AND status='pending'; IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada o ya revisada'; END IF; END; $$;

ALTER TABLE public.turismo_account_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_deletion_requests_select ON public.turismo_account_deletion_requests;
CREATE POLICY turismo_deletion_requests_select ON public.turismo_account_deletion_requests FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.turismo_is_super_admin());
REVOKE INSERT,UPDATE,DELETE ON public.turismo_account_deletion_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.turismo_account_deletion_requests TO authenticated;
GRANT EXECUTE ON FUNCTION public.turismo_export_my_data(), public.turismo_request_account_deletion(TEXT), public.turismo_get_my_account_deletion_request(), public.turismo_cancel_account_deletion_request(), public.turismo_get_pending_account_deletion_requests(), public.turismo_review_account_deletion_request(UUID,TEXT,TEXT) TO authenticated;

CREATE TABLE IF NOT EXISTS public.turismo_schema_version(version INTEGER PRIMARY KEY,migration_name TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
INSERT INTO public.turismo_schema_version(version,migration_name) VALUES (8,'08_refactor_rbac_multi_role.sql'),(9,'09_core_tourism_marketplace.sql'),(10,'10_platform_operations_growth.sql'),(11,'11_experience_intelligence_engagement.sql'),(12,'12_platform_functional_closure.sql') ON CONFLICT(version) DO NOTHING;

CREATE OR REPLACE FUNCTION public.turismo_get_system_health() RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_permission('devops:infra_manage') OR public.turismo_is_super_admin()) THEN RAISE EXCEPTION 'No tienes permiso para consultar la salud del sistema'; END IF;
  RETURN jsonb_build_object('database_time',NOW(),'active_users',(SELECT COUNT(*) FROM public.turismo_profiles WHERE is_active),'active_roles',(SELECT COUNT(*) FROM public.turismo_user_roles WHERE is_active),'published_catalog',(SELECT COUNT(*) FROM public.turismo_catalog_items WHERE status='published'),'open_support_tickets',(SELECT COUNT(*) FROM public.turismo_support_tickets WHERE status IN ('open','in_progress','waiting_user')),'pending_catalog_moderation',(SELECT COUNT(*) FROM public.turismo_catalog_items WHERE status='pending_review'),'pending_reviews',(SELECT COUNT(*) FROM public.turismo_reviews WHERE status='pending'),'pending_deletion_requests',(SELECT COUNT(*) FROM public.turismo_account_deletion_requests WHERE status='pending'),'latest_audit_event_at',(SELECT MAX(created_at) FROM public.turismo_audit_logs),'notification_count_24h',(SELECT COUNT(*) FROM public.turismo_notifications WHERE created_at >= NOW()-INTERVAL '24 hours'),'schema_version',12);
END; $$;
REVOKE ALL ON FUNCTION public.turismo_get_system_health() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.turismo_get_system_health() TO authenticated;

REVOKE ALL ON FUNCTION public.turismo_create_catalog_item(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB,UUID), public.turismo_update_catalog_item(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB,UUID), public.turismo_submit_catalog_item(UUID,UUID), public.turismo_archive_catalog_item(UUID,UUID), public.turismo_set_catalog_availability(UUID,DATE,DATE,BOOLEAN,INTEGER,NUMERIC,TEXT,UUID), public.turismo_clear_catalog_availability(UUID,DATE,DATE,UUID), public.turismo_create_promotion(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ,UUID), public.turismo_update_promotion(UUID,UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ,UUID), public.turismo_deactivate_promotion(UUID,UUID), public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT,TEXT,TEXT), public.turismo_provider_update_reservation(UUID,TEXT,NUMERIC,TEXT,UUID), public.turismo_respond_to_review(UUID,TEXT,UUID), public.turismo_create_support_ticket(TEXT,TEXT,TEXT,TEXT,UUID,UUID,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_create_catalog_item(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB,UUID), public.turismo_update_catalog_item(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB,UUID), public.turismo_submit_catalog_item(UUID,UUID), public.turismo_archive_catalog_item(UUID,UUID), public.turismo_set_catalog_availability(UUID,DATE,DATE,BOOLEAN,INTEGER,NUMERIC,TEXT,UUID), public.turismo_clear_catalog_availability(UUID,DATE,DATE,UUID), public.turismo_create_promotion(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ,UUID), public.turismo_update_promotion(UUID,UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ,UUID), public.turismo_deactivate_promotion(UUID,UUID), public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT,TEXT,TEXT), public.turismo_provider_update_reservation(UUID,TEXT,NUMERIC,TEXT,UUID), public.turismo_respond_to_review(UUID,TEXT,UUID), public.turismo_create_support_ticket(TEXT,TEXT,TEXT,TEXT,UUID,UUID,UUID) TO authenticated;

COMMIT;
