-- =============================================================================
-- TURISMO CAJAMARCA PWA - SCRIPT 01: TIPOS Y ENUMS (Prefijo: turismo_)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum para Roles
DO $$ BEGIN
  CREATE TYPE public.turismo_user_role_enum AS ENUM (
    'usuario',
    'turista',
    'prestador_turistico',
    'admin',
    'super_admin',
    'moderador',
    'auditor',
    'soporte',
    'analista_datos',
    'servicios_ia',
    'desarrollador',
    'embajador',
    'afiliado',
    'funcionario_mincit',
    'camara_comercio'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para Sub-tipos de Servicio de Prestadores Turísticos
DO $$ BEGIN
  CREATE TYPE public.turismo_provider_sub_type_enum AS ENUM (
    'alojamiento',
    'gastronomia',
    'agencia_viajes',
    'transporte',
    'guia',
    'artesania',
    'entretenimiento'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para Jerarquía Organizacional
DO $$ BEGIN
  CREATE TYPE public.turismo_provider_org_role_enum AS ENUM (
    'dueno',
    'colaborador'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para Estado del RNT
DO $$ BEGIN
  CREATE TYPE public.turismo_rnt_status_enum AS ENUM (
    'verificado',
    'pendiente',
    'vencido',
    'sin_rnt'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para Entidades Reguladoras
DO $$ BEGIN
  CREATE TYPE public.turismo_regulatory_entity_enum AS ENUM (
    'MINCIT',
    'FONTUR',
    'DIRCETUR',
    'CAMARA_COMERCIO'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para Tipos de Documento
DO $$ BEGIN
  CREATE TYPE public.turismo_document_type_enum AS ENUM (
    'DNI',
    'RUC',
    'PASAPORTE',
    'CE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
