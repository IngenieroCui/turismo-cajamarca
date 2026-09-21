-- Turismo Cajamarca: operaciones de plataforma, cumplimiento, crecimiento y BI.
-- Ejecutar después de 08_refactor_rbac_multi_role.sql y 09_core_tourism_marketplace.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.turismo_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('reservation','catalog','account','refund','technical','other')),
  reservation_id UUID NULL REFERENCES public.turismo_reservations(id) ON DELETE SET NULL,
  catalog_item_id UUID NULL REFERENCES public.turismo_catalog_items(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_user','resolved','closed')),
  assigned_support_id UUID NULL REFERENCES public.turismo_profiles(id) ON DELETE SET NULL,
  resolution_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS turismo_support_tickets_requester_idx ON public.turismo_support_tickets(requester_id);
CREATE INDEX IF NOT EXISTS turismo_support_tickets_assigned_idx ON public.turismo_support_tickets(assigned_support_id);
CREATE INDEX IF NOT EXISTS turismo_support_tickets_status_idx ON public.turismo_support_tickets(status);
CREATE INDEX IF NOT EXISTS turismo_support_tickets_priority_idx ON public.turismo_support_tickets(priority);
CREATE INDEX IF NOT EXISTS turismo_support_tickets_created_idx ON public.turismo_support_tickets(created_at);

CREATE TABLE IF NOT EXISTS public.turismo_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.turismo_support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS turismo_support_messages_ticket_idx ON public.turismo_support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS turismo_support_messages_created_idx ON public.turismo_support_messages(created_at);

CREATE TABLE IF NOT EXISTS public.turismo_refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.turismo_support_tickets(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.turismo_reservations(id) ON DELETE RESTRICT,
  initiated_by UUID NOT NULL REFERENCES public.turismo_profiles(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_financial_processing' CHECK (status IN ('pending_financial_processing','rejected','processed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS turismo_refund_pending_reservation_uq
  ON public.turismo_refund_requests(reservation_id)
  WHERE status = 'pending_financial_processing';
CREATE INDEX IF NOT EXISTS turismo_refund_requests_ticket_idx ON public.turismo_refund_requests(ticket_id);

CREATE TABLE IF NOT EXISTS public.turismo_audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_id UUID NOT NULL REFERENCES public.turismo_profiles(id),
  title TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  summary TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start),
  CHECK (jsonb_typeof(findings) = 'array')
);

CREATE INDEX IF NOT EXISTS turismo_audit_reports_created_idx ON public.turismo_audit_reports(created_at);

CREATE TABLE IF NOT EXISTS public.turismo_provider_compliance (
  provider_id UUID PRIMARY KEY REFERENCES public.turismo_provider_profiles(profile_id) ON DELETE CASCADE,
  commercial_registration_number TEXT,
  commercial_status TEXT NOT NULL DEFAULT 'pendiente' CHECK (commercial_status IN ('pendiente','verificado','observado','rechazado','vencido','sin_registro')),
  commercial_expires_at DATE,
  commercial_verified_at TIMESTAMPTZ,
  rnt_expires_at DATE,
  rnt_verified_at TIMESTAMPTZ,
  last_rnt_note TEXT,
  last_commercial_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS turismo_provider_compliance_commercial_status_idx
  ON public.turismo_provider_compliance(commercial_status);
CREATE INDEX IF NOT EXISTS turismo_provider_compliance_rnt_expires_idx
  ON public.turismo_provider_compliance(rnt_expires_at);

CREATE TABLE IF NOT EXISTS public.turismo_regulatory_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.turismo_provider_profiles(profile_id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.turismo_profiles(id),
  entity_type TEXT NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('rnt','commercial')),
  decision TEXT NOT NULL CHECK (decision IN ('verified','observed','rejected','expired')),
  notes TEXT,
  effective_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (entity_type IN ('MINCIT','FONTUR','CAMARA_COMERCIO'))
);

CREATE INDEX IF NOT EXISTS turismo_regulatory_observations_provider_idx
  ON public.turismo_regulatory_observations(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS turismo_regulatory_observations_reviewer_idx
  ON public.turismo_regulatory_observations(reviewer_id);

CREATE TABLE IF NOT EXISTS public.turismo_referral_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  visitor_token TEXT NOT NULL,
  landing_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (affiliate_id, visitor_token)
);

CREATE INDEX IF NOT EXISTS turismo_referral_visits_affiliate_idx ON public.turismo_referral_visits(affiliate_id);
CREATE INDEX IF NOT EXISTS turismo_referral_visits_code_idx ON public.turismo_referral_visits(referral_code);

ALTER TABLE public.turismo_reservations ADD COLUMN IF NOT EXISTS affiliate_id UUID NULL REFERENCES public.turismo_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.turismo_reservations ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.turismo_reservations ADD COLUMN IF NOT EXISTS commission_rate_snapshot NUMERIC(5,2);
CREATE INDEX IF NOT EXISTS turismo_reservations_affiliate_idx ON public.turismo_reservations(affiliate_id);
CREATE INDEX IF NOT EXISTS turismo_reservations_referral_code_idx ON public.turismo_reservations(referral_code);

CREATE TABLE IF NOT EXISTS public.turismo_affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.turismo_reservations(id) ON DELETE RESTRICT,
  rate NUMERIC(5,2) NOT NULL,
  base_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'COP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','earned','void','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  earned_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  UNIQUE (reservation_id)
);

CREATE INDEX IF NOT EXISTS turismo_affiliate_commissions_affiliate_idx ON public.turismo_affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS turismo_affiliate_commissions_status_idx ON public.turismo_affiliate_commissions(status);

DROP TRIGGER IF EXISTS turismo_support_tickets_touch_updated_at ON public.turismo_support_tickets;
CREATE TRIGGER turismo_support_tickets_touch_updated_at
  BEFORE UPDATE ON public.turismo_support_tickets FOR EACH ROW
  EXECUTE FUNCTION public.turismo_marketplace_touch_updated_at();
DROP TRIGGER IF EXISTS turismo_provider_compliance_touch_updated_at ON public.turismo_provider_compliance;
CREATE TRIGGER turismo_provider_compliance_touch_updated_at
  BEFORE UPDATE ON public.turismo_provider_compliance FOR EACH ROW
  EXECUTE FUNCTION public.turismo_marketplace_touch_updated_at();

CREATE OR REPLACE FUNCTION public.turismo_create_support_ticket(
  p_category TEXT,
  p_subject TEXT,
  p_description TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_reservation_id UUID DEFAULT NULL,
  p_catalog_item_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  created_id UUID;
  has_manage BOOLEAN;
  reservation_row public.turismo_reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación y cuenta activa requeridas';
  END IF;
  IF p_category IS NULL OR p_category NOT IN ('reservation','catalog','account','refund','technical','other') THEN
    RAISE EXCEPTION 'Categoría de soporte inválida';
  END IF;
  IF p_priority IS NULL OR p_priority NOT IN ('low','normal','high','urgent') THEN
    RAISE EXCEPTION 'Prioridad inválida';
  END IF;
  IF NULLIF(TRIM(p_subject), '') IS NULL OR NULLIF(TRIM(p_description), '') IS NULL THEN
    RAISE EXCEPTION 'Asunto y descripción son obligatorios';
  END IF;
  has_manage := public.turismo_current_user_has_permission('support:tickets_manage');
  IF p_reservation_id IS NOT NULL THEN
    SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id = p_reservation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'La reserva no existe'; END IF;
    IF NOT has_manage AND reservation_row.tourist_id <> auth.uid() AND reservation_row.provider_id <> auth.uid() THEN
      RAISE EXCEPTION 'No puedes vincular esa reserva a un ticket';
    END IF;
  END IF;
  IF p_catalog_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.turismo_catalog_items WHERE id = p_catalog_item_id) THEN
    RAISE EXCEPTION 'La oferta vinculada no existe';
  END IF;
  INSERT INTO public.turismo_support_tickets(requester_id,category,reservation_id,catalog_item_id,subject,description,priority,status)
  VALUES (auth.uid(),p_category,p_reservation_id,p_catalog_item_id,TRIM(p_subject),TRIM(p_description),p_priority,'open')
  RETURNING id INTO created_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details)
  VALUES (auth.uid(),'support_ticket_created',created_id::TEXT,jsonb_build_object('category',p_category,'priority',p_priority,'has_reservation',p_reservation_id IS NOT NULL,'has_catalog_item',p_catalog_item_id IS NOT NULL));
  RETURN created_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_add_support_message(
  p_ticket_id UUID,
  p_body TEXT,
  p_is_internal BOOLEAN DEFAULT FALSE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ticket_row public.turismo_support_tickets%ROWTYPE;
  message_id UUID;
  support_caller BOOLEAN;
  internal_value BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN RAISE EXCEPTION 'Autenticación y cuenta activa requeridas'; END IF;
  IF NULLIF(TRIM(p_body), '') IS NULL THEN RAISE EXCEPTION 'El mensaje no puede estar vacío'; END IF;
  SELECT * INTO ticket_row FROM public.turismo_support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket no encontrado'; END IF;
  support_caller := public.turismo_current_user_has_permission('support:tickets_manage');
  IF ticket_row.requester_id <> auth.uid() AND NOT support_caller THEN RAISE EXCEPTION 'No tienes acceso a este ticket'; END IF;
  IF NOT support_caller AND ticket_row.status = 'closed' THEN RAISE EXCEPTION 'Un ticket cerrado no recibe mensajes del solicitante'; END IF;
  internal_value := CASE WHEN support_caller THEN COALESCE(p_is_internal,FALSE) ELSE FALSE END;
  INSERT INTO public.turismo_support_messages(ticket_id,author_id,body,is_internal)
  VALUES (p_ticket_id,auth.uid(),TRIM(p_body),internal_value)
  RETURNING id INTO message_id;
  UPDATE public.turismo_support_tickets SET updated_at = NOW() WHERE id = p_ticket_id;
  RETURN message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_support_update_ticket(
  p_ticket_id UUID,
  p_status TEXT,
  p_priority TEXT DEFAULT NULL,
  p_assign_to_self BOOLEAN DEFAULT FALSE,
  p_resolution_summary TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_ticket public.turismo_support_tickets%ROWTYPE;
  next_resolved_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('support:tickets_manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar tickets';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('open','in_progress','waiting_user','resolved','closed') THEN RAISE EXCEPTION 'Estado de ticket inválido'; END IF;
  IF p_priority IS NOT NULL AND p_priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'Prioridad inválida'; END IF;
  SELECT * INTO current_ticket FROM public.turismo_support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket no encontrado'; END IF;
  IF p_status = 'resolved' AND NULLIF(TRIM(p_resolution_summary), '') IS NULL AND NULLIF(TRIM(current_ticket.resolution_summary), '') IS NULL THEN
    RAISE EXCEPTION 'Se requiere un resumen de resolución';
  END IF;
  next_resolved_at := CASE WHEN p_status = 'resolved' THEN COALESCE(current_ticket.resolved_at,NOW()) ELSE NULL END;
  UPDATE public.turismo_support_tickets
  SET status=p_status,
      priority=COALESCE(p_priority,priority),
      assigned_support_id=CASE WHEN p_assign_to_self THEN auth.uid() ELSE assigned_support_id END,
      resolution_summary=COALESCE(NULLIF(TRIM(p_resolution_summary),''),resolution_summary),
      resolved_at=next_resolved_at,
      updated_at=NOW()
  WHERE id=p_ticket_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details)
  VALUES (auth.uid(),'support_ticket_updated',p_ticket_id::TEXT,jsonb_build_object('status',p_status,'priority',p_priority,'assigned_to_self',p_assign_to_self,'resolution_summary_present',NULLIF(TRIM(p_resolution_summary),'') IS NOT NULL));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_support_queue(
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID, requester_id UUID, requester_name TEXT, requester_email TEXT, category TEXT,
  reservation_id UUID, catalog_item_id UUID, subject TEXT, description TEXT, priority TEXT,
  status TEXT, assigned_support_id UUID, resolution_summary TEXT, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('support:tickets_manage') THEN
    RAISE EXCEPTION 'No tienes permiso para consultar la cola de soporte';
  END IF;
  RETURN QUERY
  SELECT t.id,t.requester_id,p.full_name,p.email,t.category,t.reservation_id,t.catalog_item_id,t.subject,t.description,
         t.priority,t.status,t.assigned_support_id,t.resolution_summary,t.created_at,t.updated_at,t.resolved_at
  FROM public.turismo_support_tickets t
  JOIN public.turismo_profiles p ON p.id=t.requester_id
  WHERE (p_status IS NULL OR t.status=p_status)
    AND (p_priority IS NULL OR t.priority=p_priority)
    AND (p_category IS NULL OR t.category=p_category)
    AND (p_search IS NULL OR t.subject ILIKE '%' || p_search || '%' OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
  ORDER BY CASE WHEN t.priority='urgent' THEN 0 WHEN t.priority='high' THEN 1 ELSE 2 END, t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_initiate_refund_request(
  p_ticket_id UUID,
  p_reservation_id UUID,
  p_amount NUMERIC,
  p_reason TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  support_limit NUMERIC;
  ticket_row public.turismo_support_tickets%ROWTYPE;
  reservation_row public.turismo_reservations%ROWTYPE;
  refund_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('support:refund_issue') THEN
    RAISE EXCEPTION 'No tienes permiso para iniciar reembolsos';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que cero'; END IF;
  IF NULLIF(TRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'El motivo es obligatorio'; END IF;
  SELECT max_refund_limit INTO support_limit FROM public.turismo_support_profiles WHERE profile_id=auth.uid();
  IF support_limit IS NULL OR p_amount > support_limit THEN RAISE EXCEPTION 'El monto supera el límite autorizado'; END IF;
  SELECT * INTO ticket_row FROM public.turismo_support_tickets WHERE id=p_ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket no encontrado'; END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id=p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
  IF ticket_row.reservation_id IS DISTINCT FROM p_reservation_id
     AND reservation_row.tourist_id <> ticket_row.requester_id
     AND reservation_row.provider_id <> ticket_row.requester_id THEN
    RAISE EXCEPTION 'El ticket no está relacionado con la reserva';
  END IF;
  INSERT INTO public.turismo_refund_requests(ticket_id,reservation_id,initiated_by,amount,currency,reason)
  VALUES (p_ticket_id,p_reservation_id,auth.uid(),p_amount,COALESCE(reservation_row.currency,'COP'),TRIM(p_reason))
  RETURNING id INTO refund_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details)
  VALUES (auth.uid(),'refund_requested',refund_id::TEXT,jsonb_build_object('ticket_id',p_ticket_id,'reservation_id',p_reservation_id,'amount',p_amount,'currency',COALESCE(reservation_row.currency,'COP')));
  RETURN refund_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_audit_logs(
  p_action TEXT DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID, actor_id UUID, actor_name TEXT, actor_email TEXT, action TEXT,
  entity_target TEXT, details JSONB, created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('audit:logs_read') THEN RAISE EXCEPTION 'No tienes permiso para consultar la auditoría'; END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN RAISE EXCEPTION 'El límite debe estar entre 1 y 500'; END IF;
  IF p_offset IS NULL OR p_offset < 0 THEN RAISE EXCEPTION 'El desplazamiento no puede ser negativo'; END IF;
  RETURN QUERY
  SELECT l.id,l.actor_id,p.full_name,p.email,l.action,l.entity_target,COALESCE(l.details,'{}'::jsonb),l.created_at
  FROM public.turismo_audit_logs l
  LEFT JOIN public.turismo_profiles p ON p.id=l.actor_id
  WHERE (p_action IS NULL OR l.action=p_action)
    AND (p_from IS NULL OR l.created_at >= p_from)
    AND (p_to IS NULL OR l.created_at <= p_to)
  ORDER BY l.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_create_audit_report(
  p_title TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_summary TEXT,
  p_findings JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE report_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('audit:logs_read') THEN RAISE EXCEPTION 'No tienes permiso para crear informes'; END IF;
  IF NULLIF(TRIM(p_title),'') IS NULL OR NULLIF(TRIM(p_summary),'') IS NULL THEN RAISE EXCEPTION 'Título y resumen son obligatorios'; END IF;
  IF p_period_start IS NOT NULL AND p_period_end IS NOT NULL AND p_period_end < p_period_start THEN RAISE EXCEPTION 'El periodo del informe no es válido'; END IF;
  IF p_findings IS NOT NULL AND jsonb_typeof(p_findings) <> 'array' THEN RAISE EXCEPTION 'Los hallazgos deben ser una lista'; END IF;
  INSERT INTO public.turismo_audit_reports(auditor_id,title,period_start,period_end,summary,findings)
  VALUES(auth.uid(),TRIM(p_title),p_period_start,p_period_end,TRIM(p_summary),COALESCE(p_findings,'[]'::jsonb))
  RETURNING id INTO report_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details)
  VALUES(auth.uid(),'audit_report_created',report_id::TEXT,jsonb_build_object('title',TRIM(p_title),'finding_count',jsonb_array_length(COALESCE(p_findings,'[]'::jsonb))));
  RETURN report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_configure_regulatory_profile(
  p_user_id UUID,
  p_entity_type TEXT,
  p_institutional_id TEXT,
  p_jurisdiction_scope TEXT,
  p_credential_url TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE profile_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_is_super_admin() THEN RAISE EXCEPTION 'Solo Super Admin puede configurar perfiles regulatorios'; END IF;
  IF p_entity_type IS NULL OR p_entity_type NOT IN ('MINCIT','FONTUR','CAMARA_COMERCIO') THEN RAISE EXCEPTION 'Entidad regulatoria inválida'; END IF;
  IF NULLIF(TRIM(p_institutional_id),'') IS NULL THEN RAISE EXCEPTION 'El identificador institucional es obligatorio'; END IF;
  IF p_entity_type='CAMARA_COMERCIO' AND NOT EXISTS (SELECT 1 FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND ur.is_active AND r.is_active AND r.code='camara_comercio') THEN RAISE EXCEPTION 'El usuario no tiene rol de Cámara de Comercio'; END IF;
  IF p_entity_type IN ('MINCIT','FONTUR') AND NOT EXISTS (SELECT 1 FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND ur.is_active AND r.is_active AND r.code='funcionario_mincit') THEN RAISE EXCEPTION 'El usuario no tiene rol funcionario_mincit'; END IF;
  INSERT INTO public.turismo_regulatory_profiles(profile_id,entity_type,institutional_id,jurisdiction_scope,credential_url)
  VALUES(p_user_id,p_entity_type::public.turismo_regulatory_entity_enum,TRIM(p_institutional_id),NULLIF(TRIM(p_jurisdiction_scope),''),NULLIF(TRIM(p_credential_url),''))
  ON CONFLICT(profile_id) DO UPDATE SET entity_type=EXCLUDED.entity_type,institutional_id=EXCLUDED.institutional_id,jurisdiction_scope=EXCLUDED.jurisdiction_scope,credential_url=EXCLUDED.credential_url,updated_at=NOW()
  RETURNING profile_id INTO profile_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details)
  VALUES(auth.uid(),'regulatory_profile_configured',p_user_id::TEXT,jsonb_build_object('entity_type',p_entity_type,'user_id',p_user_id));
  RETURN profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_regulatory_providers()
RETURNS TABLE (
  provider_id UUID, full_name TEXT, email TEXT, ruc TEXT, razon_social TEXT, nombre_comercial TEXT,
  sub_type TEXT, rnt_number TEXT, rnt_status TEXT, address TEXT,
  commercial_registration_number TEXT, commercial_status TEXT, commercial_expires_at DATE,
  rnt_expires_at DATE, rnt_verified_at TIMESTAMPTZ, commercial_verified_at TIMESTAMPTZ,
  last_rnt_note TEXT, last_commercial_note TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('regulatory:rnt_verify') THEN RAISE EXCEPTION 'No tienes permiso para consultar cumplimiento'; END IF;
  RETURN QUERY
  SELECT pp.profile_id,p.full_name,p.email,pp.ruc,pp.razon_social,pp.nombre_comercial,pp.sub_type::TEXT,pp.rnt_number,
    CASE WHEN NULLIF(pp.rnt_number,'') IS NULL THEN 'sin_rnt'
         WHEN c.rnt_expires_at IS NOT NULL AND c.rnt_expires_at < CURRENT_DATE THEN 'vencido'
         WHEN c.rnt_verified_at IS NOT NULL THEN 'verificado' ELSE 'pendiente' END,
    pp.address,c.commercial_registration_number,COALESCE(c.commercial_status,'pendiente'),c.commercial_expires_at,
    c.rnt_expires_at,c.rnt_verified_at,c.commercial_verified_at,c.last_rnt_note,c.last_commercial_note
  FROM public.turismo_provider_profiles pp
  JOIN public.turismo_profiles p ON p.id=pp.profile_id AND p.is_active
  LEFT JOIN public.turismo_provider_compliance c ON c.provider_id=pp.profile_id
  ORDER BY pp.razon_social;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_review_provider_compliance(
  p_provider_id UUID,
  p_review_type TEXT,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL,
  p_effective_until DATE DEFAULT NULL,
  p_registration_number TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  entity_type_value TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('regulatory:rnt_verify') THEN RAISE EXCEPTION 'No tienes permiso para revisar cumplimiento'; END IF;
  IF p_review_type NOT IN ('rnt','commercial') OR p_decision NOT IN ('verified','observed','rejected','expired') THEN RAISE EXCEPTION 'Revisión regulatoria inválida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turismo_provider_profiles WHERE profile_id=p_provider_id) THEN RAISE EXCEPTION 'Prestador no encontrado'; END IF;
  IF p_review_type='rnt' THEN
    IF NOT public.turismo_current_user_has_role('funcionario_mincit') THEN RAISE EXCEPTION 'Solo MinCIT/FONTUR puede verificar RNT'; END IF;
    SELECT COALESCE((SELECT entity_type::TEXT FROM public.turismo_regulatory_profiles WHERE profile_id=auth.uid()),'MINCIT') INTO entity_type_value;
    INSERT INTO public.turismo_provider_compliance(provider_id,rnt_expires_at,rnt_verified_at,last_rnt_note)
    VALUES(p_provider_id,CASE WHEN p_decision='expired' THEN COALESCE(p_effective_until,CURRENT_DATE) ELSE p_effective_until END,CASE WHEN p_decision='verified' THEN NOW() ELSE NULL END,NULLIF(TRIM(p_notes),''))
    ON CONFLICT(provider_id) DO UPDATE SET rnt_expires_at=COALESCE(EXCLUDED.rnt_expires_at,turismo_provider_compliance.rnt_expires_at),rnt_verified_at=CASE WHEN p_decision='verified' THEN NOW() ELSE NULL END,last_rnt_note=NULLIF(TRIM(p_notes),'')
      ,updated_at=NOW();
    IF p_registration_number IS NOT NULL THEN UPDATE public.turismo_provider_profiles SET rnt_number=NULLIF(TRIM(p_registration_number),'') WHERE profile_id=p_provider_id; END IF;
    UPDATE public.turismo_provider_profiles
    SET rnt_status=CASE WHEN p_decision='verified' THEN 'verificado'::public.turismo_rnt_status_enum WHEN p_decision='expired' THEN 'vencido'::public.turismo_rnt_status_enum ELSE 'pendiente'::public.turismo_rnt_status_enum END
    WHERE profile_id=p_provider_id;
  ELSE
    IF NOT public.turismo_current_user_has_role('camara_comercio') THEN RAISE EXCEPTION 'Solo la Cámara de Comercio puede verificar registro mercantil'; END IF;
    SELECT COALESCE((SELECT entity_type::TEXT FROM public.turismo_regulatory_profiles WHERE profile_id=auth.uid()),'CAMARA_COMERCIO') INTO entity_type_value;
    INSERT INTO public.turismo_provider_compliance(provider_id,commercial_registration_number,commercial_status,commercial_expires_at,commercial_verified_at,last_commercial_note)
    VALUES(p_provider_id,NULLIF(TRIM(p_registration_number),''),CASE p_decision WHEN 'verified' THEN 'verificado' WHEN 'observed' THEN 'observado' WHEN 'rejected' THEN 'rechazado' ELSE 'vencido' END,p_effective_until,CASE WHEN p_decision='verified' THEN NOW() ELSE NULL END,NULLIF(TRIM(p_notes),''))
    ON CONFLICT(provider_id) DO UPDATE SET commercial_registration_number=COALESCE(EXCLUDED.commercial_registration_number,turismo_provider_compliance.commercial_registration_number),commercial_status=EXCLUDED.commercial_status,commercial_expires_at=EXCLUDED.commercial_expires_at,commercial_verified_at=CASE WHEN p_decision='verified' THEN NOW() ELSE NULL END,last_commercial_note=NULLIF(TRIM(p_notes),''),updated_at=NOW();
  END IF;
  INSERT INTO public.turismo_regulatory_observations(provider_id,reviewer_id,entity_type,review_type,decision,notes,effective_until)
  VALUES(p_provider_id,auth.uid(),entity_type_value,p_review_type,p_decision,NULLIF(TRIM(p_notes),''),p_effective_until);
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details)
  VALUES(auth.uid(),CASE WHEN p_review_type='rnt' THEN 'provider_rnt_reviewed' ELSE 'provider_commercial_reviewed' END,p_provider_id::TEXT,jsonb_build_object('decision',p_decision,'effective_until',p_effective_until,'registration_number_present',NULLIF(TRIM(p_registration_number),'') IS NOT NULL));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_recalculate_affiliate_earnings(p_affiliate_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.turismo_affiliate_profiles a
  SET total_earnings=COALESCE((SELECT SUM(c.amount) FROM public.turismo_affiliate_commissions c WHERE c.affiliate_id=a.profile_id AND c.status IN ('earned','paid')),0),updated_at=NOW()
  WHERE a.profile_id=p_affiliate_id;
$$;

DROP FUNCTION IF EXISTS public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT);
CREATE OR REPLACE FUNCTION public.turismo_create_reservation(
  p_item_id UUID,
  p_reservation_date DATE,
  p_end_date DATE,
  p_guests INTEGER,
  p_notes TEXT,
  p_referral_code TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item_row public.turismo_catalog_items%ROWTYPE;
  affiliate_row public.turismo_affiliate_profiles%ROWTYPE;
  reservation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticación requerida'; END IF;
  IF NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:book') THEN RAISE EXCEPTION 'No tienes permiso para reservar'; END IF;
  IF p_guests IS NULL OR p_guests < 1 THEN RAISE EXCEPTION 'El número de personas debe ser al menos 1'; END IF;
  IF p_reservation_date IS NULL OR p_reservation_date < CURRENT_DATE THEN RAISE EXCEPTION 'La fecha de reserva no puede ser anterior a hoy'; END IF;
  IF p_end_date IS NOT NULL AND p_end_date < p_reservation_date THEN RAISE EXCEPTION 'La fecha final no puede ser anterior a la inicial'; END IF;
  SELECT * INTO item_row FROM public.turismo_catalog_items WHERE id=p_item_id AND status='published' AND is_reservable=TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La oferta no está publicada o no acepta reservas'; END IF;
  IF NULLIF(TRIM(p_referral_code),'') IS NOT NULL THEN
    SELECT a.* INTO affiliate_row FROM public.turismo_affiliate_profiles a
    JOIN public.turismo_profiles p ON p.id=a.profile_id AND p.is_active
    JOIN public.turismo_user_roles ur ON ur.user_id=a.profile_id AND ur.is_active
    JOIN public.turismo_roles r ON r.id=ur.role_id AND r.is_active AND r.code IN ('afiliado','embajador')
    WHERE lower(a.referral_code)=lower(TRIM(p_referral_code)) AND a.profile_id<>auth.uid()
    LIMIT 1;
  END IF;
  INSERT INTO public.turismo_reservations(item_id,tourist_id,provider_id,reservation_date,end_date,guests,notes,status,currency,affiliate_id,referral_code,commission_rate_snapshot)
  VALUES(p_item_id,auth.uid(),item_row.provider_id,p_reservation_date,p_end_date,p_guests,p_notes,'requested',COALESCE(item_row.currency,'COP'),affiliate_row.profile_id,CASE WHEN affiliate_row.profile_id IS NOT NULL THEN TRIM(p_referral_code) ELSE NULL END,affiliate_row.commission_rate)
  RETURNING id INTO reservation_id;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'reservation_created',reservation_id::TEXT,jsonb_build_object('item_id',p_item_id,'guests',p_guests,'referred',affiliate_row.profile_id IS NOT NULL));
  RETURN reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_provider_update_reservation(p_reservation_id UUID,p_action TEXT,p_quoted_amount NUMERIC DEFAULT NULL,p_response TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reservation_row public.turismo_reservations%ROWTYPE;
  next_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('provider:bookings_view') THEN RAISE EXCEPTION 'No tienes permiso para gestionar reservas'; END IF;
  SELECT * INTO reservation_row FROM public.turismo_reservations WHERE id=p_reservation_id AND provider_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada o no pertenece al prestador'; END IF;
  next_status := CASE WHEN p_action='confirm' AND reservation_row.status='requested' THEN 'confirmed' WHEN p_action='reject' AND reservation_row.status='requested' THEN 'rejected' WHEN p_action='complete' AND reservation_row.status='confirmed' THEN 'completed' ELSE NULL END;
  IF next_status IS NULL THEN RAISE EXCEPTION 'Transición de reserva inválida'; END IF;
  UPDATE public.turismo_reservations SET status=next_status,quoted_amount=COALESCE(p_quoted_amount,quoted_amount),provider_response=COALESCE(NULLIF(TRIM(p_response),''),provider_response),updated_at=NOW() WHERE id=p_reservation_id;
  IF next_status='confirmed' AND reservation_row.affiliate_id IS NOT NULL AND COALESCE(p_quoted_amount,reservation_row.quoted_amount,0)>0 THEN
    INSERT INTO public.turismo_affiliate_commissions(affiliate_id,reservation_id,rate,base_amount,amount,currency,status)
    VALUES(reservation_row.affiliate_id,p_reservation_id,COALESCE(reservation_row.commission_rate_snapshot,0),COALESCE(p_quoted_amount,reservation_row.quoted_amount),COALESCE(p_quoted_amount,reservation_row.quoted_amount)*COALESCE(reservation_row.commission_rate_snapshot,0)/100,COALESCE(reservation_row.currency,'COP'),'pending')
    ON CONFLICT(reservation_id) DO UPDATE SET rate=EXCLUDED.rate,base_amount=EXCLUDED.base_amount,amount=EXCLUDED.amount,currency=EXCLUDED.currency,status=CASE WHEN turismo_affiliate_commissions.status='void' THEN 'pending' ELSE turismo_affiliate_commissions.status END;
  ELSIF next_status='completed' AND reservation_row.affiliate_id IS NOT NULL THEN
    INSERT INTO public.turismo_affiliate_commissions(affiliate_id,reservation_id,rate,base_amount,amount,currency,status,earned_at)
    VALUES(reservation_row.affiliate_id,p_reservation_id,COALESCE(reservation_row.commission_rate_snapshot,0),COALESCE(p_quoted_amount,reservation_row.quoted_amount,0),COALESCE(p_quoted_amount,reservation_row.quoted_amount,0)*COALESCE(reservation_row.commission_rate_snapshot,0)/100,COALESCE(reservation_row.currency,'COP'),'earned',NOW())
    ON CONFLICT(reservation_id) DO UPDATE SET rate=EXCLUDED.rate,base_amount=EXCLUDED.base_amount,amount=EXCLUDED.amount,status='earned',earned_at=COALESCE(turismo_affiliate_commissions.earned_at,NOW());
    PERFORM public.turismo_recalculate_affiliate_earnings(reservation_row.affiliate_id);
    INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'affiliate_commission_earned',p_reservation_id::TEXT,jsonb_build_object('affiliate_id',reservation_row.affiliate_id));
  ELSIF next_status='rejected' AND reservation_row.affiliate_id IS NOT NULL THEN
    UPDATE public.turismo_affiliate_commissions SET status='void' WHERE reservation_id=p_reservation_id;
    PERFORM public.turismo_recalculate_affiliate_earnings(reservation_row.affiliate_id);
  END IF;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),CASE next_status WHEN 'confirmed' THEN 'reservation_confirmed' WHEN 'rejected' THEN 'reservation_rejected' ELSE 'reservation_completed' END,p_reservation_id::TEXT,'{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_cancel_reservation(p_reservation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affiliate_id_value UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('tourist:book') THEN RAISE EXCEPTION 'No tienes permiso para cancelar reservas'; END IF;
  UPDATE public.turismo_reservations SET status='cancelled',updated_at=NOW() WHERE id=p_reservation_id AND tourist_id=auth.uid() AND status IN ('requested','confirmed') RETURNING affiliate_id INTO affiliate_id_value;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada o no se puede cancelar'; END IF;
  IF affiliate_id_value IS NOT NULL THEN UPDATE public.turismo_affiliate_commissions SET status='void' WHERE reservation_id=p_reservation_id; PERFORM public.turismo_recalculate_affiliate_earnings(affiliate_id_value); END IF;
  INSERT INTO public.turismo_audit_logs(actor_id,action,entity_target,details) VALUES(auth.uid(),'reservation_cancelled',p_reservation_id::TEXT,'{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_register_referral_visit(
  p_referral_code TEXT,
  p_visitor_token TEXT,
  p_landing_path TEXT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affiliate_id_value UUID;
BEGIN
  IF NULLIF(TRIM(p_referral_code),'') IS NULL OR NULLIF(TRIM(p_visitor_token),'') IS NULL THEN RETURN FALSE; END IF;
  SELECT a.profile_id INTO affiliate_id_value FROM public.turismo_affiliate_profiles a
  JOIN public.turismo_profiles p ON p.id=a.profile_id AND p.is_active
  WHERE lower(a.referral_code)=lower(TRIM(p_referral_code))
    AND EXISTS (SELECT 1 FROM public.turismo_user_roles ur JOIN public.turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=a.profile_id AND ur.is_active AND r.is_active AND r.code IN ('afiliado','embajador'))
  LIMIT 1;
  IF affiliate_id_value IS NULL THEN RETURN FALSE; END IF;
  INSERT INTO public.turismo_referral_visits(affiliate_id,referral_code,visitor_token,landing_path)
  VALUES(affiliate_id_value,TRIM(p_referral_code),TRIM(p_visitor_token),p_landing_path)
  ON CONFLICT(affiliate_id,visitor_token) DO NOTHING;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_affiliate_dashboard()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  affiliate_row public.turismo_affiliate_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_role('afiliado') OR public.turismo_current_user_has_role('embajador')) THEN RAISE EXCEPTION 'No tienes acceso al panel de referidos'; END IF;
  SELECT * INTO affiliate_row FROM public.turismo_affiliate_profiles WHERE profile_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil de afiliado no configurado'; END IF;
  RETURN jsonb_build_object(
    'referral_code',affiliate_row.referral_code,
    'commission_rate',affiliate_row.commission_rate,
    'total_earnings',COALESCE((SELECT SUM(amount) FROM public.turismo_affiliate_commissions WHERE affiliate_id=auth.uid() AND status IN ('earned','paid')),0),
    'unique_visits',(SELECT COUNT(*) FROM public.turismo_referral_visits WHERE affiliate_id=auth.uid()),
    'referred_reservations',(SELECT COUNT(*) FROM public.turismo_reservations WHERE affiliate_id=auth.uid()),
    'pending_commission',COALESCE((SELECT SUM(amount) FROM public.turismo_affiliate_commissions WHERE affiliate_id=auth.uid() AND status='pending'),0),
    'earned_commission',COALESCE((SELECT SUM(amount) FROM public.turismo_affiliate_commissions WHERE affiliate_id=auth.uid() AND status='earned'),0),
    'paid_commission',COALESCE((SELECT SUM(amount) FROM public.turismo_affiliate_commissions WHERE affiliate_id=auth.uid() AND status='paid'),0),
    'payout_method',affiliate_row.payout_method,
    'recent_commissions',COALESCE((SELECT jsonb_agg(jsonb_build_object('reservation_id',c.reservation_id,'catalog_item_title',i.title,'status',c.status,'base_amount',c.base_amount,'commission_amount',c.amount,'created_at',c.created_at) ORDER BY c.created_at DESC) FROM public.turismo_affiliate_commissions c JOIN public.turismo_reservations r ON r.id=c.reservation_id JOIN public.turismo_catalog_items i ON i.id=r.item_id WHERE c.affiliate_id=auth.uid() LIMIT 10),'[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_analytics(p_period TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  period_start TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT public.turismo_current_user_has_permission('bi:analytics_read') THEN RAISE EXCEPTION 'No tienes permiso para consultar analítica'; END IF;
  IF p_period NOT IN ('month','quarter','year') THEN RAISE EXCEPTION 'Periodo analítico inválido'; END IF;
  period_start := CASE p_period WHEN 'month' THEN date_trunc('month',CURRENT_DATE) WHEN 'quarter' THEN date_trunc('quarter',CURRENT_DATE) ELSE date_trunc('year',CURRENT_DATE) END;
  RETURN jsonb_build_object(
    'period',p_period,'period_start',period_start::DATE,
    'published_catalog_count',(SELECT COUNT(*) FROM public.turismo_catalog_items WHERE status='published'),
    'active_provider_count',(SELECT COUNT(*) FROM public.turismo_provider_profiles pp JOIN public.turismo_profiles p ON p.id=pp.profile_id WHERE p.is_active),
    'reservation_count',(SELECT COUNT(*) FROM public.turismo_reservations WHERE created_at >= period_start),
    'completed_reservations',(SELECT COUNT(*) FROM public.turismo_reservations WHERE created_at >= period_start AND status='completed'),
    'cancelled_reservations',(SELECT COUNT(*) FROM public.turismo_reservations WHERE created_at >= period_start AND status IN ('cancelled','rejected')),
    'unique_tourists',(SELECT COUNT(DISTINCT tourist_id) FROM public.turismo_reservations WHERE created_at >= period_start),
    'published_reviews',(SELECT COUNT(*) FROM public.turismo_reviews WHERE created_at >= period_start AND status='published'),
    'average_rating',COALESCE((SELECT ROUND(AVG(rating)::NUMERIC,2) FROM public.turismo_reviews WHERE created_at >= period_start AND status='published'),0),
    'quoted_reservation_value',COALESCE((SELECT SUM(quoted_amount) FROM public.turismo_reservations WHERE created_at >= period_start),0),
    'catalog_by_type',COALESCE((SELECT jsonb_agg(jsonb_build_object('label',item_type,'value',count_value) ORDER BY count_value DESC) FROM (SELECT item_type,COUNT(*) count_value FROM public.turismo_catalog_items WHERE status='published' GROUP BY item_type) x),'[]'::jsonb),
    'reservation_by_status',COALESCE((SELECT jsonb_agg(jsonb_build_object('label',status,'value',count_value) ORDER BY count_value DESC) FROM (SELECT status,COUNT(*) count_value FROM public.turismo_reservations WHERE created_at >= period_start GROUP BY status) x),'[]'::jsonb),
    'top_categories',COALESCE((SELECT jsonb_agg(jsonb_build_object('label',category,'value',count_value) ORDER BY count_value DESC) FROM (SELECT COALESCE(category,'Sin categoría') category,COUNT(*) count_value FROM public.turismo_catalog_items WHERE status='published' GROUP BY COALESCE(category,'Sin categoría') ORDER BY COUNT(*) DESC LIMIT 10) x),'[]'::jsonb),
    'top_catalog_items',COALESCE((SELECT jsonb_agg(jsonb_build_object('label',title,'value',reviews_count,'rating',rating) ORDER BY reviews_count DESC,rating DESC) FROM (SELECT title,reviews_count,rating FROM public.turismo_catalog_items WHERE status='published' ORDER BY reviews_count DESC,rating DESC LIMIT 10) x),'[]'::jsonb)
  );
END;
$$;

ALTER TABLE public.turismo_support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_support_tickets_select ON public.turismo_support_tickets;
CREATE POLICY turismo_support_tickets_select ON public.turismo_support_tickets FOR SELECT TO authenticated
  USING (requester_id=auth.uid() OR public.turismo_current_user_has_permission('support:tickets_manage'));
ALTER TABLE public.turismo_support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_support_messages_select ON public.turismo_support_messages;
CREATE POLICY turismo_support_messages_select ON public.turismo_support_messages FOR SELECT TO authenticated
  USING (public.turismo_current_user_has_permission('support:tickets_manage') OR (is_internal=FALSE AND EXISTS (SELECT 1 FROM public.turismo_support_tickets t WHERE t.id=ticket_id AND t.requester_id=auth.uid())));
ALTER TABLE public.turismo_refund_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_refund_requests_select ON public.turismo_refund_requests;
CREATE POLICY turismo_refund_requests_select ON public.turismo_refund_requests FOR SELECT TO authenticated
  USING (public.turismo_current_user_has_permission('support:tickets_manage') OR initiated_by=auth.uid() OR EXISTS (SELECT 1 FROM public.turismo_support_tickets t WHERE t.id=ticket_id AND t.requester_id=auth.uid()));
ALTER TABLE public.turismo_audit_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_audit_reports_select ON public.turismo_audit_reports;
CREATE POLICY turismo_audit_reports_select ON public.turismo_audit_reports FOR SELECT TO authenticated
  USING (public.turismo_current_user_has_permission('audit:logs_read') OR public.turismo_is_super_admin());
ALTER TABLE public.turismo_provider_compliance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_provider_compliance_select ON public.turismo_provider_compliance;
CREATE POLICY turismo_provider_compliance_select ON public.turismo_provider_compliance FOR SELECT TO authenticated
  USING (provider_id=auth.uid() OR public.turismo_current_user_has_permission('regulatory:rnt_verify') OR public.turismo_is_super_admin());
ALTER TABLE public.turismo_regulatory_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_regulatory_observations_select ON public.turismo_regulatory_observations;
CREATE POLICY turismo_regulatory_observations_select ON public.turismo_regulatory_observations FOR SELECT TO authenticated
  USING (provider_id=auth.uid() OR reviewer_id=auth.uid() OR public.turismo_current_user_has_permission('regulatory:rnt_verify') OR public.turismo_is_super_admin());
ALTER TABLE public.turismo_referral_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_referral_visits_select ON public.turismo_referral_visits;
CREATE POLICY turismo_referral_visits_select ON public.turismo_referral_visits FOR SELECT TO authenticated
  USING (affiliate_id=auth.uid() OR public.turismo_is_super_admin());
ALTER TABLE public.turismo_affiliate_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS turismo_affiliate_commissions_select ON public.turismo_affiliate_commissions;
CREATE POLICY turismo_affiliate_commissions_select ON public.turismo_affiliate_commissions FOR SELECT TO authenticated
  USING (affiliate_id=auth.uid() OR public.turismo_is_super_admin());

REVOKE ALL ON TABLE public.turismo_support_tickets,public.turismo_support_messages,public.turismo_refund_requests,public.turismo_audit_reports,public.turismo_provider_compliance,public.turismo_regulatory_observations,public.turismo_referral_visits,public.turismo_affiliate_commissions FROM anon,authenticated;
GRANT SELECT ON TABLE public.turismo_support_tickets,public.turismo_support_messages,public.turismo_refund_requests,public.turismo_audit_reports,public.turismo_provider_compliance,public.turismo_regulatory_observations,public.turismo_referral_visits,public.turismo_affiliate_commissions TO authenticated;

REVOKE ALL ON FUNCTION public.turismo_create_support_ticket(TEXT,TEXT,TEXT,TEXT,UUID,UUID),public.turismo_add_support_message(UUID,TEXT,BOOLEAN),public.turismo_support_update_ticket(UUID,TEXT,TEXT,BOOLEAN,TEXT),public.turismo_get_support_queue(TEXT,TEXT,TEXT,TEXT),public.turismo_initiate_refund_request(UUID,UUID,NUMERIC,TEXT),public.turismo_get_audit_logs(TEXT,TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,INTEGER),public.turismo_create_audit_report(TEXT,DATE,DATE,TEXT,JSONB),public.turismo_configure_regulatory_profile(UUID,TEXT,TEXT,TEXT,TEXT),public.turismo_get_regulatory_providers(),public.turismo_review_provider_compliance(UUID,TEXT,TEXT,TEXT,DATE,TEXT),public.turismo_get_affiliate_dashboard(),public.turismo_get_analytics(TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.turismo_create_support_ticket(TEXT,TEXT,TEXT,TEXT,UUID,UUID),public.turismo_add_support_message(UUID,TEXT,BOOLEAN),public.turismo_support_update_ticket(UUID,TEXT,TEXT,BOOLEAN,TEXT),public.turismo_get_support_queue(TEXT,TEXT,TEXT,TEXT),public.turismo_initiate_refund_request(UUID,UUID,NUMERIC,TEXT),public.turismo_get_audit_logs(TEXT,TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,INTEGER),public.turismo_create_audit_report(TEXT,DATE,DATE,TEXT,JSONB),public.turismo_configure_regulatory_profile(UUID,TEXT,TEXT,TEXT,TEXT),public.turismo_get_regulatory_providers(),public.turismo_review_provider_compliance(UUID,TEXT,TEXT,TEXT,DATE,TEXT),public.turismo_get_affiliate_dashboard(),public.turismo_get_analytics(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.turismo_register_referral_visit(TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.turismo_register_referral_visit(TEXT,TEXT,TEXT) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.turismo_recalculate_affiliate_earnings(UUID) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT,TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.turismo_provider_update_reservation(UUID,TEXT,NUMERIC,TEXT),public.turismo_cancel_reservation(UUID) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.turismo_provider_update_reservation(UUID,TEXT,NUMERIC,TEXT),public.turismo_cancel_reservation(UUID) TO authenticated;

COMMIT;
