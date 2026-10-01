-- Turismo Cajamarca: estabilización RBAC multi-rol.
-- Ejecutar en una base que ya tiene los scripts 01-07.
BEGIN;

ALTER TABLE public.turismo_roles ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.turismo_roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO public.turismo_roles (code, name, description, badge_color, folder_name, is_protected, is_system)
VALUES
  ('usuario','Usuario General','Usuario base de la plataforma. Puede acceder a su cuenta y recibir roles adicionales.','bg-slate-500/10 text-slate-300 border-slate-500/20','usuario',false,false),
 ('turista','Turista','Viajeros y consumidores finales de experiencias turísticas.','bg-blue-500/10 text-blue-400 border-blue-500/20','turista',false,false),
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
 ('camara_comercio','Cámara de Comercio','Validación y formalización empresarial.','bg-lime-500/10 text-lime-400 border-lime-500/20','camara_comercio',true,false)
ON CONFLICT (code) DO UPDATE SET is_protected = EXCLUDED.is_protected, is_system = EXCLUDED.is_system;

CREATE TABLE IF NOT EXISTS public.turismo_permissions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.turismo_role_permissions (
  role_id UUID NOT NULL REFERENCES public.turismo_roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.turismo_permissions(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_code)
);
CREATE TABLE IF NOT EXISTS public.turismo_user_roles (
  user_id UUID NOT NULL REFERENCES public.turismo_profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.turismo_roles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by UUID REFERENCES public.turismo_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS turismo_one_primary_role_per_user
  ON public.turismo_user_roles(user_id) WHERE is_primary = TRUE AND is_active = TRUE;

INSERT INTO public.turismo_permissions (code,name,description,module) VALUES
 ('*','Acceso global','Acceso global de Super Administrador.','platform'),
 ('platform:read','Consultar plataforma','Consultar configuración y estado de la plataforma.','platform'),
 ('platform:write','Operar plataforma','Ejecutar operaciones de plataforma.','platform'),
 ('platform:config','Configurar plataforma','Modificar configuración de plataforma.','platform'),
 ('users:manage','Gestionar usuarios','Administrar estado y roles de usuarios.','users'),
 ('roles:manage','Gestionar permisos','Administrar permisos heredados por los roles.','roles'),
 ('content:moderate','Moderar contenido','Revisar contenido reportado.','content'),
 ('content:approve','Aprobar contenido','Aprobar contenido turístico.','content'),
 ('content:reject','Rechazar contenido','Rechazar contenido turístico.','content'),
 ('provider:catalog_manage','Gestionar catálogo','Administrar información del catálogo.','provider'),
 ('provider:offers_manage','Gestionar ofertas','Administrar ofertas del prestador.','provider'),
 ('provider:bookings_view','Consultar reservas','Consultar reservas del prestador.','provider'),
 ('provider:finances_view','Consultar finanzas','Consultar información financiera.','provider'),
 ('tourist:book','Reservar experiencias','Crear reservas turísticas.','tourist'),
 ('tourist:review','Publicar reseñas','Publicar reseñas turísticas.','tourist'),
 ('tourist:profile','Gestionar perfil','Gestionar datos personales turísticos.','tourist'),
 ('audit:logs_read','Leer auditoría','Consultar bitácoras de auditoría.','audit'),
 ('audit:blockchain_read','Leer integridad','Consultar evidencias de integridad.','audit'),
 ('support:tickets_manage','Gestionar soporte','Atender solicitudes de soporte.','support'),
 ('support:refund_issue','Emitir reembolsos','Emitir reembolsos autorizados.','support'),
 ('bi:analytics_read','Leer analítica','Consultar analítica agregada.','bi'),
 ('bi:reports_export','Exportar informes','Exportar informes de negocio.','bi'),
 ('ai:recommendations_read','Consultar recomendaciones','Usar recomendaciones de IA.','ai'),
 ('ai:embeddings_write','Escribir embeddings','Escribir embeddings de servicio.','ai'),
 ('devops:infra_manage','Gestionar infraestructura','Administrar infraestructura técnica.','devops'),
 ('ambassador:referral_manage','Gestionar referidos','Administrar campañas de referidos.','ambassador'),
 ('ambassador:commissions_view','Consultar comisiones','Consultar comisiones de referidos.','ambassador'),
 ('regulatory:rnt_verify','Verificar RNT','Verificar registros turísticos.','regulatory'),
 ('regulatory:compliance_report','Reportar cumplimiento','Emitir informes regulatorios.','regulatory')
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, module=EXCLUDED.module;

-- Backfill antes de retirar las columnas antiguas.
INSERT INTO public.turismo_user_roles (user_id, role_id, is_active, is_primary)
SELECT p.id, COALESCE(r.id, turista.id), TRUE, TRUE
FROM public.turismo_profiles p
LEFT JOIN public.turismo_roles r ON r.code = p.role::TEXT
JOIN public.turismo_roles turista ON turista.code = 'turista'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active=TRUE, is_primary=EXCLUDED.is_primary;

INSERT INTO public.turismo_role_permissions (role_id, permission_code)
SELECT r.id, x.permission_code
FROM (VALUES
 ('super_admin','*'),
 ('admin','platform:read'),('admin','platform:config'),('admin','users:manage'),('admin','roles:manage'),('admin','content:moderate'),('admin','content:approve'),('admin','content:reject'),('admin','support:tickets_manage'),
 ('moderador','content:moderate'),('moderador','content:approve'),('moderador','content:reject'),
 ('prestador_turistico','provider:catalog_manage'),('prestador_turistico','provider:offers_manage'),('prestador_turistico','provider:bookings_view'),('prestador_turistico','provider:finances_view'),
 ('turista','tourist:book'),('turista','tourist:review'),('turista','tourist:profile'),
 ('auditor','audit:logs_read'),('auditor','audit:blockchain_read'),('soporte','support:tickets_manage'),('soporte','support:refund_issue'),
 ('analista_datos','bi:analytics_read'),('analista_datos','bi:reports_export'),('desarrollador','devops:infra_manage'),
 ('servicios_ia','ai:recommendations_read'),('servicios_ia','ai:embeddings_write'),
 ('embajador','tourist:profile'),('embajador','tourist:book'),('embajador','tourist:review'),('embajador','ambassador:referral_manage'),('embajador','ambassador:commissions_view'),
 ('afiliado','tourist:profile'),('afiliado','tourist:book'),('afiliado','tourist:review'),('afiliado','ambassador:referral_manage'),('afiliado','ambassador:commissions_view'),
 ('funcionario_mincit','regulatory:rnt_verify'),('funcionario_mincit','regulatory:compliance_report'),('camara_comercio','regulatory:rnt_verify'),('camara_comercio','regulatory:compliance_report')
) AS x(role_code,permission_code) JOIN public.turismo_roles r ON r.code=x.role_code
ON CONFLICT DO NOTHING;

-- Existing bad wildcard grants are removed. The wildcard can exist only on super_admin.
DELETE FROM public.turismo_role_permissions rp
USING public.turismo_roles r
WHERE r.id=rp.role_id AND r.code <> 'super_admin' AND rp.permission_code='*';
DELETE FROM public.turismo_role_permissions rp
USING public.turismo_roles r
WHERE r.id=rp.role_id AND NOT r.is_protected AND NOT r.is_system
  AND rp.permission_code NOT IN ('platform:read','content:moderate','content:approve','content:reject','provider:catalog_manage','provider:offers_manage','provider:bookings_view','provider:finances_view','tourist:book','tourist:review','tourist:profile','support:tickets_manage','support:refund_issue','bi:analytics_read','bi:reports_export','ambassador:referral_manage','ambassador:commissions_view');

ALTER TABLE public.turismo_affiliate_profiles DROP CONSTRAINT IF EXISTS turismo_affiliate_profiles_payout_method_check;
ALTER TABLE public.turismo_affiliate_profiles ADD CONSTRAINT turismo_affiliate_profiles_payout_method_check
  CHECK (payout_method IN ('nequi','daviplata','transferencia','yape','plin','cci'));
ALTER TABLE public.turismo_affiliate_profiles ALTER COLUMN payout_method SET DEFAULT 'transferencia';

-- Drop only known legacy Turismo Cajamarca policies. No public-schema policy scan is used.
DROP POLICY IF EXISTS "Permitir lectura del propio perfil turismo" ON public.turismo_profiles;
DROP POLICY IF EXISTS "Permitir insercion del propio perfil turismo" ON public.turismo_profiles;
DROP POLICY IF EXISTS "Permitir edición de propio perfil turismo" ON public.turismo_profiles;
DROP POLICY IF EXISTS "Permitir a Admin y SuperAdmin leer todos los perfiles turismo" ON public.turismo_profiles;
DROP POLICY IF EXISTS "Permitir a SuperAdmin administrar perfiles turismo" ON public.turismo_profiles;
DROP POLICY IF EXISTS turismo_profiles_select_own_or_manage ON public.turismo_profiles;

DROP POLICY IF EXISTS "Turistas gestionan su propio perfil turista" ON public.turismo_tourist_profiles;
DROP POLICY IF EXISTS "Turistas leen su propio perfil turista turismo" ON public.turismo_tourist_profiles;
DROP POLICY IF EXISTS "Turistas insertan su propio perfil turista turismo" ON public.turismo_tourist_profiles;
DROP POLICY IF EXISTS "Turistas editan su propio perfil turista turismo" ON public.turismo_tourist_profiles;
DROP POLICY IF EXISTS turismo_tourist_own_read ON public.turismo_tourist_profiles;
DROP POLICY IF EXISTS turismo_tourist_own_insert ON public.turismo_tourist_profiles;
DROP POLICY IF EXISTS turismo_tourist_own_update ON public.turismo_tourist_profiles;

DROP POLICY IF EXISTS "Prestadores gestionan su propio perfil" ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS "Prestadores leen su propio perfil turismo" ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS "Prestadores editan su propio perfil turismo" ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS "Lectura pública de prestadores verificados turismo" ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS "Entidades Reguladoras leen prestadores turismo" ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS turismo_provider_own_read ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS provider_read_own_verified_or_manage ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS turismo_provider_read_own_verified_or_manage ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS turismo_provider_public_verified ON public.turismo_provider_profiles;
DROP POLICY IF EXISTS turismo_provider_owner_or_admin ON public.turismo_provider_profiles;

DROP POLICY IF EXISTS "Afiliados gestionan sus datos de comisiones" ON public.turismo_affiliate_profiles;
DROP POLICY IF EXISTS "Afiliados leen sus datos de comisiones turismo" ON public.turismo_affiliate_profiles;
DROP POLICY IF EXISTS turismo_affiliate_own_read ON public.turismo_affiliate_profiles;

DROP POLICY IF EXISTS "Reguladores gestionan sus datos de entidad" ON public.turismo_regulatory_profiles;
DROP POLICY IF EXISTS "Reguladores leen sus datos de entidad turismo" ON public.turismo_regulatory_profiles;
DROP POLICY IF EXISTS turismo_regulatory_read_own_or_super ON public.turismo_regulatory_profiles;

DROP POLICY IF EXISTS "Moderadores gestionan su perfil" ON public.turismo_moderator_profiles;
DROP POLICY IF EXISTS "Moderadores leen su propio perfil moderador" ON public.turismo_moderator_profiles;
DROP POLICY IF EXISTS "Moderadores editan su propio perfil moderador" ON public.turismo_moderator_profiles;
DROP POLICY IF EXISTS "Admins y SuperAdmins gestionan perfiles moderador" ON public.turismo_moderator_profiles;
DROP POLICY IF EXISTS turismo_moderator_read_own_or_manage ON public.turismo_moderator_profiles;

DROP POLICY IF EXISTS "Auditores gestionan su perfil" ON public.turismo_auditor_profiles;
DROP POLICY IF EXISTS "Auditores leen su propio perfil auditor" ON public.turismo_auditor_profiles;
DROP POLICY IF EXISTS "Auditores editan su propio perfil auditor" ON public.turismo_auditor_profiles;
DROP POLICY IF EXISTS "SuperAdmins gestionan perfiles auditor" ON public.turismo_auditor_profiles;
DROP POLICY IF EXISTS turismo_auditor_read_own_or_super ON public.turismo_auditor_profiles;

DROP POLICY IF EXISTS "Soporte gestiona su perfil" ON public.turismo_support_profiles;
DROP POLICY IF EXISTS "Soporte lee su propio perfil" ON public.turismo_support_profiles;
DROP POLICY IF EXISTS "Soporte edita su propio perfil" ON public.turismo_support_profiles;
DROP POLICY IF EXISTS turismo_support_read_own_or_manage ON public.turismo_support_profiles;

DROP POLICY IF EXISTS "Analistas gestionan su perfil" ON public.turismo_analyst_profiles;
DROP POLICY IF EXISTS "Analistas leen su propio perfil" ON public.turismo_analyst_profiles;
DROP POLICY IF EXISTS "Analistas editan su propio perfil" ON public.turismo_analyst_profiles;
DROP POLICY IF EXISTS turismo_analyst_read_own_or_manage ON public.turismo_analyst_profiles;

DROP POLICY IF EXISTS "DevOps gestiona su perfil" ON public.turismo_devops_profiles;
DROP POLICY IF EXISTS "DevOps leen su propio perfil" ON public.turismo_devops_profiles;
DROP POLICY IF EXISTS "DevOps editan su propio perfil" ON public.turismo_devops_profiles;
DROP POLICY IF EXISTS turismo_devops_read_own_or_super ON public.turismo_devops_profiles;

DROP POLICY IF EXISTS "Servicios IA gestionan su perfil" ON public.turismo_ai_service_profiles;
DROP POLICY IF EXISTS "Servicios IA leen su propio perfil" ON public.turismo_ai_service_profiles;
DROP POLICY IF EXISTS "Servicios IA editan su propio perfil" ON public.turismo_ai_service_profiles;
DROP POLICY IF EXISTS turismo_ai_service_read_super ON public.turismo_ai_service_profiles;

DROP POLICY IF EXISTS "Auditores y Admins leen logs de auditoria turismo" ON public.turismo_audit_logs;
DROP POLICY IF EXISTS turismo_audit_logs_read_authorized ON public.turismo_audit_logs;
DROP POLICY IF EXISTS "Lectura pública de roles activos" ON public.turismo_roles;
DROP POLICY IF EXISTS "Edición de roles por administradores" ON public.turismo_roles;
DROP POLICY IF EXISTS turismo_roles_read_authenticated ON public.turismo_roles;
DROP POLICY IF EXISTS turismo_permissions_read_authenticated ON public.turismo_permissions;
DROP POLICY IF EXISTS turismo_role_permissions_read_authenticated ON public.turismo_role_permissions;
DROP POLICY IF EXISTS turismo_user_roles_read_own_or_manage ON public.turismo_user_roles;

ALTER TABLE public.turismo_profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.turismo_profiles DROP COLUMN IF EXISTS permissions;
DROP INDEX IF EXISTS public.idx_turismo_profiles_role;

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

CREATE OR REPLACE FUNCTION public.turismo_handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE usuario_id UUID;
BEGIN
  INSERT INTO public.turismo_profiles(id,email,full_name,phone,document_type,document_number,is_active,is_verified)
  VALUES (NEW.id,NEW.email,COALESCE(NEW.raw_user_meta_data->>'full_name',NEW.raw_user_meta_data->>'name',split_part(NEW.email,'@',1)),NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'document_type')::public.turismo_document_type_enum,'DNI'),NEW.raw_user_meta_data->>'document_number',TRUE,FALSE)
  ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,full_name=COALESCE(EXCLUDED.full_name,turismo_profiles.full_name),phone=COALESCE(EXCLUDED.phone,turismo_profiles.phone);
  SELECT id INTO usuario_id FROM public.turismo_roles WHERE code='usuario' AND is_active;
  IF usuario_id IS NULL THEN RAISE EXCEPTION 'El rol base usuario no está configurado; no se puede crear la cuenta'; END IF;
  INSERT INTO public.turismo_user_roles(user_id,role_id,is_active,is_primary) VALUES (NEW.id,usuario_id,TRUE,TRUE) ON CONFLICT (user_id,role_id) DO UPDATE SET is_active=TRUE,is_primary=TRUE;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_turismo ON auth.users;
CREATE TRIGGER on_auth_user_created_turismo AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.turismo_handle_new_user();

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
  IF remaining<=1 THEN RAISE EXCEPTION 'El usuario debe conservar un rol activo'; END IF;
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

CREATE OR REPLACE FUNCTION public.turismo_target_user_has_protected_role(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.turismo_user_roles ur
    JOIN public.turismo_roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND r.is_active = TRUE
      AND r.is_protected = TRUE
  );
$$;

-- RLS: review reads are explicit; no standard Admin write policy is granted.
ALTER TABLE public.turismo_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_profiles_select_own_or_manage ON public.turismo_profiles FOR SELECT USING (auth.uid()=id OR turismo_is_super_admin() OR (turismo_current_user_has_permission('users:manage') AND NOT turismo_target_user_has_protected_role(id)));
ALTER TABLE public.turismo_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_roles_read_authenticated ON public.turismo_roles FOR SELECT USING (auth.role()='authenticated' AND public.turismo_current_user_is_active());
ALTER TABLE public.turismo_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_permissions_read_authenticated ON public.turismo_permissions FOR SELECT USING (auth.role()='authenticated' AND public.turismo_current_user_is_active());
ALTER TABLE public.turismo_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_role_permissions_read_authenticated ON public.turismo_role_permissions FOR SELECT USING (auth.role()='authenticated' AND public.turismo_current_user_is_active());
ALTER TABLE public.turismo_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_user_roles_read_own_or_manage ON public.turismo_user_roles FOR SELECT USING (auth.uid()=user_id OR turismo_is_super_admin() OR (turismo_current_user_has_permission('users:manage') AND NOT turismo_target_user_has_protected_role(user_id)));

ALTER TABLE public.turismo_tourist_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_tourist_read_own_or_manage ON public.turismo_tourist_profiles FOR SELECT USING (auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
CREATE POLICY turismo_tourist_insert_own ON public.turismo_tourist_profiles FOR INSERT WITH CHECK (auth.uid()=profile_id);
CREATE POLICY turismo_tourist_update_own ON public.turismo_tourist_profiles FOR UPDATE USING (auth.uid()=profile_id) WITH CHECK (auth.uid()=profile_id);
ALTER TABLE public.turismo_provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_provider_public_verified ON public.turismo_provider_profiles FOR SELECT TO anon, authenticated USING (rnt_status='verificado');
CREATE POLICY turismo_provider_owner_or_admin ON public.turismo_provider_profiles FOR SELECT TO authenticated USING (auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_affiliate_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_affiliate_read_own_or_manage ON public.turismo_affiliate_profiles FOR SELECT USING (auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_regulatory_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_regulatory_read_own_or_super ON public.turismo_regulatory_profiles FOR SELECT USING (auth.uid()=profile_id OR turismo_is_super_admin());
ALTER TABLE public.turismo_moderator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_moderator_read_own_or_manage ON public.turismo_moderator_profiles FOR SELECT USING (auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_auditor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_auditor_read_own_or_super ON public.turismo_auditor_profiles FOR SELECT USING (auth.uid()=profile_id OR turismo_is_super_admin());
ALTER TABLE public.turismo_support_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_support_read_own_or_manage ON public.turismo_support_profiles FOR SELECT USING (auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_analyst_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_analyst_read_own_or_manage ON public.turismo_analyst_profiles FOR SELECT USING (auth.uid()=profile_id OR turismo_current_user_has_permission('users:manage'));
ALTER TABLE public.turismo_devops_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_devops_read_own_or_super ON public.turismo_devops_profiles FOR SELECT USING (auth.uid()=profile_id OR turismo_is_super_admin());
ALTER TABLE public.turismo_ai_service_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_ai_service_read_super ON public.turismo_ai_service_profiles FOR SELECT USING (turismo_is_super_admin());
ALTER TABLE public.turismo_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY turismo_audit_logs_read_authorized ON public.turismo_audit_logs FOR SELECT USING (turismo_current_user_has_permission('audit:logs_read') OR turismo_is_super_admin());

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
COMMIT;
