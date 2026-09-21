-- Turismo Cajamarca: inteligencia de experiencias y engagement.
-- Ejecutar después de 08_refactor_rbac_multi_role.sql,
-- 09_core_tourism_marketplace.sql y 10_platform_operations_growth.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.turismo_catalog_availability (
  item_id UUID NOT NULL REFERENCES public.turismo_catalog_items(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  capacity INTEGER,
  price_override NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_id, available_date),
  CHECK (capacity IS NULL OR capacity >= 1),
  CHECK (price_override IS NULL OR price_override >= 0)
);

CREATE INDEX IF NOT EXISTS turismo_catalog_availability_date_idx
  ON public.turismo_catalog_availability(available_date);
CREATE INDEX IF NOT EXISTS turismo_catalog_availability_item_date_idx
  ON public.turismo_catalog_availability(item_id, available_date);

DROP TRIGGER IF EXISTS turismo_catalog_availability_touch_updated_at ON public.turismo_catalog_availability;
CREATE TRIGGER turismo_catalog_availability_touch_updated_at
  BEFORE UPDATE ON public.turismo_catalog_availability FOR EACH ROW
  EXECUTE FUNCTION public.turismo_marketplace_touch_updated_at();

ALTER TABLE public.turismo_catalog_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_availability_public_read ON public.turismo_catalog_availability;
CREATE POLICY turismo_availability_public_read
  ON public.turismo_catalog_availability FOR SELECT TO anon, authenticated
  USING (
    available_date >= CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM public.turismo_catalog_items i
      WHERE i.id = item_id AND i.status = 'published'
    )
  );
DROP POLICY IF EXISTS turismo_availability_owner_read ON public.turismo_catalog_availability;
CREATE POLICY turismo_availability_owner_read
  ON public.turismo_catalog_availability FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.turismo_catalog_items i
      WHERE i.id = item_id AND i.provider_id = auth.uid()
    )
  );
REVOKE INSERT, UPDATE, DELETE ON public.turismo_catalog_availability FROM anon, authenticated;
GRANT SELECT ON public.turismo_catalog_availability TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.turismo_set_catalog_availability(
  p_item_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_is_available BOOLEAN,
  p_capacity INTEGER DEFAULT NULL,
  p_price_override NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item_row public.turismo_catalog_items%ROWTYPE;
  affected_days INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_permission('provider:catalog_manage')
     OR NOT public.turismo_current_user_has_role('prestador_turistico') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar disponibilidad';
  END IF;
  IF p_start_date IS NULL OR p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'La disponibilidad solo puede comenzar hoy o en una fecha futura';
  END IF;
  IF p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'El rango de disponibilidad no es válido';
  END IF;
  IF p_end_date > p_start_date + 179 THEN
    RAISE EXCEPTION 'El rango máximo de disponibilidad es de 180 días';
  END IF;
  IF p_capacity IS NOT NULL AND p_capacity < 1 THEN
    RAISE EXCEPTION 'La capacidad debe ser al menos 1';
  END IF;
  IF p_price_override IS NOT NULL AND p_price_override < 0 THEN
    RAISE EXCEPTION 'El precio especial no puede ser negativo';
  END IF;
  SELECT * INTO item_row FROM public.turismo_catalog_items
  WHERE id = p_item_id AND provider_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'La oferta no existe o no te pertenece'; END IF;
  IF item_row.status = 'archived' THEN RAISE EXCEPTION 'No puedes gestionar disponibilidad de una oferta archivada'; END IF;

  INSERT INTO public.turismo_catalog_availability(item_id, available_date, is_available, capacity, price_override, notes)
  SELECT p_item_id, day_value::DATE, COALESCE(p_is_available, TRUE), p_capacity, p_price_override, NULLIF(TRIM(p_notes), '')
  FROM generate_series(p_start_date, p_end_date, '1 day') AS day_value
  ON CONFLICT (item_id, available_date) DO UPDATE SET
    is_available = EXCLUDED.is_available,
    capacity = EXCLUDED.capacity,
    price_override = EXCLUDED.price_override,
    notes = EXCLUDED.notes;
  GET DIAGNOSTICS affected_days = ROW_COUNT;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'catalog_availability_updated', p_item_id::TEXT,
    jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date, 'days', affected_days));
  RETURN affected_days;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_clear_catalog_availability(
  p_item_id UUID, p_start_date DATE, p_end_date DATE
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected_days INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_permission('provider:catalog_manage')
     OR NOT public.turismo_current_user_has_role('prestador_turistico') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar disponibilidad';
  END IF;
  IF p_start_date IS NULL OR p_start_date < CURRENT_DATE OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'El rango de disponibilidad no es válido';
  END IF;
  IF p_end_date > p_start_date + 179 THEN RAISE EXCEPTION 'El rango máximo de disponibilidad es de 180 días'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = p_item_id AND provider_id = auth.uid() AND status <> 'archived') THEN
    RAISE EXCEPTION 'La oferta no existe, no te pertenece o está archivada';
  END IF;
  DELETE FROM public.turismo_catalog_availability
  WHERE item_id = p_item_id AND available_date BETWEEN p_start_date AND p_end_date AND available_date >= CURRENT_DATE;
  GET DIAGNOSTICS affected_days = ROW_COUNT;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'catalog_availability_cleared', p_item_id::TEXT,
    jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date, 'days', affected_days));
  RETURN affected_days;
END;
$$;

CREATE TABLE IF NOT EXISTS public.turismo_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.turismo_catalog_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('percentage', 'fixed', 'benefit')),
  discount_value NUMERIC(12,2),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  CHECK (promotion_type = 'percentage' AND discount_value > 0 AND discount_value <= 100
    OR promotion_type = 'fixed' AND discount_value > 0
    OR promotion_type = 'benefit')
);

CREATE UNIQUE INDEX IF NOT EXISTS turismo_promotions_provider_code_uq
  ON public.turismo_promotions(provider_id, LOWER(code)) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS turismo_promotions_item_active_idx ON public.turismo_promotions(item_id, is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS turismo_promotions_provider_idx ON public.turismo_promotions(provider_id, created_at DESC);

ALTER TABLE public.turismo_promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_promotions_public_read ON public.turismo_promotions;
CREATE POLICY turismo_promotions_public_read
  ON public.turismo_promotions FOR SELECT TO anon, authenticated
  USING (
    is_active AND NOW() BETWEEN starts_at AND ends_at
    AND EXISTS (SELECT 1 FROM public.turismo_catalog_items i WHERE i.id = item_id AND i.status = 'published')
  );
DROP POLICY IF EXISTS turismo_promotions_owner_read ON public.turismo_promotions;
CREATE POLICY turismo_promotions_owner_read
  ON public.turismo_promotions FOR SELECT TO authenticated USING (provider_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.turismo_promotions FROM anon, authenticated;
GRANT SELECT ON public.turismo_promotions TO anon, authenticated;

DROP TRIGGER IF EXISTS turismo_promotions_touch_updated_at ON public.turismo_promotions;
CREATE TRIGGER turismo_promotions_touch_updated_at
  BEFORE UPDATE ON public.turismo_promotions FOR EACH ROW
  EXECUTE FUNCTION public.turismo_marketplace_touch_updated_at();

CREATE OR REPLACE FUNCTION public.turismo_create_promotion(
  p_item_id UUID, p_title TEXT, p_description TEXT, p_code TEXT, p_promotion_type TEXT,
  p_discount_value NUMERIC, p_starts_at TIMESTAMPTZ, p_ends_at TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE promotion_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_permission('provider:offers_manage')
     OR NOT public.turismo_current_user_has_role('prestador_turistico') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar promociones';
  END IF;
  IF NULLIF(TRIM(p_title), '') IS NULL OR p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'Título y fechas válidas son obligatorios';
  END IF;
  IF p_promotion_type NOT IN ('percentage', 'fixed', 'benefit') THEN RAISE EXCEPTION 'Tipo de promoción inválido'; END IF;
  IF p_promotion_type = 'percentage' AND (p_discount_value IS NULL OR p_discount_value <= 0 OR p_discount_value > 100) THEN
    RAISE EXCEPTION 'El porcentaje debe estar entre 0 y 100';
  END IF;
  IF p_promotion_type = 'fixed' AND (p_discount_value IS NULL OR p_discount_value <= 0) THEN RAISE EXCEPTION 'El descuento fijo debe ser mayor que cero'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = p_item_id AND provider_id = auth.uid() AND status <> 'archived') THEN
    RAISE EXCEPTION 'La oferta no existe, no te pertenece o está archivada';
  END IF;
  INSERT INTO public.turismo_promotions(provider_id, item_id, title, description, code, promotion_type, discount_value, starts_at, ends_at)
  VALUES (auth.uid(), p_item_id, TRIM(p_title), NULLIF(TRIM(p_description), ''), NULLIF(TRIM(p_code), ''), p_promotion_type, p_discount_value, p_starts_at, p_ends_at)
  RETURNING id INTO promotion_id;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'promotion_created', promotion_id::TEXT, jsonb_build_object('item_id', p_item_id, 'promotion_type', p_promotion_type));
  RETURN promotion_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_promotion(
  p_promotion_id UUID, p_item_id UUID, p_title TEXT, p_description TEXT, p_code TEXT, p_promotion_type TEXT,
  p_discount_value NUMERIC, p_starts_at TIMESTAMPTZ, p_ends_at TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE promotion_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_permission('provider:offers_manage')
     OR NOT public.turismo_current_user_has_role('prestador_turistico') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar promociones';
  END IF;
  IF NULLIF(TRIM(p_title), '') IS NULL OR p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'Título y fechas válidas son obligatorios'; END IF;
  IF p_promotion_type NOT IN ('percentage', 'fixed', 'benefit') THEN RAISE EXCEPTION 'Tipo de promoción inválido'; END IF;
  IF p_promotion_type = 'percentage' AND (p_discount_value IS NULL OR p_discount_value <= 0 OR p_discount_value > 100) THEN RAISE EXCEPTION 'El porcentaje debe estar entre 0 y 100'; END IF;
  IF p_promotion_type = 'fixed' AND (p_discount_value IS NULL OR p_discount_value <= 0) THEN RAISE EXCEPTION 'El descuento fijo debe ser mayor que cero'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = p_item_id AND provider_id = auth.uid() AND status <> 'archived') THEN RAISE EXCEPTION 'La oferta no existe, no te pertenece o está archivada'; END IF;
  UPDATE public.turismo_promotions SET item_id = p_item_id, title = TRIM(p_title), description = NULLIF(TRIM(p_description), ''), code = NULLIF(TRIM(p_code), ''), promotion_type = p_promotion_type, discount_value = p_discount_value, starts_at = p_starts_at, ends_at = p_ends_at
  WHERE id = p_promotion_id AND provider_id = auth.uid()
  RETURNING id INTO promotion_id;
  IF promotion_id IS NULL THEN RAISE EXCEPTION 'Promoción no encontrada o no te pertenece'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'promotion_updated', promotion_id::TEXT, jsonb_build_object('item_id', p_item_id));
  RETURN promotion_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_deactivate_promotion(p_promotion_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('provider:offers_manage') OR NOT public.turismo_current_user_has_role('prestador_turistico') THEN RAISE EXCEPTION 'No tienes permiso para gestionar promociones'; END IF;
  UPDATE public.turismo_promotions SET is_active = FALSE WHERE id = p_promotion_id AND provider_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Promoción no encontrada o no te pertenece'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'promotion_deactivated', p_promotion_id::TEXT, '{}'::jsonb);
END;
$$;

ALTER TABLE public.turismo_reservations ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.turismo_promotions(id) ON DELETE SET NULL;
ALTER TABLE public.turismo_reservations ADD COLUMN IF NOT EXISTS promotion_code TEXT;
CREATE INDEX IF NOT EXISTS turismo_reservations_promotion_idx ON public.turismo_reservations(promotion_id);

DROP FUNCTION IF EXISTS public.turismo_create_reservation(UUID, DATE, DATE, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.turismo_create_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.turismo_create_reservation(UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.turismo_create_reservation(
  p_item_id UUID, p_reservation_date DATE, p_end_date DATE, p_guests INTEGER, p_notes TEXT,
  p_referral_code TEXT DEFAULT NULL, p_promotion_code TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:book') THEN RAISE EXCEPTION 'No tienes permiso para reservar'; END IF;
  IF p_guests IS NULL OR p_guests < 1 THEN RAISE EXCEPTION 'El número de personas debe ser al menos 1'; END IF;
  IF p_reservation_date IS NULL OR p_reservation_date < CURRENT_DATE THEN RAISE EXCEPTION 'La fecha de reserva no puede ser anterior a hoy'; END IF;
  requested_end := COALESCE(p_end_date, p_reservation_date);
  IF requested_end < p_reservation_date THEN RAISE EXCEPTION 'La fecha final no puede ser anterior a la inicial'; END IF;
  IF requested_end > p_reservation_date + 30 THEN RAISE EXCEPTION 'La reserva no puede superar 31 días'; END IF;
  SELECT * INTO item_row FROM public.turismo_catalog_items WHERE id = p_item_id AND status = 'published' AND is_reservable = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La oferta no está publicada o no acepta reservas'; END IF;

  IF NULLIF(TRIM(p_referral_code), '') IS NOT NULL THEN
    SELECT a.* INTO affiliate_row FROM public.turismo_affiliate_profiles a
    JOIN public.turismo_profiles p ON p.id = a.profile_id AND p.is_active
    JOIN public.turismo_user_roles ur ON ur.user_id = a.profile_id AND ur.is_active
    JOIN public.turismo_roles r ON r.id = ur.role_id AND r.is_active AND r.code IN ('afiliado', 'embajador')
    WHERE LOWER(a.referral_code) = LOWER(TRIM(p_referral_code)) AND a.profile_id <> auth.uid() LIMIT 1;
  END IF;
  IF NULLIF(TRIM(p_promotion_code), '') IS NOT NULL THEN
    SELECT * INTO promotion_row FROM public.turismo_promotions
    WHERE item_id = p_item_id AND is_active AND NOW() BETWEEN starts_at AND ends_at AND LOWER(code) = LOWER(TRIM(p_promotion_code)) LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'El código de promoción no es válido o no está vigente'; END IF;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.turismo_catalog_availability WHERE item_id = p_item_id AND available_date >= CURRENT_DATE) INTO explicit_schedule;
  IF explicit_schedule THEN
    SELECT COUNT(*)::INTEGER, COUNT(*) FILTER (WHERE is_available)::INTEGER INTO day_count, available_count
    FROM public.turismo_catalog_availability WHERE item_id = p_item_id AND available_date BETWEEN p_reservation_date AND requested_end;
    IF day_count <> (requested_end - p_reservation_date + 1) THEN RAISE EXCEPTION 'La oferta no tiene disponibilidad explícita para todas las fechas solicitadas'; END IF;
    IF available_count <> day_count THEN RAISE EXCEPTION 'Una o más fechas seleccionadas no están disponibles'; END IF;
    PERFORM 1 FROM public.turismo_catalog_availability WHERE item_id = p_item_id AND available_date BETWEEN p_reservation_date AND requested_end FOR UPDATE;
    FOR day_value IN SELECT generate_series(p_reservation_date, requested_end, '1 day')::DATE LOOP
      SELECT * INTO availability_row FROM public.turismo_catalog_availability WHERE item_id = p_item_id AND available_date = day_value;
      IF availability_row.capacity IS NOT NULL THEN
        SELECT COALESCE(SUM(r.guests), 0)::INTEGER INTO existing_guests FROM public.turismo_reservations r
        WHERE r.item_id = p_item_id AND r.status IN ('requested', 'confirmed')
          AND r.reservation_date <= day_value AND COALESCE(r.end_date, r.reservation_date) >= day_value;
        IF existing_guests + p_guests > availability_row.capacity THEN RAISE EXCEPTION 'La capacidad disponible se ha agotado para el %', day_value; END IF;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.turismo_reservations(item_id, tourist_id, provider_id, reservation_date, end_date, guests, notes, status, currency, affiliate_id, referral_code, commission_rate_snapshot, promotion_id, promotion_code)
  VALUES (p_item_id, auth.uid(), item_row.provider_id, p_reservation_date, p_end_date, p_guests, p_notes, 'requested', COALESCE(item_row.currency, 'COP'), affiliate_row.profile_id, CASE WHEN affiliate_row.profile_id IS NOT NULL THEN TRIM(p_referral_code) ELSE NULL END, affiliate_row.commission_rate, promotion_row.id, CASE WHEN promotion_row.id IS NOT NULL THEN promotion_row.code ELSE NULL END)
  RETURNING id INTO reservation_id;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'reservation_created', reservation_id::TEXT, jsonb_build_object('item_id', p_item_id, 'guests', p_guests, 'referred', affiliate_row.profile_id IS NOT NULL, 'promotion_requested', promotion_row.id IS NOT NULL));
  RETURN reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_tourist_preferences(p_preferences TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cleaned TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_role('turista') OR public.turismo_current_user_has_role('usuario')) THEN RAISE EXCEPTION 'Solo un turista activo puede actualizar sus preferencias'; END IF;
  IF COALESCE(array_length(p_preferences, 1), 0) > 9 THEN RAISE EXCEPTION 'Puedes seleccionar máximo 9 intereses'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_preferences, ARRAY[]::TEXT[])) value WHERE LOWER(TRIM(value)) NOT IN ('naturaleza','aventura','gastronomia','cultura','descanso','familia','artesania','eventos','alojamiento')) THEN RAISE EXCEPTION 'Una preferencia no pertenece al vocabulario permitido'; END IF;
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::TEXT[]) INTO cleaned
  FROM (SELECT DISTINCT LOWER(TRIM(value)) AS value FROM unnest(COALESCE(p_preferences, ARRAY[]::TEXT[])) value WHERE NULLIF(TRIM(value), '') IS NOT NULL) values_table;
  UPDATE public.turismo_tourist_profiles SET travel_preferences = cleaned, updated_at = NOW() WHERE profile_id = auth.uid();
  IF NOT FOUND THEN INSERT INTO public.turismo_tourist_profiles(profile_id, travel_preferences) VALUES (auth.uid(), cleaned); END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.turismo_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days INTEGER NOT NULL,
  interests TEXT[] NOT NULL DEFAULT '{}',
  budget_level TEXT NOT NULL DEFAULT 'flexible',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (days BETWEEN 1 AND 7),
  CHECK (budget_level IN ('economico','moderado','premium','flexible'))
);
CREATE TABLE IF NOT EXISTS public.turismo_itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.turismo_itineraries(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES public.turismo_catalog_items(id) ON DELETE RESTRICT,
  day_number INTEGER NOT NULL,
  slot TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (day_number BETWEEN 1 AND 7),
  CHECK (slot IN ('morning','midday','afternoon','evening')),
  UNIQUE (itinerary_id, day_number, slot, catalog_item_id)
);
CREATE INDEX IF NOT EXISTS turismo_itineraries_tourist_idx ON public.turismo_itineraries(tourist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS turismo_itinerary_items_itinerary_idx ON public.turismo_itinerary_items(itinerary_id, day_number, position);
DROP TRIGGER IF EXISTS turismo_itineraries_touch_updated_at ON public.turismo_itineraries;
CREATE TRIGGER turismo_itineraries_touch_updated_at BEFORE UPDATE ON public.turismo_itineraries FOR EACH ROW EXECUTE FUNCTION public.turismo_marketplace_touch_updated_at();

ALTER TABLE public.turismo_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_itinerary_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_itineraries_owner_select ON public.turismo_itineraries;
CREATE POLICY turismo_itineraries_owner_select ON public.turismo_itineraries FOR SELECT TO authenticated USING (tourist_id = auth.uid());
DROP POLICY IF EXISTS turismo_itinerary_items_owner_select ON public.turismo_itinerary_items;
CREATE POLICY turismo_itinerary_items_owner_select ON public.turismo_itinerary_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.turismo_itineraries i WHERE i.id = itinerary_id AND i.tourist_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.turismo_itineraries, public.turismo_itinerary_items FROM anon, authenticated;
GRANT SELECT ON public.turismo_itineraries, public.turismo_itinerary_items TO authenticated;

CREATE OR REPLACE FUNCTION public.turismo_save_itinerary(
  p_name TEXT, p_days INTEGER, p_interests TEXT[], p_budget_level TEXT, p_items JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE itinerary_id UUID; item_record RECORD; clean_interests TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_role('turista') OR public.turismo_current_user_has_role('usuario')) THEN RAISE EXCEPTION 'Solo un turista activo puede guardar itinerarios'; END IF;
  IF NULLIF(TRIM(p_name), '') IS NULL THEN RAISE EXCEPTION 'El nombre del itinerario es obligatorio'; END IF;
  IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'El itinerario debe tener entre 1 y 7 días'; END IF;
  IF p_budget_level NOT IN ('economico','moderado','premium','flexible') THEN RAISE EXCEPTION 'Presupuesto inválido'; END IF;
  IF COALESCE(array_length(p_interests, 1), 0) > 9 THEN RAISE EXCEPTION 'Puedes seleccionar máximo 9 intereses'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_interests, ARRAY[]::TEXT[])) value WHERE LOWER(TRIM(value)) NOT IN ('naturaleza','aventura','gastronomia','cultura','descanso','familia','artesania','eventos','alojamiento')) THEN RAISE EXCEPTION 'Un interés no es válido'; END IF;
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::TEXT[]) INTO clean_interests FROM (SELECT DISTINCT LOWER(TRIM(value)) value FROM unnest(COALESCE(p_interests, ARRAY[]::TEXT[])) value WHERE NULLIF(TRIM(value),'') IS NOT NULL) values_table;
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
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_role('turista') OR public.turismo_current_user_has_role('usuario')) THEN RAISE EXCEPTION 'Solo un turista activo puede eliminar itinerarios'; END IF;
  DELETE FROM public.turismo_itineraries WHERE id = p_itinerary_id AND tourist_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Itinerario no encontrado o no te pertenece'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'itinerary_deleted', p_itinerary_id::TEXT, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_intelligence_metrics()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE top_preferences JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_permission('platform:read') OR public.turismo_is_super_admin()) THEN RAISE EXCEPTION 'No tienes permiso para consultar métricas de inteligencia'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('preference', preference, 'count', preference_count) ORDER BY preference_count DESC), '[]'::jsonb) INTO top_preferences
  FROM (SELECT preference, COUNT(*) preference_count FROM public.turismo_tourist_profiles t, unnest(t.travel_preferences) preference WHERE NULLIF(TRIM(preference),'') IS NOT NULL GROUP BY preference LIMIT 9) preferences;
  RETURN jsonb_build_object(
    'published_catalog', (SELECT COUNT(*) FROM public.turismo_catalog_items WHERE status = 'published'),
    'tourists_with_preferences', (SELECT COUNT(*) FROM public.turismo_tourist_profiles WHERE COALESCE(array_length(travel_preferences, 1), 0) > 0),
    'saved_itineraries', (SELECT COUNT(*) FROM public.turismo_itineraries),
    'favorites_count', (SELECT COUNT(*) FROM public.turismo_favorites),
    'completed_reservations', (SELECT COUNT(*) FROM public.turismo_reservations WHERE status = 'completed'),
    'average_rating', COALESCE((SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM public.turismo_reviews WHERE status = 'published'), 0),
    'top_preferences', top_preferences
  );
END;
$$;

CREATE TABLE IF NOT EXISTS public.turismo_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  action_path TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS turismo_notifications_user_read_idx ON public.turismo_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS turismo_notifications_user_created_idx ON public.turismo_notifications(user_id, created_at DESC);
ALTER TABLE public.turismo_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_notifications_owner_select ON public.turismo_notifications;
CREATE POLICY turismo_notifications_owner_select ON public.turismo_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.turismo_notifications FROM anon, authenticated;
GRANT SELECT ON public.turismo_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.turismo_create_notification(
  p_user_id UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_entity_type TEXT DEFAULT NULL, p_entity_id UUID DEFAULT NULL, p_action_path TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE notification_id UUID;
BEGIN
  IF p_user_id IS NULL OR NULLIF(TRIM(p_type),'') IS NULL OR NULLIF(TRIM(p_title),'') IS NULL OR NULLIF(TRIM(p_body),'') IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.turismo_notifications(user_id, notification_type, title, body, entity_type, entity_id, action_path)
  VALUES (p_user_id, TRIM(p_type), TRIM(p_title), TRIM(p_body), p_entity_type, p_entity_id, p_action_path) RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.turismo_create_notification(UUID,TEXT,TEXT,TEXT,TEXT,UUID,TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.turismo_notify_catalog_status() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.provider_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('published','rejected','suspended') THEN
    PERFORM public.turismo_create_notification(NEW.provider_id, 'catalog_moderation', 'Estado de tu oferta actualizado', CASE NEW.status WHEN 'published' THEN 'Tu oferta fue publicada en el catálogo.' WHEN 'rejected' THEN 'Tu oferta fue rechazada durante la revisión.' ELSE 'Tu oferta fue suspendida temporalmente.' END, 'catalog_item', NEW.id, '/prestador_turistico');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS turismo_notify_catalog_status_trigger ON public.turismo_catalog_items;
CREATE TRIGGER turismo_notify_catalog_status_trigger AFTER UPDATE OF status ON public.turismo_catalog_items FOR EACH ROW EXECUTE FUNCTION public.turismo_notify_catalog_status();

CREATE OR REPLACE FUNCTION public.turismo_notify_reservation_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.provider_id IS NOT NULL THEN
    PERFORM public.turismo_create_notification(NEW.provider_id, 'reservation_created', 'Nueva solicitud de reserva', 'Recibiste una nueva solicitud de reserva.', 'reservation', NEW.id, '/prestador_turistico');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('confirmed','rejected','completed') THEN PERFORM public.turismo_create_notification(NEW.tourist_id, 'reservation_status', 'Estado de reserva actualizado', CASE NEW.status WHEN 'confirmed' THEN 'Tu reserva fue confirmada por el prestador.' WHEN 'rejected' THEN 'Tu solicitud de reserva fue rechazada.' ELSE 'Tu reserva fue marcada como completada.' END, 'reservation', NEW.id, '/turista/reservas'); END IF;
    IF NEW.status = 'cancelled' AND NEW.provider_id IS NOT NULL THEN PERFORM public.turismo_create_notification(NEW.provider_id, 'reservation_cancelled', 'Reserva cancelada', 'Una reserva fue cancelada por el turista.', 'reservation', NEW.id, '/prestador_turistico'); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS turismo_notify_reservation_insert_trigger ON public.turismo_reservations;
CREATE TRIGGER turismo_notify_reservation_insert_trigger AFTER INSERT ON public.turismo_reservations FOR EACH ROW EXECUTE FUNCTION public.turismo_notify_reservation_change();
DROP TRIGGER IF EXISTS turismo_notify_reservation_update_trigger ON public.turismo_reservations;
CREATE TRIGGER turismo_notify_reservation_update_trigger AFTER UPDATE OF status ON public.turismo_reservations FOR EACH ROW EXECUTE FUNCTION public.turismo_notify_reservation_change();

CREATE OR REPLACE FUNCTION public.turismo_notify_review_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('published','rejected') THEN PERFORM public.turismo_create_notification(NEW.tourist_id, 'review_moderation', 'Estado de tu reseña actualizado', CASE NEW.status WHEN 'published' THEN 'Tu reseña fue publicada.' ELSE 'Tu reseña no fue aprobada.' END, 'review', NEW.id, '/turista/reservas'); END IF;
  IF COALESCE(NULLIF(TRIM(OLD.provider_response),''),'') = '' AND NULLIF(TRIM(NEW.provider_response),'') IS NOT NULL THEN PERFORM public.turismo_create_notification(NEW.tourist_id, 'review_response', 'El prestador respondió tu reseña', 'Tienes una nueva respuesta a una reseña.', 'review', NEW.id, '/turista/reservas'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS turismo_notify_review_change_trigger ON public.turismo_reviews;
CREATE TRIGGER turismo_notify_review_change_trigger AFTER UPDATE OF status, provider_response ON public.turismo_reviews FOR EACH ROW EXECUTE FUNCTION public.turismo_notify_review_change();

CREATE OR REPLACE FUNCTION public.turismo_notify_support_message() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE requester UUID;
BEGIN
  IF NOT NEW.is_internal THEN SELECT requester_id INTO requester FROM public.turismo_support_tickets WHERE id = NEW.ticket_id; IF requester IS NOT NULL AND requester <> NEW.author_id THEN PERFORM public.turismo_create_notification(requester, 'support_response', 'Nueva respuesta de soporte', 'Tu solicitud de soporte tiene una nueva respuesta.', 'support_ticket', NEW.ticket_id, '/turista/asistencia'); END IF; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS turismo_notify_support_message_trigger ON public.turismo_support_messages;
CREATE TRIGGER turismo_notify_support_message_trigger AFTER INSERT ON public.turismo_support_messages FOR EACH ROW EXECUTE FUNCTION public.turismo_notify_support_message();

CREATE OR REPLACE FUNCTION public.turismo_notify_support_status() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN PERFORM public.turismo_create_notification(NEW.requester_id, 'support_status', 'Estado de soporte actualizado', 'El estado de tu solicitud de soporte fue actualizado.', 'support_ticket', NEW.id, '/turista/asistencia'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS turismo_notify_support_status_trigger ON public.turismo_support_tickets;
CREATE TRIGGER turismo_notify_support_status_trigger AFTER UPDATE OF status ON public.turismo_support_tickets FOR EACH ROW EXECUTE FUNCTION public.turismo_notify_support_status();

CREATE OR REPLACE FUNCTION public.turismo_notify_compliance_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR OLD.commercial_status IS DISTINCT FROM NEW.commercial_status) THEN PERFORM public.turismo_create_notification(NEW.provider_id, 'compliance', 'Estado de cumplimiento actualizado', 'Tu estado de cumplimiento fue actualizado.', 'provider_compliance', NEW.provider_id, '/prestador_turistico'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS turismo_notify_compliance_change_trigger ON public.turismo_provider_compliance;
CREATE TRIGGER turismo_notify_compliance_change_trigger AFTER INSERT OR UPDATE OF commercial_status ON public.turismo_provider_compliance FOR EACH ROW EXECUTE FUNCTION public.turismo_notify_compliance_change();

CREATE OR REPLACE FUNCTION public.turismo_notify_provider_rnt_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.rnt_status IS DISTINCT FROM NEW.rnt_status THEN PERFORM public.turismo_create_notification(NEW.profile_id, 'compliance', 'Estado de cumplimiento actualizado', 'Tu estado de cumplimiento fue actualizado.', 'provider_compliance', NEW.profile_id, '/prestador_turistico'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS turismo_notify_provider_rnt_change_trigger ON public.turismo_provider_profiles;
CREATE TRIGGER turismo_notify_provider_rnt_change_trigger AFTER UPDATE OF rnt_status ON public.turismo_provider_profiles FOR EACH ROW EXECUTE FUNCTION public.turismo_notify_provider_rnt_change();

CREATE OR REPLACE FUNCTION public.turismo_notify_commission_change() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF ((TG_OP = 'INSERT' AND NEW.status IN ('earned','paid')) OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('earned','paid'))) THEN PERFORM public.turismo_create_notification(NEW.affiliate_id, 'affiliate_commission', 'Comisión actualizada', CASE NEW.status WHEN 'earned' THEN 'Una comisión fue marcada como ganada.' ELSE 'Una comisión fue marcada como pagada.' END, 'commission', NEW.id, '/afiliado'); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS turismo_notify_commission_change_trigger ON public.turismo_affiliate_commissions;
CREATE TRIGGER turismo_notify_commission_change_trigger AFTER INSERT OR UPDATE OF status ON public.turismo_affiliate_commissions FOR EACH ROW EXECUTE FUNCTION public.turismo_notify_commission_change();

CREATE OR REPLACE FUNCTION public.turismo_mark_notification_read(p_notification_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'Autenticación y cuenta activa requeridas'; END IF;
  UPDATE public.turismo_notifications SET is_read = TRUE WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;
CREATE OR REPLACE FUNCTION public.turismo_mark_all_notifications_read()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'Autenticación y cuenta activa requeridas'; END IF;
  UPDATE public.turismo_notifications SET is_read = TRUE WHERE user_id = auth.uid() AND NOT is_read;
END;
$$;

REVOKE ALL ON FUNCTION public.turismo_set_catalog_availability(UUID,DATE,DATE,BOOLEAN,INTEGER,NUMERIC,TEXT), public.turismo_clear_catalog_availability(UUID,DATE,DATE), public.turismo_create_promotion(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ), public.turismo_update_promotion(UUID,UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ), public.turismo_deactivate_promotion(UUID), public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT,TEXT,TEXT), public.turismo_update_tourist_preferences(TEXT[]), public.turismo_save_itinerary(TEXT,INTEGER,TEXT[],TEXT,JSONB), public.turismo_delete_itinerary(UUID), public.turismo_get_intelligence_metrics(), public.turismo_mark_notification_read(UUID), public.turismo_mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_set_catalog_availability(UUID,DATE,DATE,BOOLEAN,INTEGER,NUMERIC,TEXT), public.turismo_clear_catalog_availability(UUID,DATE,DATE), public.turismo_create_promotion(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ), public.turismo_update_promotion(UUID,UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ), public.turismo_deactivate_promotion(UUID), public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT,TEXT,TEXT), public.turismo_update_tourist_preferences(TEXT[]), public.turismo_save_itinerary(TEXT,INTEGER,TEXT[],TEXT,JSONB), public.turismo_delete_itinerary(UUID), public.turismo_get_intelligence_metrics(), public.turismo_mark_notification_read(UUID), public.turismo_mark_all_notifications_read() TO authenticated;

COMMIT;
