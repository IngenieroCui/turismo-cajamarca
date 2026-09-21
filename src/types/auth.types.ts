import { z } from 'zod';

/**
 * Roles del Sistema de Turismo Cajamarca (organizados por carpetas)
 */
export const UserRoleEnum = {
  USUARIO: 'usuario',
  TURISTA: 'turista',
  PRESTADOR_TURISTICO: 'prestador_turistico',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  MODERADOR: 'moderador',
  AUDITOR: 'auditor',
  SOPORTE: 'soporte',
  ANALISTA_DATOS: 'analista_datos',
  SERVICIOS_IA: 'servicios_ia',
  DESARROLLADOR: 'desarrollador',
  EMBAJADOR: 'embajador',
  AFILIADO: 'afiliado',
  FUNCIONARIO_MINCIT: 'funcionario_mincit',
  CAMARA_COMERCIO: 'camara_comercio',
} as const;

export type UserRole = (typeof UserRoleEnum)[keyof typeof UserRoleEnum];

/**
 * Subtipos de servicio para el rol Prestador Turístico
 */
export type PrestadorSubRole =
  | 'alojamiento'
  | 'gastronomia'
  | 'agencia_viajes'
  | 'transporte'
  | 'guia'
  | 'artesania'
  | 'entretenimiento';

/**
 * Subtipos de jerarquía interna dentro de una organización/empresa prestadora
 */
export type PrestadorOrgRole = 'dueno' | 'colaborador';

/**
 * Matriz de Permisos Granulares RBAC
 */
export type Permission =
  | '*' // Super Admin global
  | 'platform:read'
  | 'platform:write'
  | 'platform:config'
  | 'users:manage'
  | 'roles:manage'
  | 'content:moderate'
  | 'content:approve'
  | 'content:reject'
  | 'provider:catalog_manage'
  | 'provider:offers_manage'
  | 'provider:bookings_view'
  | 'provider:finances_view'
  | 'tourist:book'
  | 'tourist:review'
  | 'tourist:profile'
  | 'audit:logs_read'
  | 'audit:blockchain_read'
  | 'support:tickets_manage'
  | 'support:refund_issue'
  | 'bi:analytics_read'
  | 'bi:reports_export'
  | 'ai:recommendations_read'
  | 'ai:embeddings_write'
  | 'devops:infra_manage'
  | 'ambassador:referral_manage'
  | 'ambassador:commissions_view'
  | 'regulatory:rnt_verify'
  | 'regulatory:compliance_report';

/**
 * Perfil de usuario mapeado a la tabla `turismo_profiles` en Supabase
 */
export interface UserProfile {
  id: string; // Auth UUID
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  roles: AssignedRole[];
  sub_role?: PrestadorSubRole | null;
  org_role?: PrestadorOrgRole | null;
  tenant_id: string | null;
  permissions: Permission[];
  rnt_number?: string | null;
  document_type?: 'DNI' | 'RUC' | 'PASAPORTE' | 'CE' | null;
  document_number?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;

  // Extensión para Turista
  country_of_origin?: string | null;
  nationality?: string | null;
  preferred_language?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  travel_preferences?: string[];

  // Extensión para Prestador
  ruc?: string | null;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  rnt_status?: 'verificado' | 'pendiente' | 'vencido' | 'sin_rnt' | null;
  address?: string | null;
  website_url?: string | null;

  // Extensión para Moderador
  specialty_area?: string | null;
  assigned_categories?: string[];
  moderation_level?: string | null;
  daily_quota?: number;

  // Extensión para Auditor
  audit_certification_id?: string | null;
  institutional_scope?: string | null;
  security_clearance_level?: string | null;

  // Extensión para Soporte
  support_level?: string | null;
  assigned_queue?: string | null;
  max_refund_limit?: number;
  shift_hours?: string | null;

  // Extensión para Analista
  bi_tool?: string | null;
  dataset_access_scope?: string | null;
  export_format_permission?: boolean;

  // Extensión para DevOps
  git_handle?: string | null;
  environment_access?: string | null;
  public_ssh_fingerprint?: string | null;

  // Extensión para Servicio IA
  service_name?: string | null;
  model_version?: string | null;
  daily_token_quota?: number;
  endpoint_url?: string | null;

  // Extensión para Reguladores (MinCIT / Cámara de Comercio)
  /** @deprecated legacy compatibility; never expose as a new UI option. */
  entity_type?: 'MINCIT' | 'FONTUR' | 'DIRCETUR' | 'CAMARA_COMERCIO' | null;
  institutional_id?: string | null;
  jurisdiction_scope?: string | null;

  // Extensión para Afiliados / Embajadores
  referral_code?: string | null;
  commission_rate?: number;
  payout_method?: 'nequi' | 'daviplata' | 'transferencia' | 'yape' | 'plin' | 'cci' | null;
  total_earnings?: number;
}

export interface AssignedRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  badge_color: string;
  folder_name: string;
  is_active: boolean;
  is_protected: boolean;
  is_system: boolean;
  is_primary: boolean;
}

/**
 * Metadata descriptiva de roles para la interfaz
 */
export interface RoleMetaData {
  role: UserRole;
  label: string;
  description: string;
  badgeColor: string;
  folderName: string;
}

export const ROLE_METADATA: Record<UserRole, RoleMetaData> = {
  [UserRoleEnum.USUARIO]: {
    role: UserRoleEnum.USUARIO,
    label: 'Usuario',
    description: 'Rol legado de compatibilidad con cuentas creadas en versiones anteriores.',
    badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    folderName: 'usuario',
  },
  [UserRoleEnum.TURISTA]: {
    role: UserRoleEnum.TURISTA,
    label: 'Turista',
    description: 'Viajeros y consumidores finales de experiencias turísticas.',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    folderName: 'turista',
  },
  [UserRoleEnum.PRESTADOR_TURISTICO]: {
    role: UserRoleEnum.PRESTADOR_TURISTICO,
    label: 'Prestador Turístico',
    description: 'Empresas, guías, hoteles y operadores de servicios turísticos.',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    folderName: 'prestador_turistico',
  },
  [UserRoleEnum.ADMIN]: {
    role: UserRoleEnum.ADMIN,
    label: 'Administrador',
    description: 'Operación diaria de la plataforma y usuarios.',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    folderName: 'admin',
  },
  [UserRoleEnum.SUPER_ADMIN]: {
    role: UserRoleEnum.SUPER_ADMIN,
    label: 'Super Administrador',
    description: 'Control absoluto del sistema e infraestructura.',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
    folderName: 'super_admin',
  },
  [UserRoleEnum.MODERADOR]: {
    role: UserRoleEnum.MODERADOR,
    label: 'Moderador',
    description: 'Revisión y aprobación de contenidos y opiniones.',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    folderName: 'moderador',
  },
  [UserRoleEnum.AUDITOR]: {
    role: UserRoleEnum.AUDITOR,
    label: 'Auditor',
    description: 'Supervisión de trazabilidad, logs e integridad legal.',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    folderName: 'auditor',
  },
  [UserRoleEnum.SOPORTE]: {
    role: UserRoleEnum.SOPORTE,
    label: 'Soporte',
    description: 'Atención de incidencias y asistencia técnica.',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    folderName: 'soporte',
  },
  [UserRoleEnum.ANALISTA_DATOS]: {
    role: UserRoleEnum.ANALISTA_DATOS,
    label: 'Analista de Datos',
    description: 'Inteligencia de negocios y datos agregados.',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    folderName: 'analista_datos',
  },
  [UserRoleEnum.SERVICIOS_IA]: {
    role: UserRoleEnum.SERVICIOS_IA,
    label: 'Servicio IA / Sistema',
    description: 'Motor de recomendaciones e identidades de servicio.',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    folderName: 'servicios_ia',
  },
  [UserRoleEnum.DESARROLLADOR]: {
    role: UserRoleEnum.DESARROLLADOR,
    label: 'Desarrollador / DevOps',
    description: 'Acceso técnico, despliegues e infraestructura.',
    badgeColor: 'bg-slate-600/10 text-slate-300 border-slate-600/20',
    folderName: 'desarrollador',
  },
  [UserRoleEnum.EMBAJADOR]: {
    role: UserRoleEnum.EMBAJADOR,
    label: 'Embajador',
    description: 'Promotores de turismo y enlaces de afiliación.',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    folderName: 'embajador',
  },
  [UserRoleEnum.AFILIADO]: {
    role: UserRoleEnum.AFILIADO,
    label: 'Afiliado',
    description: 'Red de referidos y promociones turísticas.',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    folderName: 'afiliado',
  },
  [UserRoleEnum.FUNCIONARIO_MINCIT]: {
    role: UserRoleEnum.FUNCIONARIO_MINCIT,
    label: 'Funcionario MinCIT / FONTUR',
    description: 'Supervisión regulatoria y fiscalización RNT.',
    badgeColor: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    folderName: 'funcionario_mincit',
  },
  [UserRoleEnum.CAMARA_COMERCIO]: {
    role: UserRoleEnum.CAMARA_COMERCIO,
    label: 'Cámara de Comercio',
    description: 'Validación de registro mercantil y formalización empresarial.',
    badgeColor: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
    folderName: 'camara_comercio',
  },
};

/**
 * Esquema Zod para Inicio de Sesión
 */
export const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Esquema Zod para Registro de Usuario (Por defecto: rol turista)
 */
export const signUpSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  confirmPassword: z.string().min(6, 'Confirma tu contraseña.'),
  fullName: z.string().min(2, 'Ingresa tu nombre completo.'),
  phone: z.string().optional(),
  documentType: z.enum(['DNI', 'RUC', 'PASAPORTE', 'CE']).default('DNI'),
  documentNumber: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  nationality: z.string().optional(),
  preferredLanguage: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
