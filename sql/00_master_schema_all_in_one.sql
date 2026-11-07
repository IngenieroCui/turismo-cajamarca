-- Turismo Cajamarca: esquema fresco RBAC multi-rol (Supabase PostgreSQL).
-- Esquema fresco final equivalente a las migraciones 08–16.
-- Las migraciones separadas se conservan para actualizar bases existentes.
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$ BEGIN CREATE TYPE public.turismo_document_type_enum AS ENUM ('DNI','RUC','PASAPORTE','CE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.turismo_provider_sub_type_enum AS ENUM ('alojamiento','gastronomia','agencia_viajes','transporte','guia','artesania','entretenimiento'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.turismo_provider_org_role_enum AS ENUM ('dueno','colaborador'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.turismo_rnt_status_enum AS ENUM ('verificado','pendiente','vencido','sin_rnt'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.turismo_regulatory_entity_enum AS ENUM ('MINCIT','FONTUR','DIRCETUR','CAMARA_COMERCIO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.turismo_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE, full_name TEXT, avatar_url TEXT, phone TEXT,
  document_type public.turismo_document_type_enum DEFAULT 'DNI', document_number TEXT, tenant_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX turismo_profiles_tenant_idx ON public.turismo_profiles(tenant_id);
CREATE TABLE public.turismo_tourist_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  country_of_origin TEXT, nationality TEXT, preferred_language TEXT DEFAULT 'es', emergency_contact_name TEXT,
  emergency_contact_phone TEXT, travel_preferences TEXT[] DEFAULT '{}', habeas_data_consent BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_provider_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  ruc TEXT NOT NULL, razon_social TEXT NOT NULL, nombre_comercial TEXT,
  sub_type public.turismo_provider_sub_type_enum, org_role public.turismo_provider_org_role_enum DEFAULT 'dueno',
  rnt_number TEXT, rnt_status public.turismo_rnt_status_enum DEFAULT 'pendiente', address TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, website_url TEXT, social_links JSONB DEFAULT '{}',
  specific_metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_affiliate_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE, commission_rate NUMERIC(5,2),
  payout_method TEXT CHECK (payout_method IN ('nequi','daviplata','transferencia','yape','plin','cci')) DEFAULT 'transferencia',
  payout_account_info JSONB DEFAULT '{}', total_earnings NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_regulatory_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  entity_type public.turismo_regulatory_entity_enum NOT NULL, institutional_id TEXT NOT NULL,
  jurisdiction_scope TEXT, credential_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_moderator_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  specialty_area TEXT DEFAULT 'General', assigned_categories TEXT[] DEFAULT '{}', moderation_level TEXT DEFAULT 'Junior',
  daily_quota INT DEFAULT 50, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_auditor_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  audit_certification_id TEXT, institutional_scope TEXT DEFAULT 'Regional', security_clearance_level TEXT DEFAULT 'Nivel 2',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_support_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  support_level TEXT DEFAULT 'Nivel 1', assigned_queue TEXT DEFAULT 'Atención General', max_refund_limit NUMERIC(10,2) DEFAULT 500,
  shift_hours TEXT DEFAULT '8am - 5pm', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_analyst_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  bi_tool TEXT DEFAULT 'Metabase', dataset_access_scope TEXT DEFAULT 'Datos Agregados Anonimizados', export_format_permission BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_devops_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  git_handle TEXT, environment_access TEXT DEFAULT 'Staging', public_ssh_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_ai_service_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  service_name TEXT DEFAULT 'Motor de recomendaciones determinísticas', model_version TEXT DEFAULT 'rules-v1', daily_token_quota INT DEFAULT 0,
  endpoint_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.turismo_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), actor_id UUID REFERENCES public.turismo_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, entity_target TEXT NOT NULL, details JSONB DEFAULT '{}', ip_address TEXT, user_agent TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.turismo_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT,
  badge_color TEXT NOT NULL DEFAULT 'bg-slate-500/10 text-slate-300 border-slate-500/20', folder_name TEXT NOT NULL DEFAULT 'turista',
  is_active BOOLEAN NOT NULL DEFAULT TRUE, is_protected BOOLEAN NOT NULL DEFAULT FALSE, is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.turismo_permissions (
  code TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, module TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.turismo_role_permissions (
  role_id UUID NOT NULL REFERENCES public.turismo_roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.turismo_permissions(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(role_id,permission_code)
);
CREATE TABLE public.turismo_user_roles (
  user_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.turismo_roles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by UUID REFERENCES public.turismo_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,role_id)
);
CREATE UNIQUE INDEX turismo_one_primary_role_per_user ON public.turismo_user_roles(user_id) WHERE is_primary AND is_active;

INSERT INTO public.turismo_roles(code,name,description,badge_color,folder_name,is_protected,is_system) VALUES
 ('usuario','Usuario legado','Rol histórico de compatibilidad. Las nuevas cuentas utilizan el rol Turista.','bg-slate-500/10 text-slate-300 border-slate-500/20','usuario',false,false),
 ('turista','Turista','Usuario final que explora, planifica y reserva experiencias turísticas.','bg-blue-500/10 text-blue-400 border-blue-500/20','turista',false,false),
 ('prestador_turistico','Prestador Turístico','Empresas, guías, hoteles y operadores turísticos.','bg-emerald-500/10 text-emerald-400 border-emerald-500/20','prestador_turistico',false,false),
 ('admin','Administrador','Operación diaria de la plataforma y usuarios.','bg-purple-500/10 text-purple-400 border-purple-500/20','admin',true,false),
 ('super_admin','Super Administrador','Control global de la plataforma.','bg-red-500/10 text-red-400 border-red-500/20','super_admin',true,false),
 ('moderador','Moderador','Revisión y aprobación de contenidos.','bg-indigo-500/10 text-indigo-400 border-indigo-500/20','moderador',false,false),
 ('auditor','Auditor','Supervisión de trazabilidad y auditoría.','bg-amber-500/10 text-amber-400 border-amber-500/20','auditor',true,false),
 ('soporte','Soporte Técnico','Atención de incidencias.','bg-teal-500/10 text-teal-400 border-teal-500/20','soporte',false,false),
 ('analista_datos','Analista de Datos','Inteligencia de negocios y datos agregados.','bg-cyan-500/10 text-cyan-400 border-cyan-500/20','analista_datos',false,false),
 ('servicios_ia','Servicio IA / Sistema','Identidad de servicio para procesos de IA.','bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20','servicios_ia',true,true),
 ('desarrollador','Desarrollador / DevOps','Acceso técnico e infraestructura.','bg-slate-600/10 text-slate-300 border-slate-600/20','desarrollador',true,false),
 ('embajador','Embajador','Promoción y referidos turísticos.','bg-orange-500/10 text-orange-400 border-orange-500/20','embajador',false,false),
 ('afiliado','Afiliado','Red de referidos y promociones.','bg-rose-500/10 text-rose-400 border-rose-500/20','afiliado',false,false),
 ('funcionario_mincit','Funcionario MinCIT / FONTUR','Supervisión regulatoria.','bg-yellow-500/10 text-yellow-500 border-yellow-500/20','funcionario_mincit',true,false),
 ('camara_comercio','Cámara de Comercio','Validación y formalización empresarial.','bg-lime-500/10 text-lime-400 border-lime-500/20','camara_comercio',true,false);
INSERT INTO public.turismo_permissions(code,name,description,module) VALUES
 ('*','Acceso global','Acceso global de Super Administrador.','platform'),('platform:read','Consultar plataforma','Consultar configuración y estado de la plataforma.','platform'),('platform:write','Operar plataforma','Ejecutar operaciones de plataforma.','platform'),('platform:config','Configurar plataforma','Modificar configuración de plataforma.','platform'),('users:manage','Gestionar usuarios','Administrar estado y roles de usuarios.','users'),('roles:manage','Gestionar permisos','Administrar permisos heredados por los roles.','roles'),('content:moderate','Moderar contenido','Revisar contenido reportado.','content'),('content:approve','Aprobar contenido','Aprobar contenido turístico.','content'),('content:reject','Rechazar contenido','Rechazar contenido turístico.','content'),('provider:catalog_manage','Gestionar catálogo','Administrar información del catálogo.','provider'),('provider:offers_manage','Gestionar ofertas','Administrar ofertas del prestador.','provider'),('provider:bookings_view','Consultar reservas','Consultar reservas del prestador.','provider'),('provider:finances_view','Consultar finanzas','Consultar información financiera.','provider'),('tourist:book','Reservar experiencias','Crear reservas turísticas.','tourist'),('tourist:review','Publicar reseñas','Publicar reseñas turísticas.','tourist'),('tourist:profile','Gestionar perfil','Gestionar datos personales turísticos.','tourist'),('audit:logs_read','Leer auditoría','Consultar bitácoras de auditoría.','audit'),('audit:blockchain_read','Leer integridad','Consultar evidencias de integridad.','audit'),('support:tickets_manage','Gestionar soporte','Atender solicitudes de soporte.','support'),('support:refund_issue','Emitir reembolsos','Emitir reembolsos autorizados.','support'),('bi:analytics_read','Leer analítica','Consultar analítica agregada.','bi'),('bi:reports_export','Exportar informes','Exportar informes de negocio.','bi'),('ai:recommendations_read','Consultar recomendaciones','Usar recomendaciones de IA.','ai'),('ai:embeddings_write','Escribir embeddings','Escribir embeddings de servicio.','ai'),('devops:infra_manage','Gestionar infraestructura','Administrar infraestructura técnica.','devops'),('ambassador:referral_manage','Gestionar referidos','Administrar campañas de referidos.','ambassador'),('ambassador:commissions_view','Consultar comisiones','Consultar comisiones de referidos.','ambassador'),('regulatory:rnt_verify','Verificar RNT','Verificar registros turísticos.','regulatory'),('regulatory:compliance_report','Reportar cumplimiento','Emitir informes regulatorios.','regulatory');
INSERT INTO public.turismo_role_permissions(role_id,permission_code) SELECT r.id,x.permission_code FROM (VALUES
 ('super_admin','*'),('admin','platform:read'),('admin','platform:config'),('admin','users:manage'),('admin','roles:manage'),('admin','content:moderate'),('admin','content:approve'),('admin','content:reject'),('admin','support:tickets_manage'),('moderador','content:moderate'),('moderador','content:approve'),('moderador','content:reject'),('prestador_turistico','provider:catalog_manage'),('prestador_turistico','provider:offers_manage'),('prestador_turistico','provider:bookings_view'),('prestador_turistico','provider:finances_view'),('turista','tourist:book'),('turista','tourist:review'),('turista','tourist:profile'),('auditor','audit:logs_read'),('auditor','audit:blockchain_read'),('soporte','support:tickets_manage'),('soporte','support:refund_issue'),('analista_datos','bi:analytics_read'),('analista_datos','bi:reports_export'),('desarrollador','devops:infra_manage'),('servicios_ia','ai:recommendations_read'),('servicios_ia','ai:embeddings_write'),('embajador','ambassador:referral_manage'),('embajador','ambassador:commissions_view'),('afiliado','ambassador:referral_manage'),('afiliado','ambassador:commissions_view'),('funcionario_mincit','regulatory:rnt_verify'),('funcionario_mincit','regulatory:compliance_report'),('camara_comercio','regulatory:rnt_verify'),('camara_comercio','regulatory:compliance_report')) x(role_code,permission_code) JOIN public.turismo_roles r ON r.code=x.role_code;

CREATE OR REPLACE FUNCTION public.turismo_current_user_is_active()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.turismo_profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.turismo_current_user_has_role(p_role_code TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM turismo_profiles p
    JOIN turismo_user_roles ur ON ur.user_id=p.id
    JOIN turismo_roles r ON r.id=ur.role_id
    WHERE p.id=auth.uid() AND p.is_active = TRUE AND ur.is_active = TRUE AND r.is_active = TRUE AND r.code=p_role_code
  );
$$;
CREATE OR REPLACE FUNCTION public.turismo_current_user_has_permission(p_permission_code TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM turismo_profiles p
    JOIN turismo_user_roles ur ON ur.user_id=p.id
    JOIN turismo_roles r ON r.id=ur.role_id
    JOIN turismo_role_permissions rp ON rp.role_id=r.id
    WHERE p.id=auth.uid() AND p.is_active = TRUE AND ur.is_active = TRUE AND r.is_active = TRUE
      AND rp.permission_code IN ('*',p_permission_code)
  );
$$;
CREATE OR REPLACE FUNCTION public.turismo_is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.turismo_current_user_has_role('super_admin'); $$;

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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; DROP TRIGGER IF EXISTS on_auth_user_created_turismo ON auth.users; CREATE TRIGGER on_auth_user_created_turismo AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.turismo_handle_new_user();

CREATE OR REPLACE FUNCTION public.turismo_assign_user_role(p_user_id UUID,p_role_code TEXT,p_make_primary BOOLEAN DEFAULT FALSE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_role turismo_roles%ROWTYPE; active_count INTEGER; has_devops BOOLEAN; caller_is_super BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN RAISE EXCEPTION 'No tienes permiso para gestionar usuarios'; END IF;
  SELECT * INTO target_role FROM turismo_roles WHERE code=p_role_code AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'El rol no existe o está inactivo'; END IF;
  IF target_role.is_system THEN RAISE EXCEPTION 'Los roles de sistema no se asignan a personas'; END IF;
  caller_is_super := turismo_is_super_admin();
  IF target_role.is_protected AND NOT caller_is_super THEN RAISE EXCEPTION 'Solo Super Admin puede gestionar roles protegidos'; END IF;
  IF NOT caller_is_super AND EXISTS (SELECT 1 FROM turismo_user_roles ur JOIN turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND ur.is_active AND r.is_protected) THEN RAISE EXCEPTION 'El usuario tiene un rol protegido'; END IF;
  SELECT EXISTS(SELECT 1 FROM turismo_user_roles ur JOIN turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND ur.is_active AND r.code='desarrollador') INTO has_devops;
  IF p_role_code='desarrollador' AND EXISTS(SELECT 1 FROM turismo_user_roles WHERE user_id=p_user_id AND is_active AND role_id<>target_role.id) THEN RAISE EXCEPTION 'DevOps debe permanecer aislado'; END IF;
  IF has_devops AND p_role_code<>'desarrollador' THEN RAISE EXCEPTION 'DevOps no puede coexistir con roles de negocio'; END IF;
  SELECT count(*) INTO active_count FROM turismo_user_roles WHERE user_id=p_user_id AND is_active;
  IF p_make_primary OR active_count=0 THEN UPDATE turismo_user_roles SET is_primary=FALSE WHERE user_id=p_user_id AND is_active; END IF;
  INSERT INTO turismo_user_roles(user_id,role_id,is_active,is_primary,assigned_by) VALUES(p_user_id,target_role.id,TRUE,(p_make_primary OR active_count=0),auth.uid())
  ON CONFLICT(user_id,role_id) DO UPDATE SET is_active=TRUE,is_primary=CASE WHEN p_make_primary OR active_count=0 THEN TRUE ELSE turismo_user_roles.is_primary END,assigned_by=auth.uid(),assigned_at=NOW();

  IF p_role_code = 'turista' THEN
    INSERT INTO turismo_tourist_profiles(profile_id) VALUES(p_user_id) ON CONFLICT(profile_id) DO NOTHING;
  ELSIF p_role_code='moderador' THEN
    INSERT INTO turismo_moderator_profiles(profile_id) VALUES(p_user_id) ON CONFLICT(profile_id) DO NOTHING;
  ELSIF p_role_code='auditor' THEN
    INSERT INTO turismo_auditor_profiles(profile_id) VALUES(p_user_id) ON CONFLICT(profile_id) DO NOTHING;
  ELSIF p_role_code='soporte' THEN
    INSERT INTO turismo_support_profiles(profile_id) VALUES(p_user_id) ON CONFLICT(profile_id) DO NOTHING;
  ELSIF p_role_code='analista_datos' THEN
    INSERT INTO turismo_analyst_profiles(profile_id) VALUES(p_user_id) ON CONFLICT(profile_id) DO NOTHING;
  ELSIF p_role_code='desarrollador' THEN
    INSERT INTO turismo_devops_profiles(profile_id) VALUES(p_user_id) ON CONFLICT(profile_id) DO NOTHING;
  ELSIF p_role_code IN ('embajador','afiliado') THEN
    INSERT INTO turismo_affiliate_profiles(profile_id,referral_code)
    VALUES(p_user_id,'CAJ-' || upper(substr(replace(p_user_id::TEXT,'-',''),1,12)))
    ON CONFLICT(profile_id) DO NOTHING;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_revoke_user_role(p_user_id UUID,p_role_code TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_id UUID; was_primary BOOLEAN; remaining INTEGER; caller_is_super BOOLEAN; target_protected BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT turismo_current_user_has_permission('users:manage') THEN RAISE EXCEPTION 'No tienes permiso para gestionar usuarios'; END IF;
  SELECT r.id,ur.is_primary,r.is_protected INTO target_id,was_primary,target_protected FROM turismo_user_roles ur JOIN turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND r.code=p_role_code AND ur.is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'El rol no está asignado'; END IF;
  caller_is_super := turismo_is_super_admin();
  IF target_protected AND NOT caller_is_super THEN RAISE EXCEPTION 'Solo Super Admin puede gestionar roles protegidos'; END IF;
  IF NOT caller_is_super AND EXISTS (SELECT 1 FROM turismo_user_roles ur JOIN turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND ur.is_active AND r.is_protected) THEN RAISE EXCEPTION 'El usuario tiene un rol protegido'; END IF;
  IF p_role_code='super_admin' AND p_user_id=auth.uid() THEN SELECT count(*) INTO remaining FROM turismo_user_roles ur JOIN turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND ur.is_active AND r.code='super_admin'; IF remaining<=1 THEN RAISE EXCEPTION 'No puedes eliminar tu último acceso Super Admin'; END IF; END IF;
  SELECT count(*) INTO remaining FROM turismo_user_roles WHERE user_id=p_user_id AND is_active;

  UPDATE turismo_user_roles SET is_active=FALSE,is_primary=FALSE WHERE user_id=p_user_id AND role_id=target_id;
  IF was_primary THEN UPDATE turismo_user_roles SET is_primary=TRUE WHERE user_id=p_user_id AND is_active AND role_id=(SELECT role_id FROM turismo_user_roles WHERE user_id=p_user_id AND is_active ORDER BY assigned_at LIMIT 1); END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_set_primary_user_role(p_user_id UUID,p_role_code TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'La cuenta está inactiva';
  END IF;
  IF p_user_id<>auth.uid() AND NOT turismo_current_user_has_permission('users:manage') THEN RAISE EXCEPTION 'No tienes permiso'; END IF;
  IF p_user_id<>auth.uid() AND NOT turismo_is_super_admin() AND EXISTS (SELECT 1 FROM turismo_user_roles ur JOIN turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND ur.is_active AND r.is_protected) THEN RAISE EXCEPTION 'El usuario tiene un rol protegido'; END IF;
  SELECT r.id INTO rid FROM turismo_user_roles ur JOIN turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND ur.is_active AND r.is_active AND r.code=p_role_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'El rol no está asignado activamente'; END IF;
  UPDATE turismo_user_roles SET is_primary=FALSE WHERE user_id=p_user_id AND is_active;
  UPDATE turismo_user_roles SET is_primary=TRUE WHERE user_id=p_user_id AND role_id=rid;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_set_role_permissions(p_role_code TEXT,p_permission_codes TEXT[]) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE role_row turismo_roles%ROWTYPE; caller_is_super BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT turismo_current_user_has_permission('roles:manage') THEN RAISE EXCEPTION 'No tienes permiso para gestionar permisos'; END IF;
  SELECT * INTO role_row FROM turismo_roles WHERE code=p_role_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rol no encontrado'; END IF;
  IF role_row.is_system THEN RAISE EXCEPTION 'Rol de sistema'; END IF;
  caller_is_super := turismo_is_super_admin();
  IF role_row.is_protected AND NOT caller_is_super THEN RAISE EXCEPTION 'Rol protegido'; END IF;
  IF p_role_code='super_admin' THEN RAISE EXCEPTION 'Los permisos de Super Admin son inmutables'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_permission_codes,ARRAY[]::TEXT[])) x(code) WHERE x.code='*') THEN RAISE EXCEPTION 'El permiso * está reservado para super_admin'; END IF;
  IF NOT caller_is_super AND EXISTS (SELECT 1 FROM unnest(COALESCE(p_permission_codes,ARRAY[]::TEXT[])) x(code) WHERE x.code NOT IN ('platform:read','content:moderate','content:approve','content:reject','provider:catalog_manage','provider:offers_manage','provider:bookings_view','provider:finances_view','tourist:book','tourist:review','tourist:profile','support:tickets_manage','support:refund_issue','bi:analytics_read','bi:reports_export','ambassador:referral_manage','ambassador:commissions_view')) THEN RAISE EXCEPTION 'El permiso no está permitido para un administrador'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(COALESCE(p_permission_codes,ARRAY[]::TEXT[])) x(code) WHERE NOT EXISTS(SELECT 1 FROM turismo_permissions p WHERE p.code=x.code)) THEN RAISE EXCEPTION 'Permiso inexistente'; END IF;
  DELETE FROM turismo_role_permissions WHERE role_id=role_row.id;
  INSERT INTO turismo_role_permissions(role_id,permission_code) SELECT role_row.id,code FROM unnest(COALESCE(p_permission_codes,ARRAY[]::TEXT[])) x(code) ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_set_user_status(p_user_id UUID,p_is_active BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT turismo_current_user_has_permission('users:manage') THEN RAISE EXCEPTION 'No tienes permiso'; END IF;
  IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'No puedes cambiar tu propio estado'; END IF;
  IF NOT turismo_is_super_admin() AND EXISTS(SELECT 1 FROM turismo_user_roles ur JOIN turismo_roles r ON r.id=ur.role_id WHERE ur.user_id=p_user_id AND ur.is_active AND r.is_protected) THEN RAISE EXCEPTION 'Usuario protegido'; END IF;
  UPDATE turismo_profiles SET is_active=p_is_active,updated_at=NOW() WHERE id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_create_role(p_code TEXT,p_name TEXT,p_description TEXT,p_badge_color TEXT,p_folder_name TEXT)
RETURNS turismo_roles LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE role_row turismo_roles%ROWTYPE; clean_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT turismo_is_super_admin() THEN RAISE EXCEPTION 'Solo Super Admin puede crear roles'; END IF;
  clean_code=trim(both '_' from trim(regexp_replace(lower(p_code),'[^a-z0-9]+','_','g')));
  IF clean_code='' THEN RAISE EXCEPTION 'Código de rol inválido'; END IF;
  IF EXISTS(SELECT 1 FROM turismo_roles WHERE code=clean_code) THEN RAISE EXCEPTION 'El código de rol ya existe'; END IF;
  INSERT INTO turismo_roles(code,name,description,badge_color,folder_name,is_active,is_protected,is_system) VALUES(clean_code,trim(p_name),NULLIF(trim(p_description),''),COALESCE(NULLIF(p_badge_color,''),'bg-slate-500/10 text-slate-300 border-slate-500/20'),COALESCE(NULLIF(p_folder_name,''),clean_code),TRUE,FALSE,FALSE) RETURNING * INTO role_row;
  RETURN role_row;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_set_role_status(p_role_code TEXT,p_is_active BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT turismo_is_super_admin() THEN RAISE EXCEPTION 'Solo Super Admin puede activar roles'; END IF;
  IF p_role_code='super_admin' AND NOT p_is_active THEN RAISE EXCEPTION 'Super Admin no puede desactivarse'; END IF;
  UPDATE turismo_roles SET is_active=p_is_active,updated_at=NOW() WHERE code=p_role_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rol no encontrado'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_update_own_profile(p_full_name TEXT,p_phone TEXT,p_document_type TEXT,p_document_number TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'La cuenta está inactiva';
  END IF;
  UPDATE turismo_profiles SET full_name=p_full_name,phone=p_phone,document_type=CASE WHEN p_document_type IS NULL OR p_document_type='' THEN NULL ELSE p_document_type::turismo_document_type_enum END,document_number=p_document_number,updated_at=NOW() WHERE id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_update_own_provider_profile(p_ruc TEXT,p_razon_social TEXT,p_nombre_comercial TEXT,p_sub_type TEXT,p_org_role TEXT,p_rnt_number TEXT,p_address TEXT,p_latitude DOUBLE PRECISION,p_longitude DOUBLE PRECISION,p_website_url TEXT,p_social_links JSONB,p_specific_metadata JSONB) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'La cuenta está inactiva';
  END IF;
  IF NOT turismo_current_user_has_role('prestador_turistico') THEN RAISE EXCEPTION 'El usuario no tiene rol de Prestador Turístico'; END IF;
  INSERT INTO turismo_provider_profiles(profile_id,ruc,razon_social,nombre_comercial,sub_type,org_role,rnt_number,address,latitude,longitude,website_url,social_links,specific_metadata)
  VALUES(auth.uid(),COALESCE(NULLIF(p_ruc,''),'NIT pendiente'),COALESCE(NULLIF(p_razon_social,''),'Prestador turístico'),p_nombre_comercial,CASE WHEN p_sub_type IS NULL OR p_sub_type='' THEN NULL ELSE p_sub_type::turismo_provider_sub_type_enum END,CASE WHEN p_org_role IS NULL OR p_org_role='' THEN 'dueno'::turismo_provider_org_role_enum ELSE p_org_role::turismo_provider_org_role_enum END,p_rnt_number,p_address,p_latitude,p_longitude,p_website_url,COALESCE(p_social_links,'{}'),COALESCE(p_specific_metadata,'{}'))
  ON CONFLICT(profile_id) DO UPDATE SET ruc=EXCLUDED.ruc,razon_social=EXCLUDED.razon_social,nombre_comercial=EXCLUDED.nombre_comercial,sub_type=EXCLUDED.sub_type,org_role=EXCLUDED.org_role,rnt_number=EXCLUDED.rnt_number,address=EXCLUDED.address,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,website_url=EXCLUDED.website_url,social_links=EXCLUDED.social_links,specific_metadata=EXCLUDED.specific_metadata,updated_at=NOW();
END; $$;

CREATE OR REPLACE FUNCTION public.turismo_update_own_affiliate_preferences(p_payout_method TEXT,p_payout_account_info JSONB) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticación requerida';
  END IF;
  IF NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'La cuenta está inactiva';
  END IF;
  IF NOT (turismo_current_user_has_role('embajador') OR turismo_current_user_has_role('afiliado')) THEN RAISE EXCEPTION 'El usuario no tiene rol de Embajador o Afiliado'; END IF;
  IF p_payout_method IS NOT NULL AND p_payout_method NOT IN ('nequi','daviplata','transferencia','yape','plin','cci') THEN RAISE EXCEPTION 'Método de pago inválido'; END IF;
  UPDATE turismo_affiliate_profiles SET payout_method=p_payout_method,payout_account_info=COALESCE(p_payout_account_info,payout_account_info),updated_at=NOW() WHERE profile_id=auth.uid();
END; $$;



ALTER TABLE public.turismo_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own_or_manage ON turismo_profiles FOR SELECT USING(auth.uid()=id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_select_authenticated ON turismo_roles FOR SELECT USING(auth.role()='authenticated' AND public.turismo_current_user_is_active());
ALTER TABLE public.turismo_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY permissions_select_authenticated ON turismo_permissions FOR SELECT USING(auth.role()='authenticated' AND public.turismo_current_user_is_active());
ALTER TABLE public.turismo_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_select_authenticated ON turismo_role_permissions FOR SELECT USING(auth.role()='authenticated' AND public.turismo_current_user_is_active());
ALTER TABLE public.turismo_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_select_own_or_manage ON turismo_user_roles FOR SELECT USING(auth.uid()=user_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_tourist_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tourist_read_own_or_manage ON turismo_tourist_profiles FOR SELECT USING(auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
CREATE POLICY tourist_insert_own ON turismo_tourist_profiles FOR INSERT WITH CHECK(auth.uid()=profile_id);
CREATE POLICY tourist_update_own ON turismo_tourist_profiles FOR UPDATE USING(auth.uid()=profile_id) WITH CHECK(auth.uid()=profile_id);
ALTER TABLE public.turismo_provider_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS provider_read_own_verified_or_manage ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS turismo_provider_public_verified ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS turismo_provider_owner_or_admin ON public.turismo_provider_profiles;
CREATE POLICY turismo_provider_public_verified ON public.turismo_provider_profiles FOR SELECT TO anon, authenticated USING(rnt_status='verificado');
CREATE POLICY turismo_provider_owner_or_admin ON public.turismo_provider_profiles FOR SELECT TO authenticated USING(auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_affiliate_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY affiliate_read_own_or_manage ON turismo_affiliate_profiles FOR SELECT USING(auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_regulatory_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY regulatory_read_own_or_super ON turismo_regulatory_profiles FOR SELECT USING(auth.uid()=profile_id OR turismo_is_super_admin());
ALTER TABLE public.turismo_moderator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY moderator_read_own_or_manage ON turismo_moderator_profiles FOR SELECT USING(auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_auditor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY auditor_read_own_or_super ON turismo_auditor_profiles FOR SELECT USING(auth.uid()=profile_id OR turismo_is_super_admin());
ALTER TABLE public.turismo_support_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_read_own_or_manage ON turismo_support_profiles FOR SELECT USING(auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_analyst_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY analyst_read_own_or_manage ON turismo_analyst_profiles FOR SELECT USING(auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_devops_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY devops_read_own_or_super ON turismo_devops_profiles FOR SELECT USING(auth.uid()=profile_id OR turismo_is_super_admin());
ALTER TABLE public.turismo_ai_service_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_service_read_super ON turismo_ai_service_profiles FOR SELECT USING(turismo_is_super_admin());
ALTER TABLE public.turismo_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_read_authorized ON turismo_audit_logs FOR SELECT USING(turismo_current_user_has_permission('audit:logs_read') OR turismo_is_super_admin());

CREATE OR REPLACE FUNCTION public.turismo_target_user_has_protected_role(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id=ur.role_id
    WHERE ur.user_id=p_user_id AND ur.is_active=TRUE AND r.is_active=TRUE AND r.is_protected=TRUE
  );
$$;

DROP POLICY IF EXISTS profiles_select_own_or_manage ON public.turismo_profiles;
CREATE POLICY profiles_select_own_or_manage ON public.turismo_profiles FOR SELECT USING(auth.uid()=id OR turismo_is_super_admin() OR (turismo_current_user_has_permission('users:manage') AND NOT turismo_target_user_has_protected_role(id)));
DROP POLICY IF EXISTS user_roles_select_own_or_manage ON public.turismo_user_roles;
CREATE POLICY user_roles_select_own_or_manage ON public.turismo_user_roles FOR SELECT USING(auth.uid()=user_id OR turismo_is_super_admin() OR (turismo_current_user_has_permission('users:manage') AND NOT turismo_target_user_has_protected_role(user_id)));

REVOKE EXECUTE ON FUNCTION public.turismo_handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.turismo_handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_current_user_is_active() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_current_user_is_active() FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_current_user_is_active() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_current_user_has_role(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_current_user_has_role(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_current_user_has_role(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_current_user_has_permission(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_current_user_has_permission(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_current_user_has_permission(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_is_super_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_is_super_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_is_super_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_target_user_has_protected_role(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_target_user_has_protected_role(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_target_user_has_protected_role(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_assign_user_role(UUID,TEXT,BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_assign_user_role(UUID,TEXT,BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_assign_user_role(UUID,TEXT,BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_revoke_user_role(UUID,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_revoke_user_role(UUID,TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_revoke_user_role(UUID,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_set_primary_user_role(UUID,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_set_primary_user_role(UUID,TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_set_primary_user_role(UUID,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_set_role_permissions(TEXT,TEXT[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_set_role_permissions(TEXT,TEXT[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_set_role_permissions(TEXT,TEXT[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_set_user_status(UUID,BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_set_user_status(UUID,BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_set_user_status(UUID,BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_create_role(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_create_role(TEXT,TEXT,TEXT,TEXT,TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_create_role(TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_set_role_status(TEXT,BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_set_role_status(TEXT,BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_set_role_status(TEXT,BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_update_own_profile(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_update_own_profile(TEXT,TEXT,TEXT,TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_update_own_profile(TEXT,TEXT,TEXT,TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_update_own_provider_profile(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,JSONB,JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_update_own_provider_profile(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,JSONB,JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_update_own_provider_profile(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,JSONB,JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.turismo_update_own_affiliate_preferences(TEXT,JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.turismo_update_own_affiliate_preferences(TEXT,JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.turismo_update_own_affiliate_preferences(TEXT,JSONB) TO authenticated;

-- Marketplace core (kept in the same fresh-schema execution path as the RBAC schema).
-- Turismo Cajamarca: marketplace core.
-- Run after 08_refactor_rbac_multi_role.sql. The script is idempotent.

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


-- Platform operations, compliance, growth and BI (fresh-install equivalent of migration 10).
-- Turismo Cajamarca: operaciones de plataforma, cumplimiento, crecimiento y BI.
-- Ejecutar después de 08_refactor_rbac_multi_role.sql y 09_core_tourism_marketplace.sql.

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
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_role('turista')) THEN RAISE EXCEPTION 'Solo un turista activo puede actualizar sus preferencias'; END IF;
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
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_role('turista')) THEN RAISE EXCEPTION 'Solo un turista activo puede guardar itinerarios'; END IF;
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
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() OR NOT (public.turismo_current_user_has_role('turista')) THEN RAISE EXCEPTION 'Solo un turista activo puede eliminar itinerarios'; END IF;
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
  ('maintenance_mode', 'false'::jsonb, 'system', 'Deshabilita operaciones nuevas durante mantenimiento.', TRUE),
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
  RETURN jsonb_build_object('database_time',NOW(),'active_users',(SELECT COUNT(*) FROM public.turismo_profiles WHERE is_active),'active_roles',(SELECT COUNT(*) FROM public.turismo_user_roles WHERE is_active),'published_catalog',(SELECT COUNT(*) FROM public.turismo_catalog_items WHERE status='published'),'open_support_tickets',(SELECT COUNT(*) FROM public.turismo_support_tickets WHERE status IN ('open','in_progress','waiting_user')),'pending_catalog_moderation',(SELECT COUNT(*) FROM public.turismo_catalog_items WHERE status='pending_review'),'pending_reviews',(SELECT COUNT(*) FROM public.turismo_reviews WHERE status='pending'),'pending_deletion_requests',(SELECT COUNT(*) FROM public.turismo_account_deletion_requests WHERE status='pending'),'latest_audit_event_at',(SELECT MAX(created_at) FROM public.turismo_audit_logs),'notification_count_24h',(SELECT COUNT(*) FROM public.turismo_notifications WHERE created_at >= NOW()-INTERVAL '24 hours'),'schema_version',(SELECT COALESCE(MAX(version),0) FROM public.turismo_schema_version));
END; $$;
REVOKE ALL ON FUNCTION public.turismo_get_system_health() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.turismo_get_system_health() TO authenticated;

REVOKE ALL ON FUNCTION public.turismo_create_catalog_item(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB,UUID), public.turismo_update_catalog_item(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB,UUID), public.turismo_submit_catalog_item(UUID,UUID), public.turismo_archive_catalog_item(UUID,UUID), public.turismo_set_catalog_availability(UUID,DATE,DATE,BOOLEAN,INTEGER,NUMERIC,TEXT,UUID), public.turismo_clear_catalog_availability(UUID,DATE,DATE,UUID), public.turismo_create_promotion(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ,UUID), public.turismo_update_promotion(UUID,UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ,UUID), public.turismo_deactivate_promotion(UUID,UUID), public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT,TEXT,TEXT), public.turismo_provider_update_reservation(UUID,TEXT,NUMERIC,TEXT,UUID), public.turismo_respond_to_review(UUID,TEXT,UUID), public.turismo_create_support_ticket(TEXT,TEXT,TEXT,TEXT,UUID,UUID,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_create_catalog_item(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB,UUID), public.turismo_update_catalog_item(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT,TEXT,BOOLEAN,JSONB,UUID), public.turismo_submit_catalog_item(UUID,UUID), public.turismo_archive_catalog_item(UUID,UUID), public.turismo_set_catalog_availability(UUID,DATE,DATE,BOOLEAN,INTEGER,NUMERIC,TEXT,UUID), public.turismo_clear_catalog_availability(UUID,DATE,DATE,UUID), public.turismo_create_promotion(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ,UUID), public.turismo_update_promotion(UUID,UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TIMESTAMPTZ,TIMESTAMPTZ,UUID), public.turismo_deactivate_promotion(UUID,UUID), public.turismo_create_reservation(UUID,DATE,DATE,INTEGER,TEXT,TEXT,TEXT), public.turismo_provider_update_reservation(UUID,TEXT,NUMERIC,TEXT,UUID), public.turismo_respond_to_review(UUID,TEXT,UUID), public.turismo_create_support_ticket(TEXT,TEXT,TEXT,TEXT,UUID,UUID,UUID) TO authenticated;

UPDATE public.turismo_platform_settings SET is_public = TRUE WHERE key = 'maintenance_mode';

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

ALTER TABLE public.turismo_provider_profiles ALTER COLUMN ruc DROP NOT NULL;
ALTER TABLE public.turismo_provider_profiles ALTER COLUMN razon_social DROP NOT NULL;
ALTER TABLE public.turismo_regulatory_profiles ALTER COLUMN entity_type DROP NOT NULL;
ALTER TABLE public.turismo_regulatory_profiles ALTER COLUMN institutional_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.turismo_initialize_user_role_extension(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_role_code = 'turista' THEN
    INSERT INTO public.turismo_tourist_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'prestador_turistico' THEN
    INSERT INTO public.turismo_provider_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'moderador' THEN
    INSERT INTO public.turismo_moderator_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'auditor' THEN
    INSERT INTO public.turismo_auditor_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'soporte' THEN
    INSERT INTO public.turismo_support_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'analista_datos' THEN
    INSERT INTO public.turismo_analyst_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code = 'desarrollador' THEN
    INSERT INTO public.turismo_devops_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code IN ('funcionario_mincit', 'camara_comercio') THEN
    INSERT INTO public.turismo_regulatory_profiles(profile_id)
    VALUES (p_user_id)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF p_role_code IN ('embajador', 'afiliado') THEN
    INSERT INTO public.turismo_affiliate_profiles(profile_id, referral_code)
    VALUES (p_user_id, 'CAJ-' || upper(substr(replace(p_user_id::TEXT, '-', ''), 1, 12)))
    ON CONFLICT (profile_id) DO NOTHING;
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

CREATE OR REPLACE FUNCTION public.turismo_assign_user_role(p_user_id UUID, p_role_code TEXT, p_make_primary BOOLEAN DEFAULT FALSE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_role public.turismo_roles%ROWTYPE;
  has_primary_human BOOLEAN;
  has_devops BOOLEAN;
  caller_is_super BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar usuarios';
  END IF;

  SELECT * INTO target_role
  FROM public.turismo_roles
  WHERE code = p_role_code
    AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El rol no existe o está inactivo';
  END IF;
  IF target_role.is_system THEN
    RAISE EXCEPTION 'Los roles de sistema no se asignan a personas';
  END IF;
  IF p_role_code = 'usuario' THEN RAISE EXCEPTION 'El rol Usuario es legado y no admite nuevas asignaciones'; END IF;

  caller_is_super := public.turismo_is_super_admin();
  IF target_role.is_protected AND NOT caller_is_super THEN
    RAISE EXCEPTION 'Solo Super Admin puede gestionar roles protegidos';
  END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_protected
  ) THEN
    RAISE EXCEPTION 'El usuario tiene un rol protegido';
  END IF;

  IF p_role_code IN ('funcionario_mincit', 'camara_comercio')
     AND EXISTS (
       SELECT 1
       FROM public.turismo_user_roles ur
       JOIN public.turismo_roles r ON r.id = ur.role_id
       WHERE ur.user_id = p_user_id
         AND ur.is_active
         AND r.is_active
         AND r.is_system = FALSE
         AND r.code = CASE p_role_code
           WHEN 'funcionario_mincit' THEN 'camara_comercio'
           ELSE 'funcionario_mincit'
         END
     ) THEN
    RAISE EXCEPTION 'Los roles MinCIT/FONTUR y Cámara de Comercio son mutuamente excluyentes';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_active
      AND r.is_system = FALSE
      AND r.code = 'desarrollador'
  ) INTO has_devops;

  IF p_role_code = 'desarrollador' AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_active
      AND r.is_system = FALSE
      AND r.code <> 'desarrollador'
  ) THEN
    RAISE EXCEPTION 'DevOps debe permanecer aislado de los roles de negocio';
  END IF;
  IF has_devops AND p_role_code <> 'desarrollador' THEN
    RAISE EXCEPTION 'DevOps no puede coexistir con roles de negocio';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND ur.is_primary
      AND r.is_active
      AND r.is_system = FALSE
  ) INTO has_primary_human;

  IF p_make_primary OR NOT has_primary_human THEN
    UPDATE public.turismo_user_roles
    SET is_primary = FALSE
    WHERE user_id = p_user_id
      AND is_active;
  END IF;

  INSERT INTO public.turismo_user_roles(user_id, role_id, is_active, is_primary, assigned_by)
  VALUES (p_user_id, target_role.id, TRUE, (p_make_primary OR NOT has_primary_human), auth.uid())
  ON CONFLICT (user_id, role_id) DO UPDATE SET
    is_active = TRUE,
    is_primary = CASE
      WHEN p_make_primary OR NOT has_primary_human THEN TRUE
      ELSE public.turismo_user_roles.is_primary
    END,
    assigned_by = auth.uid(),
    assigned_at = NOW();

  PERFORM public.turismo_initialize_user_role_extension(p_user_id, target_role.code);
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_role_assigned', p_user_id::TEXT,
    jsonb_build_object('role_code', target_role.code, 'make_primary', p_make_primary));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_revoke_user_role(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_id UUID;
  was_primary BOOLEAN;
  remaining INTEGER;
  caller_is_super BOOLEAN;
  target_protected BOOLEAN;
  target_system BOOLEAN;
  fallback_role_id UUID;
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
  WHERE ur.user_id = p_user_id
    AND r.code = p_role_code
    AND ur.is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El rol no está asignado';
  END IF;

  caller_is_super := public.turismo_is_super_admin();
  IF (target_protected OR target_system) AND NOT caller_is_super THEN
    RAISE EXCEPTION 'Solo Super Admin puede gestionar roles protegidos o del sistema';
  END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_protected
  ) THEN
    RAISE EXCEPTION 'El usuario tiene un rol protegido';
  END IF;

  SELECT COUNT(*) INTO remaining
  FROM public.turismo_user_roles
  WHERE user_id = p_user_id
    AND is_active;


  IF was_primary OR NOT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND ur.is_primary
      AND r.is_active
      AND r.is_system = FALSE
  ) THEN
    SELECT ur.role_id INTO fallback_role_id
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND ur.role_id <> target_id
      AND r.is_active
      AND r.is_system = FALSE
    ORDER BY CASE WHEN r.code = 'turista' THEN 0 ELSE 1 END, ur.assigned_at ASC, ur.role_id
    LIMIT 1;
    IF fallback_role_id IS NULL AND NOT target_system THEN
      RAISE EXCEPTION 'No existe un rol humano activo utilizable para el rol principal';
    END IF;
  END IF;

  UPDATE public.turismo_user_roles
  SET is_active = FALSE, is_primary = FALSE
  WHERE user_id = p_user_id
    AND role_id = target_id;

  IF was_primary OR NOT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND ur.is_primary
      AND r.is_active
      AND r.is_system = FALSE
  ) THEN
    UPDATE public.turismo_user_roles
    SET is_primary = FALSE
    WHERE user_id = p_user_id
      AND is_active;
    IF fallback_role_id IS NOT NULL THEN
      UPDATE public.turismo_user_roles
      SET is_primary = TRUE
      WHERE user_id = p_user_id
        AND role_id = fallback_role_id
        AND is_active;
    END IF;
  END IF;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_role_revoked', p_user_id::TEXT,
    jsonb_build_object('role_code', p_role_code, 'was_primary', was_primary));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_primary_user_role(p_user_id UUID, p_role_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_role_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('users:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el rol principal';
  END IF;
  IF NOT public.turismo_is_super_admin() AND EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active
      AND r.is_protected
  ) THEN
    RAISE EXCEPTION 'El usuario tiene un rol protegido';
  END IF;

  SELECT r.id INTO target_role_id
  FROM public.turismo_user_roles ur
  JOIN public.turismo_roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = TRUE
    AND r.is_active = TRUE
    AND r.is_system = FALSE
    AND r.code = p_role_code;
  IF target_role_id IS NULL THEN
    RAISE EXCEPTION 'El rol no está asignado activamente o es un rol de sistema';
  END IF;

  UPDATE public.turismo_user_roles
  SET is_primary = FALSE
  WHERE user_id = p_user_id
    AND is_active;
  UPDATE public.turismo_user_roles
  SET is_primary = TRUE
  WHERE user_id = p_user_id
    AND role_id = target_role_id
    AND is_active;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'user_primary_role_changed', p_user_id::TEXT,
    jsonb_build_object('role_code', p_role_code));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_set_role_permissions(p_role_code TEXT, p_permission_codes TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  role_row public.turismo_roles%ROWTYPE;
  caller_is_super BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_permission('roles:manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar permisos';
  END IF;
  SELECT * INTO role_row FROM public.turismo_roles WHERE code = p_role_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rol no encontrado';
  END IF;
  IF p_role_code = 'usuario' THEN
    RAISE EXCEPTION 'El rol Usuario es legado y no admite permisos operativos';
  END IF;
  IF role_row.is_system THEN
    RAISE EXCEPTION 'Rol de sistema';
  END IF;
  caller_is_super := public.turismo_is_super_admin();
  IF role_row.is_protected AND NOT caller_is_super THEN
    RAISE EXCEPTION 'Rol protegido';
  END IF;
  IF p_role_code = 'super_admin' THEN
    RAISE EXCEPTION 'Los permisos de Super Admin son inmutables';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code) WHERE x.code = '*'
  ) THEN
    RAISE EXCEPTION 'El permiso * está reservado para super_admin';
  END IF;
  IF NOT caller_is_super AND EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code)
    WHERE x.code NOT IN ('platform:read','content:moderate','content:approve','content:reject','provider:catalog_manage','provider:offers_manage','provider:bookings_view','provider:finances_view','tourist:book','tourist:review','tourist:profile','support:tickets_manage','support:refund_issue','bi:analytics_read','bi:reports_export','ambassador:referral_manage','ambassador:commissions_view')
  ) THEN
    RAISE EXCEPTION 'El permiso no está permitido para un administrador';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_permission_codes, ARRAY[]::TEXT[])) x(code)
    WHERE NOT EXISTS (SELECT 1 FROM public.turismo_permissions p WHERE p.code = x.code)
  ) THEN
    RAISE EXCEPTION 'Permiso inexistente';
  END IF;

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

CREATE OR REPLACE FUNCTION public.turismo_set_role_status(p_role_code TEXT, p_is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_role_id UUID;
  target_user_id UUID;
  fallback_role_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_is_super_admin() THEN
    RAISE EXCEPTION 'Solo Super Admin puede activar roles';
  END IF;
  SELECT id INTO target_role_id FROM public.turismo_roles WHERE code = p_role_code;
  IF target_role_id IS NULL THEN
    RAISE EXCEPTION 'Rol no encontrado';
  END IF;

  IF p_role_code = 'super_admin' AND NOT p_is_active THEN
    RAISE EXCEPTION 'Super Admin no puede desactivarse';
  END IF;

  UPDATE public.turismo_roles
  SET is_active = p_is_active, updated_at = NOW()
  WHERE id = target_role_id;

  IF NOT p_is_active THEN
    FOR target_user_id IN
      SELECT DISTINCT ur.user_id
      FROM public.turismo_user_roles ur
      WHERE ur.role_id = target_role_id
        AND ur.is_active
        AND ur.is_primary
    LOOP
      UPDATE public.turismo_user_roles
      SET is_primary = FALSE
      WHERE user_id = target_user_id
        AND is_active;

      SELECT ur.role_id INTO fallback_role_id
      FROM public.turismo_user_roles ur
      JOIN public.turismo_roles r ON r.id = ur.role_id
      WHERE ur.user_id = target_user_id
        AND ur.is_active
        AND r.is_active
        AND r.is_system = FALSE
      ORDER BY CASE WHEN r.code = 'turista' THEN 0 ELSE 1 END, ur.assigned_at ASC, ur.role_id
      LIMIT 1;

      IF fallback_role_id IS NOT NULL THEN
        UPDATE public.turismo_user_roles
        SET is_primary = TRUE
        WHERE user_id = target_user_id
          AND role_id = fallback_role_id
          AND is_active;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details)
  VALUES (auth.uid(), 'role_status_changed', p_role_code,
    jsonb_build_object('role_code', p_role_code, 'is_active', p_is_active));
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_own_provider_profile(
  p_ruc TEXT, p_razon_social TEXT, p_nombre_comercial TEXT, p_sub_type TEXT, p_org_role TEXT,
  p_rnt_number TEXT, p_address TEXT, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION,
  p_website_url TEXT, p_social_links JSONB, p_specific_metadata JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active() THEN
    RAISE EXCEPTION 'Autenticación requerida o cuenta inactiva';
  END IF;
  IF NOT public.turismo_current_user_has_role('prestador_turistico') THEN
    RAISE EXCEPTION 'El usuario no tiene rol de Prestador Turístico';
  END IF;
  INSERT INTO public.turismo_provider_profiles(profile_id, ruc, razon_social, nombre_comercial, sub_type, org_role, rnt_number, address, latitude, longitude, website_url, social_links, specific_metadata)
  VALUES (
    auth.uid(), NULLIF(TRIM(p_ruc), ''), NULLIF(TRIM(p_razon_social), ''), NULLIF(TRIM(p_nombre_comercial), ''),
    CASE WHEN p_sub_type IS NULL OR p_sub_type = '' THEN NULL ELSE p_sub_type::public.turismo_provider_sub_type_enum END,
    CASE WHEN p_org_role IS NULL OR p_org_role = '' THEN 'dueno'::public.turismo_provider_org_role_enum ELSE p_org_role::public.turismo_provider_org_role_enum END,
    NULLIF(TRIM(p_rnt_number), ''), NULLIF(TRIM(p_address), ''), p_latitude, p_longitude, NULLIF(TRIM(p_website_url), ''), COALESCE(p_social_links, '{}'), COALESCE(p_specific_metadata, '{}')
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    ruc = COALESCE(EXCLUDED.ruc, public.turismo_provider_profiles.ruc),
    razon_social = COALESCE(EXCLUDED.razon_social, public.turismo_provider_profiles.razon_social),
    nombre_comercial = EXCLUDED.nombre_comercial,
    sub_type = EXCLUDED.sub_type,
    org_role = EXCLUDED.org_role,
    rnt_number = EXCLUDED.rnt_number,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    website_url = EXCLUDED.website_url,
    social_links = EXCLUDED.social_links,
    specific_metadata = EXCLUDED.specific_metadata,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_update_tourist_preferences(p_preferences TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cleaned TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista') THEN
    RAISE EXCEPTION 'Solo un turista activo puede actualizar sus preferencias';
  END IF;
  IF COALESCE(array_length(p_preferences, 1), 0) > 9 THEN
    RAISE EXCEPTION 'Puedes seleccionar máximo 9 intereses';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_preferences, ARRAY[]::TEXT[])) value
    WHERE LOWER(TRIM(value)) NOT IN ('naturaleza','aventura','gastronomia','cultura','descanso','familia','artesania','eventos','alojamiento')
  ) THEN
    RAISE EXCEPTION 'Una preferencia no pertenece al vocabulario permitido';
  END IF;
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::TEXT[]) INTO cleaned
  FROM (
    SELECT DISTINCT LOWER(TRIM(value)) AS value
    FROM unnest(COALESCE(p_preferences, ARRAY[]::TEXT[])) value
    WHERE NULLIF(TRIM(value), '') IS NOT NULL
  ) values_table;
  UPDATE public.turismo_tourist_profiles
  SET travel_preferences = cleaned, updated_at = NOW()
  WHERE profile_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO public.turismo_tourist_profiles(profile_id, travel_preferences)
    VALUES (auth.uid(), cleaned);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_save_itinerary(
  p_name TEXT, p_days INTEGER, p_interests TEXT[], p_budget_level TEXT, p_items JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  itinerary_id UUID;
  item_record RECORD;
  clean_interests TEXT[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista') THEN
    RAISE EXCEPTION 'Solo un turista activo puede guardar itinerarios';
  END IF;
  IF NULLIF(TRIM(p_name), '') IS NULL THEN RAISE EXCEPTION 'El nombre del itinerario es obligatorio'; END IF;
  IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'El itinerario debe tener entre 1 y 7 días'; END IF;
  IF p_budget_level NOT IN ('economico','moderado','premium','flexible') THEN RAISE EXCEPTION 'Presupuesto inválido'; END IF;
  IF COALESCE(array_length(p_interests, 1), 0) > 9 THEN RAISE EXCEPTION 'Puedes seleccionar máximo 9 intereses'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_interests, ARRAY[]::TEXT[])) value WHERE LOWER(TRIM(value)) NOT IN ('naturaleza','aventura','gastronomia','cultura','descanso','familia','artesania','eventos','alojamiento')) THEN RAISE EXCEPTION 'Un interés no es válido'; END IF;
  SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::TEXT[]) INTO clean_interests
  FROM (SELECT DISTINCT LOWER(TRIM(value)) value FROM unnest(COALESCE(p_interests, ARRAY[]::TEXT[])) value WHERE NULLIF(TRIM(value),'') IS NOT NULL) values_table;
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
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT public.turismo_current_user_has_role('turista') THEN
    RAISE EXCEPTION 'Solo un turista activo puede eliminar itinerarios';
  END IF;
  DELETE FROM public.turismo_itineraries
  WHERE id = p_itinerary_id
    AND tourist_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Itinerario no encontrado o no te pertenece'; END IF;
  INSERT INTO public.turismo_audit_logs(actor_id, action, entity_target, details) VALUES (auth.uid(), 'itinerary_deleted', p_itinerary_id::TEXT, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.turismo_get_system_health()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.turismo_current_user_is_active()
     OR NOT (public.turismo_current_user_has_permission('devops:infra_manage') OR public.turismo_is_super_admin()) THEN
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
    'schema_version', (SELECT COALESCE(MAX(version), 0) FROM public.turismo_schema_version)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.turismo_initialize_user_role_extension(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.turismo_handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.turismo_assign_user_role(UUID, TEXT, BOOLEAN), public.turismo_revoke_user_role(UUID, TEXT), public.turismo_set_primary_user_role(UUID, TEXT), public.turismo_set_role_permissions(TEXT, TEXT[]), public.turismo_set_role_status(TEXT, BOOLEAN), public.turismo_update_own_provider_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, JSONB, JSONB), public.turismo_update_tourist_preferences(TEXT[]), public.turismo_save_itinerary(TEXT, INTEGER, TEXT[], TEXT, JSONB), public.turismo_delete_itinerary(UUID), public.turismo_get_system_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.turismo_assign_user_role(UUID, TEXT, BOOLEAN), public.turismo_revoke_user_role(UUID, TEXT), public.turismo_set_primary_user_role(UUID, TEXT), public.turismo_set_role_permissions(TEXT, TEXT[]), public.turismo_set_role_status(TEXT, BOOLEAN), public.turismo_update_own_provider_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, JSONB, JSONB), public.turismo_update_tourist_preferences(TEXT[]), public.turismo_save_itinerary(TEXT, INTEGER, TEXT[], TEXT, JSONB), public.turismo_delete_itinerary(UUID), public.turismo_get_system_health() TO authenticated;

INSERT INTO public.turismo_schema_version(version, migration_name)
VALUES (14, '14_default_user_role_and_role_switching.sql'),
       (15, '15_final_account_rbac_hardening.sql')
ON CONFLICT (version) DO UPDATE SET migration_name = EXCLUDED.migration_name;







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
