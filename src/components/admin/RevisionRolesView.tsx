import React, { useState, useEffect } from 'react';
import { ROLE_METADATA, UserRoleEnum, type UserRole, type UserProfile } from '../../types/auth.types';
import { getFullProfilesByRole } from '../../services/profileService';
import { toggleTurismoRoleStatus, getAllUsersProfiles, type UserProfileItem } from '../../services/rolesService';
import { useAuthStore } from '../../context/useAuthStore';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  User,
  Shield,
  Phone,
  Mail,
  FileText,
  Calendar,
  Building2,
  Award,
  Globe,
  Headphones,
  BarChart3,
  Terminal,
  Cpu,
  Share2,
  X,
} from 'lucide-react';

interface RevisionRolesViewProps {
  isSuperAdmin?: boolean;
}

export const RevisionRolesView: React.FC<RevisionRolesViewProps> = ({ isSuperAdmin: propIsSuperAdmin }) => {
  const { isSuperAdmin: storeIsSuperAdmin } = useAuthStore();
  const isSuperAdmin = propIsSuperAdmin ?? storeIsSuperAdmin();

  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRoleEnum.PRESTADOR_TURISTICO);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const rolesList = (Object.values(UserRoleEnum) as UserRole[]).filter(
    (r) => isSuperAdmin || r !== UserRoleEnum.SUPER_ADMIN
  );
  const meta = ROLE_METADATA[selectedRole] || ROLE_METADATA[UserRoleEnum.PRESTADOR_TURISTICO];

  const loadRoleData = async (roleToLoad: UserRole) => {
    setLoading(true);
    setActionMessage(null);
    const [data, systemUsers] = await Promise.all([
      getFullProfilesByRole(roleToLoad),
      getAllUsersProfiles(),
    ]);
    setProfiles(data);
    setAllUsers(systemUsers);
    setLoading(false);
  };

  useEffect(() => {
    if (!isSuperAdmin && selectedRole === UserRoleEnum.SUPER_ADMIN) {
      setSelectedRole(UserRoleEnum.PRESTADOR_TURISTICO);
    } else {
      loadRoleData(selectedRole);
    }
  }, [selectedRole, isSuperAdmin]);

  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    setExpandedRowId(null);
  };

  const handleToggleStatus = async (profileId: string, currentStatus: boolean, email: string) => {
    setActionMessage(null);
    const res = await toggleTurismoRoleStatus(profileId, !currentStatus);
    if (res.success) {
      setActionMessage({
        type: 'success',
        text: `Estado de ${email} actualizado a ${!currentStatus ? 'Activo' : 'Inactivo'}.`,
      });
      await loadRoleData(selectedRole);
    } else {
      setActionMessage({ type: 'error', text: res.error || 'Error al cambiar estado.' });
    }
  };

  // Filtrado interno por búsqueda
  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.document_number && p.document_number.toLowerCase().includes(q)) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.ruc && p.ruc.toLowerCase().includes(q)) ||
      (p.razon_social && p.razon_social.toLowerCase().includes(q)) ||
      (p.rnt_number && p.rnt_number.toLowerCase().includes(q)) ||
      (p.referral_code && p.referral_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL: REVISIÓN DE ROLES */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] my-0">
                  Revisión General de Roles
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Inspección completa de usuarios creados y campos de base de datos por cada rol.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => loadRoleData(selectedRole)}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)] transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Recargar Datos</span>
          </button>
        </div>

        {/* TARJETAS ESTADÍSTICAS POR ROL ACTIVO EN LA PLATAFORMA */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">
              Conteo de Usuarios con Rol Actual Activo por Categoría
            </span>
            <span className="text-[10px] text-purple-400 font-mono font-bold">
              Haz clic en una tarjeta para revisar el rol
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {rolesList.map((rKey) => {
              const rMeta = ROLE_METADATA[rKey];
              const activeUsersCount = allUsers.filter((u) => u.role === rKey).length;
              const isSelected = rKey === selectedRole;

              return (
                <div
                  key={rKey}
                  onClick={() => handleRoleChange(rKey)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-2.5 ${
                    isSelected
                      ? 'bg-purple-600/10 border-purple-500 shadow-lg shadow-purple-600/10 ring-1 ring-purple-500/40'
                      : 'bg-[var(--bg-primary)] border-[var(--border-light)] hover:border-purple-400/40 hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border truncate max-w-[120px] ${rMeta.badgeColor}`}>
                      {rMeta.label}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0" title="Seleccionado actualmente" />
                    )}
                  </div>

                  <div>
                    <span className="text-xl font-extrabold text-[var(--text-primary)] font-mono block leading-none">
                      {activeUsersCount}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold mt-1 block">
                      {activeUsersCount === 1 ? 'Usuario activo' : 'Usuarios activos'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* NOTIFICACIÓN FLASH DE ÉXITO O ERROR */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between transition ${actionMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BARRA DE SELECCIÓN DE ROL DE LA TABLA (ROL A REVISAR) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] my-0 flex items-center gap-2">
              <span>Selecciona el Rol a Revisar:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeColor}`}>
                {meta.label}
              </span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 my-0">
              {meta.description}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={`Buscar en ${meta.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
            />
          </div>
        </div>

        {/* CHIPS DE SELECCIÓN RÁPIDA DE ROL */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {rolesList.map((rKey) => {
            const rMeta = ROLE_METADATA[rKey];
            const isSelected = rKey === selectedRole;
            return (
              <button
                key={rKey}
                onClick={() => handleRoleChange(rKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${isSelected
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-purple-400/40 hover:text-[var(--text-primary)]'
                  }`}
              >
                {rMeta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TABLA PRINCIPAL CON TODOS LOS DATOS DE LA BD POR ROL */}
      <div className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[var(--border-light)] bg-[var(--bg-primary)]/40 flex items-center justify-between">
          <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider my-0">
            Tabla de Usuarios Creados para el Rol: <span className="text-purple-400">{meta.label}</span>
          </h4>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {filteredProfiles.length} registros
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            <p className="text-xs text-[var(--text-secondary)] font-semibold">
              Cargando todos los campos de la tabla para {meta.label}...
            </p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="py-16 text-center space-y-3 p-8">
            <User className="w-12 h-12 text-[var(--text-muted)] mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-[var(--text-primary)] my-0">
              No hay usuarios creados para el rol {meta.label}
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto my-0">
              {searchQuery
                ? `No se encontraron coincidencias con "${searchQuery}".`
                : `Aún no se han registrado usuarios bajo el rol de ${meta.label} en la base de datos.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-muted)] uppercase tracking-wider font-extrabold text-[11px]">
                  <th className="p-4">Usuario / Email</th>
                  <th className="p-4">Documento / Teléfono</th>
                  <th className="p-4">Rol Actual</th>
                  <th className="p-4">Estado del Rol</th>
                  <th className="p-4">Estado Cuenta & Fecha</th>
                  <RoleHeaderColumns role={selectedRole} />
                  <th className="p-4 text-right">Acciones / Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-primary)]">
                {filteredProfiles.map((p) => {
                  const isExpanded = expandedRowId === p.id;
                  const isProtected = p.role === UserRoleEnum.ADMIN || p.role === UserRoleEnum.SUPER_ADMIN;
                  const canModify = isSuperAdmin || !isProtected;
                  const isRoleActiveInThisTable = p.role === selectedRole;

                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-[var(--bg-primary)]/40 transition">
                        {/* USUARIO Y CORREO */}
                        <td className="p-4 font-bold space-y-0.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xs shrink-0">
                              {p.full_name ? p.full_name.charAt(0).toUpperCase() : p.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[var(--text-primary)] font-extrabold">
                              {p.full_name || 'Sin Nombre'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[var(--text-secondary)] pl-9 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-purple-400" />
                            <span>{p.email}</span>
                          </div>
                        </td>

                        {/* DOCUMENTO Y TELÉFONO */}
                        <td className="p-4 space-y-0.5">
                          <div className="font-mono text-[var(--text-primary)] font-bold">
                            {p.document_type || 'DNI'}: {p.document_number || 'N/A'}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-purple-400" />
                            <span>{p.phone || 'No registrado'}</span>
                          </div>
                        </td>

                        {/* ROL ACTUAL DE USUARIO */}
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border font-mono ${ROLE_METADATA[p.role]?.badgeColor || 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}
                          >
                            {ROLE_METADATA[p.role]?.label || p.role}
                          </span>
                        </td>

                        {/* ESTADO DEL ROL EN ESTA TABLA */}
                        <td className="p-4">
                          {isRoleActiveInThisTable ? (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 w-fit shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              Rol Activo
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1.5 w-fit">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              Rol Inactivo
                            </span>
                          )}
                        </td>

                        {/* ESTADO ACTIVO Y REGISTRO */}
                        <td className="p-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${p.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}
                            >
                              {p.is_active ? 'Cuenta Activa' : 'Cuenta Inactiva'}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${p.is_verified ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                            >
                              {p.is_verified ? '✓ Verificado' : '⏳ Pendiente'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-purple-400" />
                            <span>{new Date(p.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>

                        {/* COLUMNAS ESPECÍFICAS SEGÚN LA TABLA DEL ROL */}
                        <RoleDataCells profile={p} role={selectedRole} />

                        {/* ACCIONES DE ESTADO Y DETALLE COMPLETO */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canModify ? (
                              <button
                                onClick={() => handleToggleStatus(p.id, p.is_active, p.email)}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer ${p.is_active
                                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                  }`}
                              >
                                {p.is_active ? 'Desactivar' : 'Activar'}
                              </button>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                🔒 Protegido
                              </span>
                            )}


                          </div>
                        </td>
                      </tr>

                      {/* FILA EXPANDIDA CON DETALLES Y JSON COMPLETO */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-[var(--border-light)]">
                          <td colSpan={8} className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs text-purple-400 font-bold border-b border-slate-800 pb-2">
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4" />
                                Detalle Completo del Registro (Tabla `turismo_profiles` + Tabla del Rol):
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">UUID: {p.id}</span>
                            </div>
                            <pre className="p-3 rounded-2xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto border border-slate-800 leading-relaxed max-h-60">
                              {JSON.stringify(p, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Encabezados dinámicos de columnas para la tabla según el rol a revisar
 */
const RoleHeaderColumns: React.FC<{ role: UserRole }> = ({ role }) => {
  if (role === UserRoleEnum.PRESTADOR_TURISTICO) {
    return (
      <>
        <th className="p-4">RUC & Razón Social</th>
        <th className="p-4">Sub-Tipo & RNT</th>
      </>
    );
  }
  if (role === UserRoleEnum.MODERADOR) {
    return (
      <>
        <th className="p-4">Especialidad & Nivel</th>
        <th className="p-4">Cuota Diaria & Categorías</th>
      </>
    );
  }
  if (role === UserRoleEnum.AUDITOR) {
    return (
      <>
        <th className="p-4">Certificación Auditor</th>
        <th className="p-4">Alcance & Nivel Seguridad</th>
      </>
    );
  }
  if (role === UserRoleEnum.SOPORTE) {
    return (
      <>
        <th className="p-4">Nivel & Cola Asignada</th>
        <th className="p-4">Límite Reembolso & Horario</th>
      </>
    );
  }
  if (role === UserRoleEnum.ANALISTA_DATOS) {
    return (
      <>
        <th className="p-4">Herramienta BI & Alcance</th>
        <th className="p-4">Permiso Exportación</th>
      </>
    );
  }
  if (role === UserRoleEnum.DESARROLLADOR) {
    return (
      <>
        <th className="p-4">Git Handle & Ambiente</th>
        <th className="p-4">SSH Fingerprint</th>
      </>
    );
  }
  if (role === UserRoleEnum.SERVICIOS_IA) {
    return (
      <>
        <th className="p-4">Nombre Servicio & Modelo</th>
        <th className="p-4">Cuota Tokens Diarios</th>
      </>
    );
  }
  if (role === UserRoleEnum.FUNCIONARIO_MINCIT || role === UserRoleEnum.CAMARA_COMERCIO) {
    return (
      <>
        <th className="p-4">Entidad Reguladora & ID</th>
        <th className="p-4">Jurisdicción</th>
      </>
    );
  }
  if (role === UserRoleEnum.EMBAJADOR || role === UserRoleEnum.AFILIADO) {
    return (
      <>
        <th className="p-4">Código Referido & Comisión</th>
        <th className="p-4">Pago & Ganancias</th>
      </>
    );
  }
  return (
    <>
      <th className="p-4">Origen & Nacionalidad</th>
      <th className="p-4">Idioma & Contacto</th>
    </>
  );
};

/**
 * Celdas dinámicas de datos para la tabla según la base de datos del rol seleccionado
 */
const RoleDataCells: React.FC<{ profile: UserProfile; role: UserRole }> = ({ profile, role }) => {
  if (role === UserRoleEnum.PRESTADOR_TURISTICO) {
    return (
      <>
        <td className="p-4 space-y-0.5">
          <div className="font-mono text-emerald-400 font-bold flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>{profile.ruc || 'Sin RUC'}</span>
          </div>
          <div className="text-[11px] text-[var(--text-primary)] font-semibold truncate max-w-xs">
            {profile.razon_social || 'N/A'}
          </div>
        </td>
        <td className="p-4 space-y-0.5">
          <div className="text-emerald-300 font-bold capitalize">{profile.sub_role || 'alojamiento'}</div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)]">
            RNT: {profile.rnt_number || 'Pendiente'} ({profile.rnt_status || 'pendiente'})
          </div>
        </td>
      </>
    );
  }

  if (role === UserRoleEnum.MODERADOR) {
    return (
      <>
        <td className="p-4 space-y-0.5">
          <div className="text-indigo-400 font-bold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            <span>{profile.specialty_area || 'General'}</span>
          </div>
          <div className="text-[11px] text-indigo-300">{profile.moderation_level || 'Junior'}</div>
        </td>
        <td className="p-4 space-y-0.5">
          <div className="font-mono text-[var(--text-primary)] font-bold">{profile.daily_quota || 50} rev/día</div>
          <div className="text-[10px] text-[var(--text-muted)] truncate max-w-xs">
            {profile.assigned_categories?.join(', ') || 'Todas las categorías'}
          </div>
        </td>
      </>
    );
  }

  if (role === UserRoleEnum.AUDITOR) {
    return (
      <>
        <td className="p-4 space-y-0.5">
          <div className="font-mono text-amber-400 font-bold flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            <span>{profile.audit_certification_id || 'CERT-N/A'}</span>
          </div>
        </td>
        <td className="p-4 space-y-0.5">
          <div className="text-amber-300 font-bold">{profile.institutional_scope || 'Regional'}</div>
          <div className="text-[10px] text-[var(--text-secondary)]">{profile.security_clearance_level || 'Nivel 2'}</div>
        </td>
      </>
    );
  }

  if (role === UserRoleEnum.SOPORTE) {
    return (
      <>
        <td className="p-4 space-y-0.5">
          <div className="text-teal-400 font-bold flex items-center gap-1">
            <Headphones className="w-3.5 h-3.5" />
            <span>{profile.support_level || 'Nivel 1'}</span>
          </div>
          <div className="text-[11px] text-teal-300">{profile.assigned_queue || 'Atención General'}</div>
        </td>
        <td className="p-4 space-y-0.5">
          <div className="font-mono text-teal-200 font-bold">Max: S/ {profile.max_refund_limit || 500}</div>
          <div className="text-[10px] text-[var(--text-muted)]">{profile.shift_hours || '8am - 5pm'}</div>
        </td>
      </>
    );
  }

  if (role === UserRoleEnum.ANALISTA_DATOS) {
    return (
      <>
        <td className="p-4 space-y-0.5">
          <div className="text-cyan-400 font-bold flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{profile.bi_tool || 'Metabase'}</span>
          </div>
          <div className="text-[11px] text-cyan-300">{profile.dataset_access_scope || 'Datos Agregados'}</div>
        </td>
        <td className="p-4">
          <span className={`font-bold ${profile.export_format_permission !== false ? 'text-emerald-400' : 'text-red-400'}`}>
            {profile.export_format_permission !== false ? '✓ Habilitado' : '✕ Restringido'}
          </span>
        </td>
      </>
    );
  }

  if (role === UserRoleEnum.DESARROLLADOR) {
    return (
      <>
        <td className="p-4 space-y-0.5">
          <div className="font-mono text-purple-400 font-bold flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>{profile.git_handle || 'N/A'}</span>
          </div>
          <div className="text-[11px] text-slate-300">{profile.environment_access || 'Staging'}</div>
        </td>
        <td className="p-4">
          <span className="font-mono text-[10px] text-slate-400 block truncate max-w-xs">
            {profile.public_ssh_fingerprint || 'Sin huella SSH'}
          </span>
        </td>
      </>
    );
  }

  if (role === UserRoleEnum.SERVICIOS_IA) {
    return (
      <>
        <td className="p-4 space-y-0.5">
          <div className="text-fuchsia-400 font-bold flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>{profile.service_name || 'Recomendador Gemini'}</span>
          </div>
          <div className="font-mono text-[11px] text-fuchsia-300">{profile.model_version || 'v2.5-flash'}</div>
        </td>
        <td className="p-4 font-mono text-fuchsia-200 font-bold">
          {profile.daily_token_quota || 500000} tokens
        </td>
      </>
    );
  }

  if (role === UserRoleEnum.FUNCIONARIO_MINCIT || role === UserRoleEnum.CAMARA_COMERCIO) {
    return (
      <>
        <td className="p-4 space-y-0.5">
          <div className="text-yellow-400 font-bold flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            <span>{profile.entity_type || (role === UserRoleEnum.CAMARA_COMERCIO ? 'CÁMARA DE COMERCIO' : 'MINCIT')}</span>
          </div>
          <div className="font-mono text-[11px] text-yellow-300">{profile.institutional_id || 'REG-N/A'}</div>
        </td>
        <td className="p-4 text-[var(--text-primary)] font-semibold">
          {profile.jurisdiction_scope || 'Cajamarca'}
        </td>
      </>
    );
  }

  if (role === UserRoleEnum.EMBAJADOR || role === UserRoleEnum.AFILIADO) {
    return (
      <>
        <td className="p-4 space-y-0.5">
          <div className="font-mono text-orange-400 font-bold flex items-center gap-1">
            <Share2 className="w-3.5 h-3.5" />
            <span>{profile.referral_code || 'N/A'}</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold">{profile.commission_rate || 5.0}% comisión</div>
        </td>
        <td className="p-4 space-y-0.5">
          <div className="text-orange-300 font-bold uppercase">{profile.payout_method || 'yape'}</div>
          <div className="font-mono text-emerald-300 font-bold">S/ {profile.total_earnings || 0}</div>
        </td>
      </>
    );
  }

  return (
    <>
      <td className="p-4 space-y-0.5">
        <div className="text-blue-300 font-semibold">{profile.country_of_origin || 'Perú'}</div>
        <div className="text-[11px] text-blue-400">{profile.nationality || 'Peruana'}</div>
      </td>
      <td className="p-4 space-y-0.5">
        <div className="text-[var(--text-primary)] font-semibold">{profile.preferred_language || 'Español'}</div>
        <div className="text-[10px] text-[var(--text-muted)] truncate max-w-xs">
          {profile.emergency_contact_name || 'N/A'} ({profile.emergency_contact_phone || 'N/A'})
        </div>
      </td>
    </>
  );
};

export default RevisionRolesView;
