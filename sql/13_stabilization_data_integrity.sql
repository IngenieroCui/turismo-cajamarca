-- Turismo Cajamarca: QA-1 data integrity and cross-role stabilization.
BEGIN;

UPDATE public.turismo_platform_settings SET is_public = TRUE WHERE key = 'maintenance_mode';

CREATE OR REPLACE FUNCTION public.turismo_get_system_health()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_permission('devops:infra_manage') OR public.turismo_is_super_admin()) THEN
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
    'schema_version', 13
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_apply_default_affiliate_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.commission_rate IS NULL THEN
    NEW.commission_rate := COALESCE((SELECT CASE WHEN jsonb_typeof(value) = 'number' THEN value::text::numeric END FROM public.turismo_platform_settings WHERE key = 'default_affiliate_commission_rate'), 5);
  END IF;
  RETURN NEW;
END;
$$;
ALTER TABLE public.turismo_affiliate_profiles ALTER COLUMN commission_rate DROP DEFAULT;
DROP TRIGGER IF EXISTS turismo_affiliate_profiles_default_commission ON public.turismo_affiliate_profiles;
CREATE TRIGGER turismo_affiliate_profiles_default_commission BEFORE INSERT ON public.turismo_affiliate_profiles FOR EACH ROW EXECUTE FUNCTION public.turismo_apply_default_affiliate_commission();

CREATE OR REPLACE FUNCTION public.turismo_can_read_provider_context(p_provider_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND public.turismo_current_user_is_active()
    AND EXISTS (SELECT 1 FROM public.turismo_provider_profiles pp JOIN public.turismo_profiles owner_profile ON owner_profile.id = pp.profile_id WHERE pp.profile_id = p_provider_id AND owner_profile.is_active)
    AND (auth.uid() = p_provider_id OR EXISTS (SELECT 1 FROM public.turismo_provider_collaborators c WHERE c.provider_id = p_provider_id AND c.collaborator_id = auth.uid() AND c.status = 'active' AND cardinality(c.permissions) > 0));
$$;
REVOKE ALL ON FUNCTION public.turismo_can_read_provider_context(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_can_read_provider_context(UUID) TO authenticated;

ALTER TABLE public.turismo_catalog_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_catalog_collaborator_read ON public.turismo_catalog_items;
CREATE POLICY turismo_catalog_collaborator_read ON public.turismo_catalog_items FOR SELECT TO authenticated USING (provider_id = auth.uid() OR public.turismo_can_read_provider_context(provider_id));

ALTER TABLE public.turismo_catalog_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_availability_collaborator_read ON public.turismo_catalog_availability;
CREATE POLICY turismo_availability_collaborator_read ON public.turismo_catalog_availability FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.turismo_catalog_items i WHERE i.id = item_id AND public.turismo_can_manage_provider(i.provider_id, 'availability')));

DROP FUNCTION IF EXISTS public.turismo_submit_catalog_item(UUID, UUID);
CREATE OR REPLACE FUNCTION public.turismo_submit_catalog_item(p_item_id UUID, p_provider_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid()); item_row public.turismo_catalog_items%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value, 'catalog') THEN RAISE EXCEPTION 'No tienes permiso para enviar ofertas'; END IF;
  SELECT * INTO item_row FROM public.turismo_catalog_items WHERE id = p_item_id AND provider_id = provider_id_value;
  IF NOT FOUND OR item_row.status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'La oferta no está disponible para envío'; END IF;
  IF NULLIF(TRIM(item_row.title),'') IS NULL OR NULLIF(TRIM(item_row.short_description),'') IS NULL OR NULLIF(TRIM(item_row.location),'') IS NULL OR NULLIF(TRIM(item_row.cover_image_url),'') IS NULL THEN RAISE EXCEPTION 'Completa título, descripción corta, ubicación e imagen'; END IF;
  UPDATE public.turismo_catalog_items SET status = 'pending_review', moderation_reason = NULL, updated_at = NOW() WHERE id = p_item_id;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'catalog_item_submitted', p_item_id::TEXT, jsonb_build_object('provider_id', provider_id_value));
END;
$$;

DROP FUNCTION IF EXISTS public.turismo_archive_catalog_item(UUID, UUID);
CREATE OR REPLACE FUNCTION public.turismo_archive_catalog_item(p_item_id UUID, p_provider_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value, 'catalog') THEN RAISE EXCEPTION 'No tienes permiso para archivar ofertas'; END IF;
  UPDATE public.turismo_catalog_items SET status = 'archived', updated_at = NOW() WHERE id = p_item_id AND provider_id = provider_id_value AND status IN ('draft','rejected','published');
  IF NOT FOUND THEN RAISE EXCEPTION 'La oferta no existe o no se puede archivar'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'catalog_item_archived', p_item_id::TEXT, jsonb_build_object('provider_id', provider_id_value));
END;
$$;

DROP FUNCTION IF EXISTS public.turismo_set_catalog_availability(UUID, DATE, DATE, BOOLEAN, INTEGER, NUMERIC, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.turismo_set_catalog_availability(p_item_id UUID, p_start_date DATE, p_end_date DATE, p_is_available BOOLEAN, p_capacity INTEGER DEFAULT NULL, p_price_override NUMERIC DEFAULT NULL, p_notes TEXT DEFAULT NULL, p_provider_id UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid()); day_value DATE; affected_days INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value, 'availability') THEN RAISE EXCEPTION 'No tienes permiso para gestionar disponibilidad'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date < CURRENT_DATE OR p_end_date < p_start_date OR p_end_date > p_start_date + 179 THEN RAISE EXCEPTION 'El rango de disponibilidad no es válido'; END IF;
  IF p_capacity IS NOT NULL AND p_capacity < 1 THEN RAISE EXCEPTION 'La capacidad debe ser al menos 1'; END IF;
  IF p_price_override IS NOT NULL AND p_price_override < 0 THEN RAISE EXCEPTION 'El precio especial no puede ser negativo'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = p_item_id AND provider_id = provider_id_value AND status <> 'archived') THEN RAISE EXCEPTION 'La oferta no existe o no pertenece al negocio'; END IF;
  FOR day_value IN SELECT generate_series(p_start_date, p_end_date, '1 day')::DATE LOOP
    INSERT INTO public.turismo_catalog_availability(item_id, available_date, is_available, capacity, price_override, notes) VALUES (p_item_id, day_value, COALESCE(p_is_available, TRUE), p_capacity, p_price_override, NULLIF(TRIM(p_notes), ''))
    ON CONFLICT (item_id, available_date) DO UPDATE SET is_available = EXCLUDED.is_available, capacity = EXCLUDED.capacity, price_override = EXCLUDED.price_override, notes = EXCLUDED.notes, updated_at = NOW();
    affected_days := affected_days + 1;
  END LOOP;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'catalog_availability_updated', p_item_id::TEXT, jsonb_build_object('provider_id', provider_id_value, 'item_id', p_item_id, 'start_date', p_start_date, 'end_date', p_end_date, 'days', affected_days));
  RETURN affected_days;
END;
$$;

DROP FUNCTION IF EXISTS public.turismo_clear_catalog_availability(UUID, DATE, DATE, UUID);
CREATE OR REPLACE FUNCTION public.turismo_clear_catalog_availability(p_item_id UUID, p_start_date DATE, p_end_date DATE, p_provider_id UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid()); affected_days INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value, 'availability') THEN RAISE EXCEPTION 'No tienes permiso para gestionar disponibilidad'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date < CURRENT_DATE OR p_end_date < p_start_date OR p_end_date > p_start_date + 179 THEN RAISE EXCEPTION 'El rango de disponibilidad no es válido'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = p_item_id AND provider_id = provider_id_value) THEN RAISE EXCEPTION 'La oferta no pertenece al negocio'; END IF;
  DELETE FROM public.turismo_catalog_availability WHERE item_id = p_item_id AND available_date >= CURRENT_DATE AND available_date BETWEEN p_start_date AND p_end_date;
  GET DIAGNOSTICS affected_days = ROW_COUNT;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'catalog_availability_cleared', p_item_id::TEXT, jsonb_build_object('provider_id', provider_id_value, 'item_id', p_item_id, 'start_date', p_start_date, 'end_date', p_end_date, 'days', affected_days));
  RETURN affected_days;
END;
$$;

DROP FUNCTION IF EXISTS public.turismo_create_promotion(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
CREATE OR REPLACE FUNCTION public.turismo_create_promotion(p_item_id UUID, p_title TEXT, p_description TEXT, p_code TEXT, p_promotion_type TEXT, p_discount_value NUMERIC, p_starts_at TIMESTAMPTZ, p_ends_at TIMESTAMPTZ, p_provider_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid()); promotion_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value, 'promotions') THEN RAISE EXCEPTION 'No tienes permiso para gestionar promociones'; END IF;
  IF NOT public.turismo_feature_enabled('promotions_enabled') THEN RAISE EXCEPTION 'Las promociones están deshabilitadas temporalmente'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF NULLIF(TRIM(p_title), '') IS NULL OR p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'Título y fechas válidas son obligatorios'; END IF;
  IF p_promotion_type NOT IN ('percentage','fixed','benefit') THEN RAISE EXCEPTION 'Tipo de promoción inválido'; END IF;
  IF p_promotion_type = 'percentage' AND (p_discount_value IS NULL OR p_discount_value <= 0 OR p_discount_value > 100) THEN RAISE EXCEPTION 'El porcentaje debe estar entre 0 y 100'; END IF;
  IF p_promotion_type = 'fixed' AND (p_discount_value IS NULL OR p_discount_value <= 0) THEN RAISE EXCEPTION 'El descuento fijo debe ser mayor que cero'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = p_item_id AND provider_id = provider_id_value AND status <> 'archived') THEN RAISE EXCEPTION 'La oferta no existe, no pertenece al negocio o está archivada'; END IF;
  INSERT INTO public.turismo_promotions(provider_id, item_id, title, description, code, promotion_type, discount_value, starts_at, ends_at) VALUES (provider_id_value, p_item_id, TRIM(p_title), NULLIF(TRIM(p_description), ''), NULLIF(TRIM(p_code), ''), p_promotion_type, p_discount_value, p_starts_at, p_ends_at) RETURNING id INTO promotion_id;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'promotion_created', promotion_id::TEXT, jsonb_build_object('provider_id', provider_id_value, 'item_id', p_item_id, 'promotion_type', p_promotion_type));
  RETURN promotion_id;
END;
$$;

DROP FUNCTION IF EXISTS public.turismo_update_promotion(UUID, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
CREATE OR REPLACE FUNCTION public.turismo_update_promotion(p_promotion_id UUID, p_item_id UUID, p_title TEXT, p_description TEXT, p_code TEXT, p_promotion_type TEXT, p_discount_value NUMERIC, p_starts_at TIMESTAMPTZ, p_ends_at TIMESTAMPTZ, p_provider_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid()); promotion_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value, 'promotions') THEN RAISE EXCEPTION 'No tienes permiso para gestionar promociones'; END IF;
  IF NOT public.turismo_feature_enabled('promotions_enabled') THEN RAISE EXCEPTION 'Las promociones están deshabilitadas temporalmente'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF NULLIF(TRIM(p_title), '') IS NULL OR p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'Título y fechas válidas son obligatorios'; END IF;
  IF p_promotion_type NOT IN ('percentage','fixed','benefit') OR (p_promotion_type = 'percentage' AND (p_discount_value IS NULL OR p_discount_value <= 0 OR p_discount_value > 100)) OR (p_promotion_type = 'fixed' AND (p_discount_value IS NULL OR p_discount_value <= 0)) THEN RAISE EXCEPTION 'Los datos de promoción no son válidos'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = p_item_id AND provider_id = provider_id_value AND status <> 'archived') THEN RAISE EXCEPTION 'La oferta no existe, no pertenece al negocio o está archivada'; END IF;
  UPDATE public.turismo_promotions SET item_id = p_item_id, title = TRIM(p_title), description = NULLIF(TRIM(p_description), ''), code = NULLIF(TRIM(p_code), ''), promotion_type = p_promotion_type, discount_value = p_discount_value, starts_at = p_starts_at, ends_at = p_ends_at, updated_at = NOW() WHERE id = p_promotion_id AND provider_id = provider_id_value RETURNING id INTO promotion_id;
  IF promotion_id IS NULL THEN RAISE EXCEPTION 'La promoción no existe o no pertenece al negocio'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'promotion_updated', promotion_id::TEXT, jsonb_build_object('provider_id', provider_id_value, 'item_id', p_item_id, 'promotion_type', p_promotion_type));
  RETURN promotion_id;
END;
$$;

DROP FUNCTION IF EXISTS public.turismo_deactivate_promotion(UUID, UUID);
CREATE OR REPLACE FUNCTION public.turismo_deactivate_promotion(p_promotion_id UUID, p_provider_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value, 'promotions') THEN RAISE EXCEPTION 'No tienes permiso para gestionar promociones'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  UPDATE public.turismo_promotions SET is_active = FALSE, updated_at = NOW() WHERE id = p_promotion_id AND provider_id = provider_id_value;
  IF NOT FOUND THEN RAISE EXCEPTION 'La promoción no existe o no pertenece al negocio'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'promotion_deactivated', p_promotion_id::TEXT, jsonb_build_object('provider_id', provider_id_value));
END;
$$;

DROP FUNCTION IF EXISTS public.turismo_provider_update_reservation(UUID, TEXT, NUMERIC, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.turismo_provider_update_reservation(p_reservation_id UUID, p_action TEXT, p_quoted_amount NUMERIC DEFAULT NULL, p_response TEXT DEFAULT NULL, p_provider_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE provider_id_value UUID := COALESCE(p_provider_id, auth.uid()); current_status TEXT; next_status TEXT; reservation_row public.turismo_reservations%ROWTYPE; effective_amount NUMERIC; rate_value NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_can_manage_provider(provider_id_value, 'reservations') THEN RAISE EXCEPTION 'No tienes permiso para gestionar reservas'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id = p_reservation_id AND provider_id = provider_id_value;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada o no pertenece al negocio'; END IF;
  current_status := reservation_row.status; next_status := CASE WHEN p_action = 'confirm' AND current_status = 'requested' THEN 'confirmed' WHEN p_action = 'reject' AND current_status = 'requested' THEN 'rejected' WHEN p_action = 'complete' AND current_status = 'confirmed' THEN 'completed' ELSE NULL END;
  IF next_status IS NULL THEN RAISE EXCEPTION 'Transición de reserva inválida'; END IF;
  effective_amount := COALESCE(p_quoted_amount, reservation_row.quoted_amount, 0); rate_value := COALESCE(reservation_row.commission_rate_snapshot, 0);
  UPDATE public.turismo_reservations SET status = next_status, quoted_amount = COALESCE(p_quoted_amount, quoted_amount), provider_response = COALESCE(NULLIF(TRIM(p_response), ''), provider_response), updated_at = NOW() WHERE id = p_reservation_id;
  IF reservation_row.affiliate_id IS NOT NULL AND next_status = 'confirmed' AND effective_amount > 0 THEN
    INSERT INTO public.turismo_affiliate_commissions(affiliate_id, reservation_id, rate, base_amount, amount, currency, status) VALUES (reservation_row.affiliate_id, p_reservation_id, rate_value, effective_amount, effective_amount * rate_value / 100, COALESCE(reservation_row.currency, 'COP'), 'pending')
    ON CONFLICT (reservation_id) DO UPDATE SET affiliate_id = EXCLUDED.affiliate_id, rate = EXCLUDED.rate, base_amount = EXCLUDED.base_amount, amount = EXCLUDED.amount, currency = EXCLUDED.currency, status = 'pending';
  ELSIF reservation_row.affiliate_id IS NOT NULL AND next_status = 'completed' THEN
    INSERT INTO public.turismo_affiliate_commissions(affiliate_id, reservation_id, rate, base_amount, amount, currency, status, earned_at) VALUES (reservation_row.affiliate_id, p_reservation_id, rate_value, effective_amount, effective_amount * rate_value / 100, COALESCE(reservation_row.currency, 'COP'), 'earned', NOW())
    ON CONFLICT (reservation_id) DO UPDATE SET affiliate_id = EXCLUDED.affiliate_id, rate = EXCLUDED.rate, base_amount = EXCLUDED.base_amount, amount = EXCLUDED.amount, currency = EXCLUDED.currency, status = 'earned', earned_at = COALESCE(turismo_affiliate_commissions.earned_at, NOW());
    PERFORM public.turismo_recalculate_affiliate_earnings(reservation_row.affiliate_id);
    INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'affiliate_commission_earned', p_reservation_id::TEXT, jsonb_build_object('affiliate_id', reservation_row.affiliate_id));
  ELSIF reservation_row.affiliate_id IS NOT NULL AND next_status = 'rejected' THEN
    UPDATE public.turismo_affiliate_commissions SET status = 'void' WHERE reservation_id = p_reservation_id;
    PERFORM public.turismo_recalculate_affiliate_earnings(reservation_row.affiliate_id);
  END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), CASE next_status WHEN 'confirmed' THEN 'reservation_confirmed' WHEN 'rejected' THEN 'reservation_rejected' ELSE 'reservation_completed' END, p_reservation_id::TEXT, jsonb_build_object('provider_id', provider_id_value));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_cancel_reservation(p_reservation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affiliate_id_value UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:book') THEN RAISE EXCEPTION 'No tienes permiso para cancelar reservas'; END IF;
  UPDATE public.turismo_reservations SET status = 'cancelled', updated_at = NOW() WHERE id = p_reservation_id AND tourist_id = auth.uid() AND status IN ('requested','confirmed') RETURNING affiliate_id INTO affiliate_id_value;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada o no se puede cancelar'; END IF;
  IF affiliate_id_value IS NOT NULL THEN UPDATE public.turismo_affiliate_commissions SET status = 'void' WHERE reservation_id = p_reservation_id; PERFORM public.turismo_recalculate_affiliate_earnings(affiliate_id_value); END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'reservation_cancelled', p_reservation_id::TEXT, '{}'::jsonb);
END;
$$;

DROP FUNCTION IF EXISTS public.turismo_create_support_ticket(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION public.turismo_create_support_ticket(p_category TEXT, p_subject TEXT, p_description TEXT, p_priority TEXT DEFAULT 'normal', p_reservation_id UUID DEFAULT NULL, p_catalog_item_id UUID DEFAULT NULL, p_provider_context_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created_id UUID; reservation_row public.turismo_reservations%ROWTYPE; catalog_provider_id UUID; has_manage BOOLEAN;
BEGIN
  IF NOT public.turismo_feature_enabled('support_enabled') THEN RAISE EXCEPTION 'El soporte está deshabilitado temporalmente'; END IF;
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'Autenticación y cuenta activa requeridas'; END IF;
  IF p_category IS NULL OR p_category NOT IN ('reservation','catalog','account','refund','technical','other') THEN RAISE EXCEPTION 'Categoría de soporte inválida'; END IF;
  IF p_priority IS NULL OR p_priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'Prioridad inválida'; END IF;
  IF NULLIF(TRIM(p_subject), '') IS NULL OR NULLIF(TRIM(p_description), '') IS NULL THEN RAISE EXCEPTION 'Asunto y descripción son obligatorios'; END IF;
  has_manage := public.turismo_current_user_has_permission('support:tickets_manage');
  IF p_provider_context_id IS NOT NULL AND NOT public.turismo_can_manage_provider(p_provider_context_id, 'support') THEN RAISE EXCEPTION 'No puedes usar ese negocio como contexto'; END IF;
  IF p_reservation_id IS NOT NULL THEN
    SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id = p_reservation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'La reserva no existe'; END IF;
    IF p_provider_context_id IS NOT NULL AND reservation_row.provider_id <> p_provider_context_id THEN RAISE EXCEPTION 'La reserva no pertenece al negocio indicado'; END IF;
    IF reservation_row.tourist_id <> auth.uid() AND NOT has_manage AND NOT (p_provider_context_id IS NOT NULL AND reservation_row.provider_id = p_provider_context_id AND public.turismo_can_manage_provider(p_provider_context_id, 'support')) THEN RAISE EXCEPTION 'No puedes vincular esa reserva a un ticket'; END IF;
  END IF;
  IF p_catalog_item_id IS NOT NULL THEN
    SELECT provider_id INTO catalog_provider_id FROM public.turismo_catalog_items WHERE id = p_catalog_item_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'La oferta vinculada no existe'; END IF;
    IF p_provider_context_id IS NOT NULL AND catalog_provider_id <> p_provider_context_id THEN RAISE EXCEPTION 'La oferta no pertenece al negocio indicado'; END IF;
  END IF;
  INSERT INTO public.turismo_support_tickets(requester_id, category, reservation_id, catalog_item_id, provider_context_id, subject, description, priority, status) VALUES (auth.uid(), p_category, p_reservation_id, p_catalog_item_id, p_provider_context_id, TRIM(p_subject), TRIM(p_description), p_priority, 'open') RETURNING id INTO created_id;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'support_ticket_created', created_id::TEXT, jsonb_build_object('category', p_category, 'priority', p_priority, 'provider_context_id', p_provider_context_id, 'has_reservation', p_reservation_id IS NOT NULL, 'has_catalog_item', p_catalog_item_id IS NOT NULL));
  RETURN created_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_register_referral_visit(p_referral_code TEXT, p_visitor_token TEXT, p_landing_path TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affiliate_id_value UUID;
BEGIN
  IF NOT public.turismo_feature_enabled('referrals_enabled') OR public.turismo_maintenance_blocks() OR NULLIF(TRIM(p_referral_code), '') IS NULL OR NULLIF(TRIM(p_visitor_token), '') IS NULL THEN RETURN FALSE; END IF;
  SELECT a.profile_id INTO affiliate_id_value FROM public.turismo_affiliate_profiles a JOIN public.turismo_profiles p ON p.id = a.profile_id AND p.is_active JOIN public.turismo_user_roles ur ON ur.user_id = a.profile_id AND ur.is_active JOIN public.turismo_roles r ON r.id = ur.role_id AND r.is_active AND r.code IN ('afiliado','embajador') WHERE LOWER(a.referral_code) = LOWER(TRIM(p_referral_code)) LIMIT 1;
  IF affiliate_id_value IS NULL THEN RETURN FALSE; END IF;
  INSERT INTO public.turismo_referral_visits(affiliate_id, referral_code, visitor_token, landing_path) VALUES (affiliate_id_value, TRIM(p_referral_code), TRIM(p_visitor_token), p_landing_path) ON CONFLICT (affiliate_id, visitor_token) DO NOTHING;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_declare_external_payment(p_reservation_id UUID, p_method TEXT, p_external_reference TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reservation_row public.turismo_reservations%ROWTYPE; payment_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:book') THEN RAISE EXCEPTION 'Solo un usuario con permiso de reserva puede registrar pagos'; END IF;
  IF public.turismo_maintenance_blocks() THEN RAISE EXCEPTION 'La plataforma está en mantenimiento'; END IF;
  IF p_method NOT IN ('nequi','daviplata','bank_transfer','cash_provider') OR (p_method = 'bank_transfer' AND NULLIF(TRIM(p_external_reference), '') IS NULL) THEN RAISE EXCEPTION 'Método o referencia inválida'; END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id = p_reservation_id AND tourist_id = auth.uid() AND status IN ('confirmed','completed');
  IF NOT FOUND OR reservation_row.quoted_amount IS NULL OR reservation_row.quoted_amount <= 0 THEN RAISE EXCEPTION 'Solo puedes registrar pagos de reservas confirmadas o completadas con cotización'; END IF;
  INSERT INTO public.turismo_payment_records(reservation_id, tourist_id, provider_id, amount, currency, method, external_reference, notes) VALUES (p_reservation_id, auth.uid(), reservation_row.provider_id, reservation_row.quoted_amount, reservation_row.currency, p_method, NULLIF(TRIM(p_external_reference), ''), NULLIF(TRIM(p_notes), '')) RETURNING id INTO payment_id;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'external_payment_declared', payment_id::TEXT, jsonb_build_object('reservation_id', p_reservation_id, 'method', p_method));
  RETURN payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_my_account_deletion_request()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  RETURN (SELECT to_jsonb(r) FROM public.turismo_account_deletion_requests r WHERE r.user_id = auth.uid() AND r.status = 'pending' LIMIT 1);
END;
$$;
CREATE OR REPLACE FUNCTION public.turismo_cancel_account_deletion_request()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  UPDATE public.turismo_account_deletion_requests SET status = 'cancelled' WHERE user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'No tienes una solicitud pendiente'; END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.turismo_get_pending_account_deletion_requests()
RETURNS SETOF JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_is_super_admin() THEN RAISE EXCEPTION 'Solo Super Admin puede consultar solicitudes'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id', r.id, 'user_id', r.user_id, 'email', p.email, 'full_name', p.full_name, 'reason', r.reason, 'status', r.status, 'requested_at', r.requested_at, 'reviewed_at', r.reviewed_at, 'reviewed_by', r.reviewed_by, 'review_note', r.review_note) FROM public.turismo_account_deletion_requests r JOIN public.turismo_profiles p ON p.id = r.user_id WHERE r.status = 'pending' ORDER BY r.requested_at;
END;
$$;
CREATE OR REPLACE FUNCTION public.turismo_review_account_deletion_request(p_request_id UUID, p_decision TEXT, p_note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_is_super_admin() OR p_decision NOT IN ('approve','reject') THEN RAISE EXCEPTION 'Solo Super Admin activo puede revisar solicitudes'; END IF;
  UPDATE public.turismo_account_deletion_requests SET status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END, reviewed_at = NOW(), reviewed_by = auth.uid(), review_note = NULLIF(TRIM(p_note), '') WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada o ya revisada'; END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.turismo_export_my_data(), public.turismo_request_account_deletion(TEXT), public.turismo_get_my_account_deletion_request(), public.turismo_cancel_account_deletion_request(), public.turismo_get_pending_account_deletion_requests(), public.turismo_review_account_deletion_request(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_export_my_data(), public.turismo_request_account_deletion(TEXT), public.turismo_get_my_account_deletion_request(), public.turismo_cancel_account_deletion_request(), public.turismo_get_pending_account_deletion_requests(), public.turismo_review_account_deletion_request(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_export_my_data(), public.turismo_request_account_deletion(TEXT), public.turismo_get_my_account_deletion_request(), public.turismo_cancel_account_deletion_request(), public.turismo_get_pending_account_deletion_requests(), public.turismo_review_account_deletion_request(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.turismo_provider_update_reservation(UUID, TEXT, NUMERIC, TEXT, UUID), public.turismo_cancel_reservation(UUID), public.turismo_set_catalog_availability(UUID, DATE, DATE, BOOLEAN, INTEGER, NUMERIC, TEXT, UUID), public.turismo_clear_catalog_availability(UUID, DATE, DATE, UUID), public.turismo_create_promotion(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, UUID), public.turismo_update_promotion(UUID, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, UUID), public.turismo_deactivate_promotion(UUID, UUID), public.turismo_create_support_ticket(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID), public.turismo_register_referral_visit(TEXT, TEXT, TEXT), public.turismo_declare_external_payment(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_provider_update_reservation(UUID, TEXT, NUMERIC, TEXT, UUID), public.turismo_cancel_reservation(UUID), public.turismo_set_catalog_availability(UUID, DATE, DATE, BOOLEAN, INTEGER, NUMERIC, TEXT, UUID), public.turismo_clear_catalog_availability(UUID, DATE, DATE, UUID), public.turismo_create_promotion(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, UUID), public.turismo_update_promotion(UUID, UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, UUID), public.turismo_deactivate_promotion(UUID, UUID), public.turismo_create_support_ticket(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID), public.turismo_register_referral_visit(TEXT, TEXT, TEXT), public.turismo_declare_external_payment(UUID, TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.turismo_register_referral_visit(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.turismo_register_referral_visit(TEXT, TEXT, TEXT) TO anon, authenticated;

INSERT INTO public.turismo_schema_version(version, migration_name) VALUES (13, '13_stabilization_data_integrity.sql') ON CONFLICT (version) DO NOTHING;
COMMIT;
