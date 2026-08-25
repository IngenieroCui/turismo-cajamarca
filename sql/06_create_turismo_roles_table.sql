-- =============================================================================
-- TURISMO CAJAMARCA PWA - TABLA DE ROLES DINÁMICOS (turismo_roles)
-- Ejecuta este script en el SQL Editor de Supabase para inicializar la tabla de roles.
-- =============================================================================

BEGIN;

-- 1. CREACIÓN DE LA TABLA turismo_roles
CREATE TABLE IF NOT EXISTS public.turismo_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  badge_color TEXT DEFAULT 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  folder_name TEXT DEFAULT 'turista',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.turismo_roles ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACCESO
DROP POLICY IF EXISTS "Lectura pública de roles activos" ON public.turismo_roles;
CREATE POLICY "Lectura pública de roles activos"
  ON public.turismo_roles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Edición de roles por administradores" ON public.turismo_roles;
CREATE POLICY "Edición de roles por administradores"
  ON public.turismo_roles
  FOR ALL
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.turismo_profiles
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
      )
    )
  );

-- 4. POBLAR DATOS INICIALES (SEED ROLES ACTUALES)
INSERT INTO public.turismo_roles (code, name, description, badge_color, folder_name)
VALUES
  ('usuario', 'Usuario General', 'Rol base por defecto al registrarse en la plataforma.', 'bg-slate-500/10 text-slate-300 border-slate-500/20', 'usuario'),
  ('turista', 'Turista', 'Viajeros y consumidores finales de experiencias turísticas.', 'bg-blue-500/10 text-blue-400 border-blue-500/20', 'turista'),
  ('prestador_turistico', 'Prestador Turístico', 'Empresas, guías, hoteles y operadores de servicios turísticos.', 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', 'prestador_turistico'),
  ('admin', 'Administrador', 'Operación diaria de la plataforma y usuarios.', 'bg-purple-500/10 text-purple-400 border-purple-500/20', 'admin'),
  ('super_admin', 'Super Administrador', 'Control absoluto del sistema e infraestructura.', 'bg-red-500/10 text-red-400 border-red-500/20', 'super_admin'),
  ('moderador', 'Moderador', 'Revisión y aprobación de contenidos y opiniones.', 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', 'moderador'),
  ('auditor', 'Auditor', 'Supervisión de trazabilidad, logs e integridad legal.', 'bg-amber-500/10 text-amber-400 border-amber-500/20', 'auditor'),
  ('soporte', 'Soporte Técnico', 'Atención de incidencias y asistencia técnica.', 'bg-teal-500/10 text-teal-400 border-teal-500/20', 'soporte'),
  ('analista_datos', 'Analista de Datos', 'Inteligencia de negocios y datos agregados.', 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', 'analista_datos'),
  ('servicios_ia', 'Servicio IA / Sistema', 'Motor de recomendaciones e identidades de servicio.', 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20', 'servicios_ia'),
  ('desarrollador', 'Desarrollador / DevOps', 'Acceso técnico, despliegues e infraestructura.', 'bg-slate-600/10 text-slate-300 border-slate-600/20', 'desarrollador'),
  ('embajador', 'Embajador', 'Promotores de turismo y enlaces de afiliación.', 'bg-orange-500/10 text-orange-400 border-orange-500/20', 'embajador'),
  ('afiliado', 'Afiliado', 'Red de referidos y promociones turísticas.', 'bg-rose-500/10 text-rose-400 border-rose-500/20', 'afiliado'),
  ('funcionario_mincit', 'Funcionario MinCIT / FONTUR', 'Supervisión regulatoria y fiscalización RNT.', 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', 'funcionario_mincit'),
  ('camara_comercio', 'Cámara de Comercio', 'Validación de registro mercantil y formalización empresarial.', 'bg-lime-500/10 text-lime-400 border-lime-500/20', 'camara_comercio')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  badge_color = EXCLUDED.badge_color,
  folder_name = EXCLUDED.folder_name;

COMMIT;
