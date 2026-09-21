-- Turismo Cajamarca: marketplace core.
-- Run after 08_refactor_rbac_multi_role.sql. The script is idempotent.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.turismo_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('atractivo','alojamiento','gastronomia','tour','evento','artesania')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  short_description TEXT NOT NULL,
  description TEXT,
  location TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  cover_image_url TEXT,
  contact_whatsapp TEXT,
  price_from NUMERIC(12,2),
  price_to NUMERIC(12,2),
  price_label TEXT,
  currency TEXT NOT NULL DEFAULT 'COP',
  duration_text TEXT,
  difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('facil','moderado','exigente')),
  is_reservable BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','published','rejected','suspended','archived')),
  moderation_reason TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS turismo_catalog_items_provider_idx ON public.turismo_catalog_items(provider_id);
CREATE INDEX IF NOT EXISTS turismo_catalog_items_type_idx ON public.turismo_catalog_items(item_type);
CREATE INDEX IF NOT EXISTS turismo_catalog_items_status_idx ON public.turismo_catalog_items(status);
CREATE INDEX IF NOT EXISTS turismo_catalog_items_category_idx ON public.turismo_catalog_items(category);
CREATE INDEX IF NOT EXISTS turismo_catalog_items_featured_idx ON public.turismo_catalog_items(is_featured);
CREATE INDEX IF NOT EXISTS turismo_catalog_items_published_at_idx ON public.turismo_catalog_items(published_at);

CREATE TABLE IF NOT EXISTS public.turismo_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.turismo_catalog_items(id) ON DELETE RESTRICT,
  tourist_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  provider_id UUID NULL REFERENCES public.turismo_profiles(id) ON DELETE SET NULL,
  reservation_date DATE NOT NULL,
  end_date DATE,
  guests INTEGER NOT NULL DEFAULT 1 CHECK (guests >= 1),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','rejected','cancelled','completed')),
  quoted_amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'COP',
  provider_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= reservation_date)
);

CREATE INDEX IF NOT EXISTS turismo_reservations_tourist_idx ON public.turismo_reservations(tourist_id);
CREATE INDEX IF NOT EXISTS turismo_reservations_provider_idx ON public.turismo_reservations(provider_id);
CREATE INDEX IF NOT EXISTS turismo_reservations_item_idx ON public.turismo_reservations(item_id);
CREATE INDEX IF NOT EXISTS turismo_reservations_status_idx ON public.turismo_reservations(status);
CREATE INDEX IF NOT EXISTS turismo_reservations_date_idx ON public.turismo_reservations(reservation_date);

CREATE TABLE IF NOT EXISTS public.turismo_favorites (
  user_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.turismo_catalog_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.turismo_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.turismo_catalog_items(id) ON DELETE CASCADE,
  tourist_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.turismo_reservations(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected')),
  moderation_reason TEXT,
  provider_response TEXT,
  provider_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reservation_id)
);

CREATE INDEX IF NOT EXISTS turismo_reviews_item_idx ON public.turismo_reviews(item_id);
CREATE INDEX IF NOT EXISTS turismo_reviews_tourist_idx ON public.turismo_reviews(tourist_id);
CREATE INDEX IF NOT EXISTS turismo_reviews_status_idx ON public.turismo_reviews(status);

CREATE OR REPLACE FUNCTION public.turismo_marketplace_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS turismo_catalog_items_touch_updated_at ON public.turismo_catalog_items;
CREATE TRIGGER turismo_catalog_items_touch_updated_at BEFORE UPDATE ON public.turismo_catalog_items FOR EACH ROW EXECUTE FUNCTION public.turismo_marketplace_touch_updated_at();
DROP TRIGGER IF EXISTS turismo_reservations_touch_updated_at ON public.turismo_reservations;
CREATE TRIGGER turismo_reservations_touch_updated_at BEFORE UPDATE ON public.turismo_reservations FOR EACH ROW EXECUTE FUNCTION public.turismo_marketplace_touch_updated_at();
DROP TRIGGER IF EXISTS turismo_reviews_touch_updated_at ON public.turismo_reviews;
CREATE TRIGGER turismo_reviews_touch_updated_at BEFORE UPDATE ON public.turismo_reviews FOR EACH ROW EXECUTE FUNCTION public.turismo_marketplace_touch_updated_at();

CREATE OR REPLACE FUNCTION public.turismo_create_catalog_item(
  p_item_type TEXT, p_title TEXT, p_slug TEXT, p_category TEXT, p_short_description TEXT, p_description TEXT,
  p_location TEXT, p_address TEXT, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION, p_cover_image_url TEXT,
  p_contact_whatsapp TEXT, p_price_from NUMERIC, p_price_to NUMERIC, p_price_label TEXT, p_currency TEXT,
  p_duration_text TEXT, p_difficulty TEXT, p_is_reservable BOOLEAN, p_metadata JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'La cuenta está inactiva'; END IF;
  IF NOT public.turismo_current_user_has_permission('provider:catalog_manage') OR NOT public.turismo_current_user_has_role('prestador_turistico') THEN RAISE EXCEPTION 'No tienes permiso para gestionar el catálogo'; END IF;
  IF NULLIF(TRIM(p_title), '') IS NULL OR NULLIF(TRIM(p_short_description), '') IS NULL OR NULLIF(TRIM(p_slug), '') IS NULL THEN RAISE EXCEPTION 'Título, slug y descripción corta son obligatorios'; END IF;
  INSERT INTO public.turismo_catalog_items(provider_id,item_type,title,slug,category,short_description,description,location,address,latitude,longitude,cover_image_url,contact_whatsapp,price_from,price_to,price_label,currency,duration_text,difficulty,is_reservable,metadata,status)
  VALUES(auth.uid(),p_item_type,TRIM(p_title),TRIM(p_slug),NULLIF(TRIM(p_category),''),TRIM(p_short_description),NULLIF(TRIM(p_description),''),NULLIF(TRIM(p_location),''),NULLIF(TRIM(p_address),''),p_latitude,p_longitude,NULLIF(TRIM(p_cover_image_url),''),NULLIF(TRIM(p_contact_whatsapp),''),p_price_from,p_price_to,NULLIF(TRIM(p_price_label),''),COALESCE(NULLIF(TRIM(p_currency),''),'COP'),NULLIF(TRIM(p_duration_text),''),NULLIF(TRIM(p_difficulty),''),COALESCE(p_is_reservable,FALSE),COALESCE(p_metadata,'{}'::jsonb),'draft')
  RETURNING id INTO created_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'catalog_item_created',created_id::TEXT,jsonb_build_object('item_type',p_item_type));
  RETURN created_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_catalog_item(
  p_item_id UUID, p_item_type TEXT, p_title TEXT, p_slug TEXT, p_category TEXT, p_short_description TEXT, p_description TEXT,
  p_location TEXT, p_address TEXT, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION, p_cover_image_url TEXT,
  p_contact_whatsapp TEXT, p_price_from NUMERIC, p_price_to NUMERIC, p_price_label TEXT, p_currency TEXT,
  p_duration_text TEXT, p_difficulty TEXT, p_is_reservable BOOLEAN, p_metadata JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'La cuenta está inactiva'; END IF;
  IF NOT public.turismo_current_user_has_permission('provider:catalog_manage') OR NOT public.turismo_current_user_has_role('prestador_turistico') THEN RAISE EXCEPTION 'No tienes permiso para gestionar el catálogo'; END IF;
  IF NULLIF(TRIM(p_title), '') IS NULL OR NULLIF(TRIM(p_short_description), '') IS NULL OR NULLIF(TRIM(p_slug), '') IS NULL THEN RAISE EXCEPTION 'Título, slug y descripción corta son obligatorios'; END IF;
  UPDATE public.turismo_catalog_items SET item_type=p_item_type,title=TRIM(p_title),slug=TRIM(p_slug),category=NULLIF(TRIM(p_category),''),short_description=TRIM(p_short_description),description=NULLIF(TRIM(p_description),''),location=NULLIF(TRIM(p_location),''),address=NULLIF(TRIM(p_address),''),latitude=p_latitude,longitude=p_longitude,cover_image_url=NULLIF(TRIM(p_cover_image_url),''),contact_whatsapp=NULLIF(TRIM(p_contact_whatsapp),''),price_from=p_price_from,price_to=p_price_to,price_label=NULLIF(TRIM(p_price_label),''),currency=COALESCE(NULLIF(TRIM(p_currency),''),'COP'),duration_text=NULLIF(TRIM(p_duration_text),''),difficulty=NULLIF(TRIM(p_difficulty),''),is_reservable=COALESCE(p_is_reservable,FALSE),metadata=COALESCE(p_metadata,'{}'::jsonb)
  WHERE id=p_item_id AND provider_id=auth.uid() AND status IN ('draft','rejected') RETURNING id INTO updated_id;
  IF updated_id IS NULL THEN RAISE EXCEPTION 'La oferta no existe, no te pertenece o no está editable'; END IF;
  RETURN updated_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_submit_catalog_item(p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item_row public.turismo_catalog_items%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('provider:catalog_manage') THEN RAISE EXCEPTION 'No tienes permiso para enviar ofertas'; END IF;
  SELECT * INTO item_row FROM public.turismo_catalog_items WHERE id=p_item_id AND provider_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Oferta no encontrada'; END IF;
  IF item_row.status NOT IN ('draft','rejected') THEN RAISE EXCEPTION 'Solo puedes enviar borradores o rechazados'; END IF;
  IF NULLIF(TRIM(item_row.title),'') IS NULL OR NULLIF(TRIM(item_row.short_description),'') IS NULL OR NULLIF(TRIM(item_row.item_type),'') IS NULL OR NULLIF(TRIM(item_row.location),'') IS NULL OR NULLIF(TRIM(item_row.cover_image_url),'') IS NULL THEN RAISE EXCEPTION 'Completa título, descripción corta, tipo, ubicación e imagen'; END IF;
  UPDATE public.turismo_catalog_items SET status='pending_review',moderation_reason=NULL,updated_at=NOW() WHERE id=p_item_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'catalog_item_submitted',p_item_id::TEXT,'{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_archive_catalog_item(p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('provider:catalog_manage') THEN RAISE EXCEPTION 'No tienes permiso para archivar ofertas'; END IF;
  UPDATE public.turismo_catalog_items SET status='archived',updated_at=NOW() WHERE id=p_item_id AND provider_id=auth.uid() AND status IN ('draft','rejected','published');
  IF NOT FOUND THEN RAISE EXCEPTION 'La oferta no existe o no se puede archivar'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_moderate_catalog_item(p_item_id UUID,p_action TEXT,p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('content:moderate') THEN RAISE EXCEPTION 'No tienes permiso para moderar'; END IF;
  SELECT status INTO current_status FROM public.turismo_catalog_items WHERE id=p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Oferta no encontrada'; END IF;
  IF p_action='approve' THEN
    IF NOT public.turismo_current_user_has_permission('content:approve') OR current_status <> 'pending_review' THEN RAISE EXCEPTION 'La oferta no está pendiente o no tienes permiso para aprobar'; END IF;
    UPDATE public.turismo_catalog_items SET status='published',published_at=COALESCE(published_at,NOW()),moderation_reason=NULL,updated_at=NOW() WHERE id=p_item_id;
    INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'catalog_item_approved',p_item_id::TEXT,'{}'::jsonb);
  ELSIF p_action='reject' THEN
    IF NOT public.turismo_current_user_has_permission('content:reject') OR current_status <> 'pending_review' OR NULLIF(TRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Se requiere permiso, estado pendiente y motivo para rechazar'; END IF;
    UPDATE public.turismo_catalog_items SET status='rejected',moderation_reason=TRIM(p_reason),updated_at=NOW() WHERE id=p_item_id;
    INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'catalog_item_rejected',p_item_id::TEXT,jsonb_build_object('reason_present',TRUE));
  ELSIF p_action='suspend' THEN
    IF current_status <> 'published' OR NULLIF(TRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Solo puedes suspender publicaciones y debes indicar el motivo'; END IF;
    UPDATE public.turismo_catalog_items SET status='suspended',moderation_reason=TRIM(p_reason),updated_at=NOW() WHERE id=p_item_id;
    INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'catalog_item_suspended',p_item_id::TEXT,jsonb_build_object('reason_present',TRUE));
  ELSE RAISE EXCEPTION 'Acción de moderación inválida'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_create_reservation(p_item_id UUID,p_reservation_date DATE,p_end_date DATE,p_guests INTEGER,p_notes TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item_row public.turismo_catalog_items%ROWTYPE; reservation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:book') THEN RAISE EXCEPTION 'No tienes permiso para reservar'; END IF;
  IF p_guests IS NULL OR p_guests < 1 THEN RAISE EXCEPTION 'El número de personas debe ser al menos 1'; END IF;
  IF p_reservation_date IS NULL OR p_reservation_date < CURRENT_DATE THEN RAISE EXCEPTION 'La fecha de reserva no puede ser anterior a hoy'; END IF;
  IF p_end_date IS NOT NULL AND p_end_date < p_reservation_date THEN RAISE EXCEPTION 'La fecha final no puede ser anterior a la inicial'; END IF;
  SELECT * INTO item_row FROM public.turismo_catalog_items WHERE id=p_item_id AND status='published' AND is_reservable=TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La oferta no está publicada o no acepta reservas'; END IF;
  INSERT INTO public.turismo_reservations(item_id,tourist_id,provider_id,reservation_date,end_date,guests,notes,status,currency) VALUES(p_item_id,auth.uid(),item_row.provider_id,p_reservation_date,p_end_date,p_guests,p_notes,'requested',COALESCE(item_row.currency,'COP')) RETURNING id INTO reservation_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'reservation_created',reservation_id::TEXT,jsonb_build_object('item_id',p_item_id,'guests',p_guests));
  RETURN reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_provider_update_reservation(p_reservation_id UUID,p_action TEXT,p_quoted_amount NUMERIC DEFAULT NULL,p_response TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_status TEXT; next_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('provider:bookings_view') THEN RAISE EXCEPTION 'No tienes permiso para gestionar reservas'; END IF;
  SELECT status INTO current_status FROM public.turismo_reservations WHERE id=p_reservation_id AND provider_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada o no pertenece al prestador'; END IF;
  next_status := CASE WHEN p_action='confirm' AND current_status='requested' THEN 'confirmed' WHEN p_action='reject' AND current_status='requested' THEN 'rejected' WHEN p_action='complete' AND current_status='confirmed' THEN 'completed' ELSE NULL END;
  IF next_status IS NULL THEN RAISE EXCEPTION 'Transición de reserva inválida'; END IF;
  UPDATE public.turismo_reservations SET status=next_status,quoted_amount=COALESCE(p_quoted_amount,quoted_amount),provider_response=COALESCE(NULLIF(TRIM(p_response),''),provider_response),updated_at=NOW() WHERE id=p_reservation_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),CASE next_status WHEN 'confirmed' THEN 'reservation_confirmed' WHEN 'rejected' THEN 'reservation_rejected' ELSE 'reservation_completed' END,p_reservation_id::TEXT,'{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_cancel_reservation(p_reservation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:book') THEN RAISE EXCEPTION 'No tienes permiso para cancelar reservas'; END IF;
  UPDATE public.turismo_reservations SET status='cancelled',updated_at=NOW() WHERE id=p_reservation_id AND tourist_id=auth.uid() AND status IN ('requested','confirmed');
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada o no se puede cancelar'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'reservation_cancelled',p_reservation_id::TEXT,'{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_create_review(p_reservation_id UUID,p_rating INTEGER,p_comment TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reservation_row public.turismo_reservations%ROWTYPE; review_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:review') THEN RAISE EXCEPTION 'No tienes permiso para reseñar'; END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'La calificación debe estar entre 1 y 5'; END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id=p_reservation_id AND tourist_id=auth.uid() AND status='completed';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo puedes reseñar reservas completadas propias'; END IF;
  IF EXISTS (SELECT 1 FROM public.turismo_reviews WHERE reservation_id=p_reservation_id) THEN RAISE EXCEPTION 'Esta reserva ya tiene una reseña'; END IF;
  INSERT INTO public.turismo_reviews(item_id,tourist_id,reservation_id,rating,comment,status) VALUES(reservation_row.item_id,auth.uid(),p_reservation_id,p_rating,NULLIF(TRIM(p_comment),''),'pending') RETURNING id INTO review_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'review_created',review_id::TEXT,jsonb_build_object('item_id',reservation_row.item_id,'rating',p_rating));
  RETURN review_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_moderate_review(p_review_id UUID,p_action TEXT,p_reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE review_item_id UUID; current_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('content:moderate') THEN RAISE EXCEPTION 'No tienes permiso para moderar reseñas'; END IF;
  SELECT item_id,status INTO review_item_id,current_status FROM public.turismo_reviews WHERE id=p_review_id;
  IF NOT FOUND OR current_status <> 'pending' THEN RAISE EXCEPTION 'La reseña no está pendiente'; END IF;
  IF p_action='approve' THEN
    IF NOT public.turismo_current_user_has_permission('content:approve') THEN RAISE EXCEPTION 'No tienes permiso para aprobar reseñas'; END IF;
    UPDATE public.turismo_reviews SET status='published',moderation_reason=NULL,updated_at=NOW() WHERE id=p_review_id;
    INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'review_approved',p_review_id::TEXT,'{}'::jsonb);
  ELSIF p_action='reject' THEN
    IF NOT public.turismo_current_user_has_permission('content:reject') OR NULLIF(TRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Se requiere permiso y motivo para rechazar'; END IF;
    UPDATE public.turismo_reviews SET status='rejected',moderation_reason=TRIM(p_reason),updated_at=NOW() WHERE id=p_review_id;
    INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'review_rejected',p_review_id::TEXT,jsonb_build_object('reason_present',TRUE));
  ELSE RAISE EXCEPTION 'Acción de reseña inválida'; END IF;
  UPDATE public.turismo_catalog_items SET rating=COALESCE((SELECT ROUND(AVG(r.rating)::NUMERIC,1) FROM public.turismo_reviews r WHERE r.item_id=review_item_id AND r.status='published'),0),reviews_count=(SELECT COUNT(*) FROM public.turismo_reviews r WHERE r.item_id=review_item_id AND r.status='published'),updated_at=NOW() WHERE id=review_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_respond_to_review(p_review_id UUID,p_response TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NULLIF(TRIM(p_response),'') IS NULL THEN RAISE EXCEPTION 'La respuesta no puede estar vacía'; END IF;
  UPDATE public.turismo_reviews r SET provider_response=TRIM(p_response),provider_responded_at=NOW(),updated_at=NOW() FROM public.turismo_catalog_items i WHERE r.id=p_review_id AND r.item_id=i.id AND i.provider_id=auth.uid() AND r.status='published';
  IF NOT FOUND THEN RAISE EXCEPTION 'La reseña no existe, no está publicada o no pertenece al prestador'; END IF;
END;
$$;

ALTER TABLE public.turismo_catalog_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_catalog_public_published ON public.turismo_catalog_items;
DROP POLICY IF EXISTS turismo_catalog_owner_read ON public.turismo_catalog_items;
DROP POLICY IF EXISTS turismo_catalog_moderator_read ON public.turismo_catalog_items;
CREATE POLICY turismo_catalog_public_published ON public.turismo_catalog_items FOR SELECT TO anon,authenticated USING(status='published');
CREATE POLICY turismo_catalog_owner_read ON public.turismo_catalog_items FOR SELECT TO authenticated USING(provider_id=auth.uid());
CREATE POLICY turismo_catalog_moderator_read ON public.turismo_catalog_items FOR SELECT TO authenticated USING(public.turismo_current_user_has_permission('content:moderate') AND status IN ('pending_review','published','rejected','suspended'));

ALTER TABLE public.turismo_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_reservations_tourist_read ON public.turismo_reservations;
DROP POLICY IF EXISTS turismo_reservations_provider_read ON public.turismo_reservations;
DROP POLICY IF EXISTS turismo_reservations_support_read ON public.turismo_reservations;
CREATE POLICY turismo_reservations_tourist_read ON public.turismo_reservations FOR SELECT TO authenticated USING(tourist_id=auth.uid());
CREATE POLICY turismo_reservations_provider_read ON public.turismo_reservations FOR SELECT TO authenticated USING(provider_id=auth.uid());
CREATE POLICY turismo_reservations_support_read ON public.turismo_reservations FOR SELECT TO authenticated USING(public.turismo_current_user_has_permission('support:tickets_manage'));

ALTER TABLE public.turismo_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_favorites_owner_select ON public.turismo_favorites;
DROP POLICY IF EXISTS turismo_favorites_owner_insert ON public.turismo_favorites;
DROP POLICY IF EXISTS turismo_favorites_owner_delete ON public.turismo_favorites;
CREATE POLICY turismo_favorites_owner_select ON public.turismo_favorites FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY turismo_favorites_owner_insert ON public.turismo_favorites FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS (SELECT 1 FROM public.turismo_catalog_items i WHERE i.id=item_id AND i.status='published'));
CREATE POLICY turismo_favorites_owner_delete ON public.turismo_favorites FOR DELETE TO authenticated USING(user_id=auth.uid());

ALTER TABLE public.turismo_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_reviews_public_published ON public.turismo_reviews;
DROP POLICY IF EXISTS turismo_reviews_tourist_read ON public.turismo_reviews;
DROP POLICY IF EXISTS turismo_reviews_provider_read ON public.turismo_reviews;
DROP POLICY IF EXISTS turismo_reviews_moderator_read ON public.turismo_reviews;
CREATE POLICY turismo_reviews_public_published ON public.turismo_reviews FOR SELECT TO anon,authenticated USING(status='published');
CREATE POLICY turismo_reviews_tourist_read ON public.turismo_reviews FOR SELECT TO authenticated USING(tourist_id=auth.uid());
CREATE POLICY turismo_reviews_provider_read ON public.turismo_reviews FOR SELECT TO authenticated USING(EXISTS (SELECT 1 FROM public.turismo_catalog_items i WHERE i.id=item_id AND i.provider_id=auth.uid()));
CREATE POLICY turismo_reviews_moderator_read ON public.turismo_reviews FOR SELECT TO authenticated USING(public.turismo_current_user_has_permission('content:moderate') AND status='pending');

REVOKE ALL ON TABLE public.turismo_catalog_items,public.turismo_reservations,public.turismo_favorites,public.turismo_reviews FROM anon,authenticated;
GRANT SELECT ON TABLE public.turismo_catalog_items TO anon,authenticated;
GRANT SELECT ON TABLE public.turismo_reservations,public.turismo_reviews TO authenticated;
GRANT SELECT,INSERT,DELETE ON TABLE public.turismo_favorites TO authenticated;

REVOKE ALL ON FUNCTION public.turismo_create_catalog_item(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.turismo_create_catalog_item(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.turismo_update_catalog_item(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.turismo_update_catalog_item(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.turismo_submit_catalog_item(UUID),public.turismo_archive_catalog_item(UUID),public.turismo_moderate_catalog_item(UUID,TEXT,TEXT),public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT),public.turismo_provider_update_reservation(UUID,TEXT,NUMERIC,TEXT),public.turismo_cancel_reservation(UUID),public.turismo_create_review(UUID,INTEGER,TEXT),public.turismo_moderate_review(UUID,TEXT,TEXT),public.turismo_respond_to_review(UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.turismo_submit_catalog_item(UUID),public.turismo_archive_catalog_item(UUID),public.turismo_moderate_catalog_item(UUID,TEXT,TEXT),public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT),public.turismo_provider_update_reservation(UUID,TEXT,NUMERIC,TEXT),public.turismo_cancel_reservation(UUID),public.turismo_create_review(UUID,INTEGER,TEXT),public.turismo_moderate_review(UUID,TEXT,TEXT),public.turismo_respond_to_review(UUID,TEXT) TO authenticated;

COMMIT;

-- Historical/reference content migrated from src/data/touristData.ts and ArtesaniasPage.
INSERT INTO public.turismo_catalog_items (provider_id,item_type,title,slug,category,short_description,description,location,cover_image_url,contact_whatsapp,duration_text,difficulty,is_reservable,metadata,status,is_featured,price_label)
VALUES
(NULL,'atractivo','Cañón del Anaime & Bosques de Palma de Cera','canon-anaime-bosques-palma-cera','Ecoturismo','Majestuoso cañón con valles verdes y colosales palmas de cera autóctonas.','Ubicado en el corregimiento de Anaime, este santuario natural alberga imponentes bosques de la palma nacional de Colombia. Ideal para avistamiento de aves, fotografía y caminatas de montaña.','Corregimiento de Anaime, Cajamarca - Tolima','https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80','573025091063','4 - 6 horas','moderado',FALSE,jsonb_build_object('highlights',ARRAY['Bosque nativo de Palma de Cera','Avistamiento de Aves y Loros Orejiamarillos','Miradores fotográficos de la cordillera']::TEXT[]),'published',TRUE,NULL),
(NULL,'atractivo','Finca Agroturística La Aurora','finca-agroturistica-la-aurora','Agroturismo','Experiencia campesina interactiva: recorrido del café, huertas agrícolas y catación.','Siente el orgullo de la Despensa Agrícola de Colombia. Recorre cultivos de café de altura, hortalizas y fruta fresca, guiado por familias campesinas tradicionales de la región.','Vereda La Aurora, Cajamarca - Tolima','https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80','573025091063','3 - 5 horas','facil',FALSE,jsonb_build_object('highlights',ARRAY['Taller de café especial','Almuerzo típico de campo','Caminata senderos florales']::TEXT[]),'published',TRUE,NULL),
(NULL,'atractivo','Volcán Machín & Termales Naturales','volcan-machin-termales-naturales','Aventura','Aventura geológica hasta el cráter del volcán y pozos de aguas termales curativas.','Una de las maravillas geológicas de la Cordillera Central. Conoce el domo volcánico del Machín rodeado de vegetación exuberante y sumérgete en fuentes termales ricas en minerales.','Vereda Toche / Machín, Cajamarca - Tolima','https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80','573025091063','Día completo (7-8 h)','exigente',FALSE,jsonb_build_object('highlights',ARRAY['Caminata a cráter volcánico','Aguas termales medicinales','Paisaje volcánico andino']::TEXT[]),'published',TRUE,NULL),
(NULL,'atractivo','Ruta Ciclomontañista Las Hormas','ruta-ciclomontanista-las-hormas','Aventura','Ruta extrema de MTB y senderismo por senderos de alta montaña y bosques nublados.','Destino favorito para amantes del ciclomontañismo y downhill en el Tolima, con vistas panorámicas del cañón y la Cordillera de los Andes.','Vereda Las Hormas, Cajamarca - Tolima','https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80','573025091063','3 - 4 horas','exigente',FALSE,jsonb_build_object('highlights',ARRAY['Pistas trazadas de Downhill','Puntos de hidratación campestre','Vistas de la cuenca del Anaime']::TEXT[]),'published',FALSE,NULL),
(NULL,'atractivo','Parque Principal & Parador Gastronómico','parque-principal-parador-gastronomico','Cultura','Corazón cultural del municipio, famoso por sus puestos de dulces, arracacha y artesanías.','El centro neurálgico de Cajamarca. Disfruta de la hospitalidad de su gente, el monumento agrícola, cafeterías tradicionales y la mejor muestra del folclor campesino.','Centro de Cajamarca, Tolima','https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=800&q=80','573025091063','1 - 2 horas','facil',FALSE,jsonb_build_object('highlights',ARRAY['Monumento a la Despensa Agrícola','Venta de amasijos y productos locales','Arquitectura tradicional']::TEXT[]),'published',FALSE,NULL),
(NULL,'atractivo','Chorreras y Cascadas del Río Anaime','chorreras-cascadas-rio-anaime','Relax','Imponentes caídas de agua helada y cristalina rodeadas de fauna y flora andina.','Río de aguas limpias que desciende de los páramos andinos. Espacio ideal para picnic ecológico, baño en pozos naturales y desconexión total en la naturaleza.','Alto Anaime, Cajamarca - Tolima','https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=800&q=80','573025091063','3 - 5 horas','moderado',FALSE,jsonb_build_object('highlights',ARRAY['Cascada natural de 25m','Zonas de camping y descanso','Aire puro de montaña']::TEXT[]),'published',FALSE,NULL),
(NULL,'gastronomia','Tamal Tolimense Auténtico','tamal-tolimense-autentico','Plato Fuerte','Preparado con masa de maíz, pollo, cerdo, huevo, zanahoria y arveja, envuelto en hoja de plátano.','Receta tradicional de la cocina tolimense, preparada con ingredientes de la despensa agrícola de Cajamarca.','Restaurantes y Paradores del Parque','https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('popular_in','Restaurantes y Paradores del Parque'),'published',FALSE,'$12.000 - $18.000 COP'),
(NULL,'gastronomia','Lechona Tolimense Tradicional','lechona-tolimense-tradicional','Plato Fuerte','Cerdo crujiente horneado con arveja amarilla sazonada y especias naturales, servido con arepa de maíz blanco.','Una preparación festiva y tradicional de la cocina regional.','El Carnaval del Cerdo & La Bodega de Amar','https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('popular_in','El Carnaval del Cerdo & La Bodega de Amar'),'published',FALSE,'$18.000 - $25.000 COP'),
(NULL,'gastronomia','Sancocho de Gallina Criolla','sancocho-gallina-criolla','Plato Fuerte','Caldo espeso preparado en fogón de leña con yuca, plátano, arracacha fresca y gallina de campo.','Sabor campesino para compartir en familia en los restaurantes y veredas de Cajamarca.','El Fogón de Doña Antonia & Restaurantes de Anaime','https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('popular_in','El Fogón de Doña Antonia & Restaurantes de Anaime'),'published',FALSE,'$20.000 - $28.000 COP'),
(NULL,'gastronomia','Especiales de Arracacha Cajamarcuna','especiales-arracacha-cajamarcuna','Plato Fuerte','Cremas, purés, chips y tortas dulces preparadas con la mejor arracacha de Colombia.','Sabores creativos con el producto insignia de las laderas del municipio.','Donde Jairo & Restaurante Mirador Gourmet','https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('popular_in','Donde Jairo & Restaurante Mirador Gourmet'),'published',FALSE,'$14.000 - $22.000 COP'),
(NULL,'gastronomia','Trucha Arcoíris Frita o al Ajillo','trucha-arcoiris-frita-ajillo','Plato Fuerte','Trucha fresca de aguas frías de montaña, acompañada de patacón gigante y ensalada campestre.','Una especialidad de las fincas trucheras de la región.','Finca Truchera El Arcoíris & Donde Jairo','https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('popular_in','Finca Truchera El Arcoíris & Donde Jairo'),'published',FALSE,'$25.000 - $35.000 COP'),
(NULL,'gastronomia','Cholados y Dulce de Papayuela','cholados-dulce-papayuela','Postres','Raspados con fruta fresca, leche condensada, maracuyá y mermelada artesanal de papayuela y brevas.','Postres refrescantes elaborados con frutas locales.','La Casa del Cholado & Heladerías del Centro','https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('popular_in','La Casa del Cholado & Heladerías del Centro'),'published',FALSE,'$6.000 - $12.000 COP'),
(NULL,'alojamiento','Finca Agroturística La Aurora','hospedaje-finca-la-aurora','Finca Agroturística','Hospedaje rural con recorrido del café, huertas agrícolas y catación.','Descansa en una finca campesina y conoce los cultivos de café y hortalizas de la región.','Vereda La Aurora, Anaime','https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('amenities',ARRAY['Desayuno Campesino','Wi-Fi','Tours de Café','Parqueadero','Zona de Hamacas']::TEXT[]),'published',FALSE,'$120.000 COP / noche'),
(NULL,'alojamiento','Hotel Campestre Anaima Plaza','hotel-campestre-anaima-plaza','Hotel','Hospedaje campestre con restaurante y atención permanente.','Una opción cómoda para recorrer Anaime y el centro de Cajamarca.','Calle Principal Anaime, Cajamarca','https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('amenities',ARRAY['Agua Caliente','Wi-Fi Alta Velocidad','Restaurante','Recepción 24/7']::TEXT[]),'published',FALSE,'$95.000 COP / noche'),
(NULL,'alojamiento','Glamping & Eco-Lodge Palmas del Machín','glamping-eco-lodge-palmas-machin','Glamping','Domo cristalino y experiencia de naturaleza en la vía al Machín.','Hospedaje de conexión con el paisaje volcánico y los bosques andinos.','Vereda Toche, Vía al Machín','https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('amenities',ARRAY['Domo Cristalino','Fogata Nocturna','Tours Guiados','Jacuzzi Exterior']::TEXT[]),'published',FALSE,'$220.000 COP / noche'),
(NULL,'alojamiento','Hotel Leña Verde Urbano','hotel-lena-verde-urbano','Posada Rural','Posada de ubicación central con servicios esenciales para el viajero.','Una base práctica para conocer el centro histórico de Cajamarca.','Centro Histórico de Cajamarca','https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('amenities',ARRAY['Ubicación Central','TV Cable','Agua Caliente','Información Turística']::TEXT[]),'published',FALSE,'$75.000 COP / noche'),
(NULL,'tour','Expedición Bosque de Palmas & Cañón del Anaime','tour-palmas-anaime','Ecoturismo','Recorre el bosque de palmas y el Cañón del Anaime con guías locales.','Experiencia de día completo con transporte, guía, almuerzo y seguro de asistencia.','Cajamarca - Tolima','https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80','573025091063','1 Día Completo (8:00 AM - 4:00 PM)',NULL,FALSE,jsonb_build_object('includes',ARRAY['Transporte 4x4','Guía Profesional RNT','Almuerzo Típico','Seguro de Asistencia']::TEXT[],'operator_name','Guías Ecológicos del Tolima'),'published',FALSE,'$85.000 COP / persona'),
(NULL,'tour','Trekking Volcán Machín & Pozos Termales','tour-senderismo-machin','Trekking','Aventura de montaña con ingreso a termales y paseo guiado.','Conoce el Volcán Machín y relájate en sus pozos termales naturales.','Cajamarca - Tolima','https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80','573025091063','1 Día Completo',NULL,FALSE,jsonb_build_object('includes',ARRAY['Ingreso a Termales','Refrigerio de Arracacha','Paseo Guiado','Kit de Hidratación']::TEXT[],'operator_name','Aventura Andes Cajamarca'),'published',FALSE,'$110.000 COP / persona'),
(NULL,'tour','Ruta Agrícola del Café y la Arracacha','tour-ruta-cafe-agricola','Agroturismo','Ruta campesina para aprender sobre café, arracacha y sabores locales.','Taller interactivo, catación de café y degustación gastronómica en Anaime.','Cajamarca - Tolima','https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80','573025091063','Medio Día (4 Horas)',NULL,FALSE,jsonb_build_object('includes',ARRAY['Taller Interactivo','Catación de Café','Degustación Gastronómica']::TEXT[],'operator_name','Asociación Agroturística de Anaime'),'published',FALSE,'$60.000 COP / persona'),
(NULL,'evento','Carnaval del Cerdo Cajamarcuno','carnaval-del-cerdo-cajamarcuno','Festividad','Festividad gastronómica y cultural con lechona tradicional, música, comparsas y platos típicos.','Una celebración para disfrutar la cocina y la cultura local.','Plaza Principal de Cajamarca, Tolima','https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',NULL,NULL,NULL,FALSE,jsonb_build_object('event_date','12 - 14 de Noviembre'),'published',FALSE,NULL),
(NULL,'evento','Gran Encuentro Motero en Cajamarca','gran-encuentro-motero-cajamarca','Deporte','Reunión nacional de clubes moteros con caravana, exhibiciones y conciertos.','Una experiencia de carretera y encuentro cultural en el Cañón del Anaime.','Parque de los Urapanes / Vía Panamericana','https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',NULL,NULL,NULL,FALSE,jsonb_build_object('event_date','18 - 20 de Agosto'),'published',FALSE,NULL),
(NULL,'evento','Feria Nacional de la Arracacha y el Agro','feria-nacional-arracacha-agro','Feria Agrícola','Muestra comercial y campesina con productos agrícolas, mercado directo y rueda de negocios.','Encuentro para conocer la despensa agrícola del Tolima y sus productores.','Centro de Acopio Agrícola','https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=600&q=80',NULL,NULL,NULL,FALSE,jsonb_build_object('event_date','28 - 30 de Junio'),'published',FALSE,NULL),
(NULL,'artesania','Canastos y Tejidos en Fibra de Plátano','canastos-tejidos-fibra-platano','Artesanía','Canastos tradicionales y accesorios elaborados a mano con fibras de plátano y palma.','Artesanías campesinas elaboradas por familias de Anaime.','Anaime, Cajamarca - Tolima','https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('artisan_name','Artesanas de Anaime'),'published',FALSE,'$25.000 - $45.000 COP'),
(NULL,'artesania','Productos Derivados del Café Especial','productos-derivados-cafe-especial','Artesanía','Café tostado en origen, galletas, arequipe y licores artesanales.','Productos de asociaciones cafeteras de Cajamarca para llevar a casa.','Cajamarca - Tolima','https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('artisan_name','Asociación de Cafeteros de Cajamarca'),'published',FALSE,'$15.000 - $35.000 COP'),
(NULL,'artesania','Souvenirs en Madera & Palma de Cera','souvenirs-madera-palma-cera','Artesanía','Tallados en madera sostenible que representan la fauna autóctona y la Palma de Cera.','Recuerdos elaborados en talleres artesanales locales.','Cajamarca - Tolima','https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80','573025091063',NULL,NULL,FALSE,jsonb_build_object('artisan_name','Taller Artesanal El Urapán'),'published',FALSE,'$12.000 - $30.000 COP')
ON CONFLICT (slug) DO NOTHING;

UPDATE public.turismo_catalog_items AS item
SET rating = seed.rating, reviews_count = seed.reviews_count
FROM (VALUES
  ('canon-anaime-bosques-palma-cera',4.9,128),('finca-agroturistica-la-aurora',4.8,95),('volcan-machin-termales-naturales',4.9,110),('ruta-ciclomontanista-las-hormas',4.7,76),('parque-principal-parador-gastronomico',4.8,210),('chorreras-cascadas-rio-anaime',4.8,84),
  ('tamal-tolimense-autentico',4.9,0),('lechona-tolimense-tradicional',4.9,0),('sancocho-gallina-criolla',4.8,0),('especiales-arracacha-cajamarcuna',4.8,0),('trucha-arcoiris-frita-ajillo',4.9,0),('cholados-dulce-papayuela',4.7,0),
  ('hospedaje-finca-la-aurora',4.9,0),('hotel-campestre-anaima-plaza',4.8,0),('glamping-eco-lodge-palmas-machin',4.9,0),('hotel-lena-verde-urbano',4.6,0),
  ('tour-palmas-anaime',4.9,0),('tour-senderismo-machin',4.9,0),('tour-ruta-cafe-agricola',4.8,0)
) AS seed(slug,rating,reviews_count)
WHERE item.slug = seed.slug;

COMMENT ON TABLE public.turismo_catalog_items IS 'Marketplace catalog; provider_id NULL identifies editorial/platform content.';
