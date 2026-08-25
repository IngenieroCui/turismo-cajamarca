import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import {
  getTurismoRoles,
  createTurismoRole,
  toggleTurismoRoleStatus,
  getAllUsersProfiles,
  updateUserProfileRole,
  type TurismoRoleItem,
  type UserProfileItem,
} from '../../services/rolesService';
import { RoleDrawerLayout } from '../../components/RoleDrawerLayout';
import {
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  X,
  UserCheck,
  Tag,
  Folder,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { profile, isSuperAdmin } = useAuthStore();
  const userIsSuperAdmin = isSuperAdmin();
  const meta = ROLE_METADATA[UserRoleEnum.ADMIN];

  const [activeTab, setActiveTab] = useState<'roles' | 'usuarios'>('roles');
  const [rolesList, setRolesList] = useState<TurismoRoleItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfileItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal para Crear Nuevo Rol
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newRoleCode, setNewRoleCode] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDesc, setNewRoleDesc] = useState<string>('');
  const [newRoleBadgeColor, setNewRoleBadgeColor] = useState<string>(
    'bg-purple-500/10 text-purple-400 border-purple-500/20'
  );
  const [newRoleFolder, setNewRoleFolder] = useState<string>('turista');
  const [creating, setCreating] = useState<boolean>(false);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAllData = async () => {
    setLoadingData(true);
    const [rolesData, usersData] = await Promise.all([
      getTurismoRoles(),
      getAllUsersProfiles(),
    ]);
    setRolesList(rolesData);
    setUsersList(usersData);
    setLoadingData(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleCode.trim() || !newRoleName.trim()) return;

    setCreating(true);
    setStatusMessage(null);

    const res = await createTurismoRole({
      code: newRoleCode.trim().toLowerCase().replace(/\s+/g, '_'),
      name: newRoleName.trim(),
      description: newRoleDesc.trim(),
      badge_color: newRoleBadgeColor.trim(),
      folder_name: newRoleFolder.trim(),
    });

    if (res.success) {
      setStatusMessage({ type: 'success', text: `Rol "${newRoleName}" creado exitosamente.` });
      setIsCreateModalOpen(false);
      setNewRoleCode('');
      setNewRoleName('');
      setNewRoleDesc('');
      await loadAllData();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al crear el rol.' });
    }
    setCreating(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean, roleName: string) => {
    setStatusMessage(null);
    const res = await toggleTurismoRoleStatus(id, !currentStatus);
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Estado del rol "${roleName}" actualizado a ${!currentStatus ? 'Activo' : 'Inactivo'}.`,
      });
      await loadAllData();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al cambiar estado.' });
    }
  };

  const handleChangeUserRole = async (userId: string, userEmail: string, newRoleCode: string) => {
    if (!userIsSuperAdmin && (newRoleCode === UserRoleEnum.ADMIN || newRoleCode === UserRoleEnum.SUPER_ADMIN)) {
      setStatusMessage({
        type: 'error',
        text: 'No tienes permisos para asignar el rol de Administrador o Super Administrador.',
      });
      return;
    }

    setStatusMessage(null);
    const res = await updateUserProfileRole(userId, newRoleCode);
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Rol de ${userEmail} actualizado a "${newRoleCode}".`,
      });
      await loadAllData();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al actualizar el rol.' });
    }
  };

  // Filtrado de búsquedas (oculta super_admin a administradores estándar)
  const filteredRoles = rolesList.filter((r) => {
    if (!userIsSuperAdmin && r.code === UserRoleEnum.SUPER_ADMIN) {
      return false;
    }
    return (
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const filteredUsers = usersList.filter((u) => {
    if (!userIsSuperAdmin && u.role === UserRoleEnum.SUPER_ADMIN) {
      return false;
    }
    return (
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <RoleDrawerLayout>
      <div className="space-y-6">
        {/* BANNER BIENVENIDA ADMINISTRADOR */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] my-0">
                ¡Bienvenido, {profile?.full_name?.split(' ')[0] || 'Administrador'}!
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeColor}`}>
                {meta.label}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Gestión centralizada del catálogo de roles, usuarios y permisos del sistema.
            </p>
          </div>

          <button
            onClick={loadAllData}
            disabled={loadingData}
            className="px-4 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)] transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loadingData ? 'animate-spin' : ''}`} />
            <span>Recargar Datos</span>
          </button>
        </div>

        {/* NOTIFICACIÓN FLASH DE ÉXITO O ERROR */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between transition ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'roles'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Catálogo de Roles ({filteredRoles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('usuarios')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'usuarios'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Usuarios Registrados ({filteredUsers.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* BUSCADOR */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder={activeTab === 'roles' ? 'Buscar rol...' : 'Buscar usuario o correo...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
              />
            </div>

            {/* BOTÓN REGISTRAR NUEVO ROL (SOLO EN PESTAÑA ROLES) */}
            {activeTab === 'roles' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Rol</span>
              </button>
            )}
          </div>
        </div>

        {/* TABLA O GRILLA DE ROLES */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((roleItem) => (
              <div
                key={roleItem.id}
                className="p-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${roleItem.badge_color}`}>
                      {roleItem.name}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(roleItem.id, roleItem.is_active, roleItem.name)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                        roleItem.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                      }`}
                    >
                      {roleItem.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{roleItem.is_active ? 'Activo' : 'Inactivo'}</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] my-0 font-mono">
                      {roleItem.code}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                      {roleItem.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1 font-mono">
                    <Folder className="w-3.5 h-3.5 text-purple-400" />
                    <span>pages/{roleItem.folder_name}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TABLA DE USUARIOS REGISTRADOS */}
        {activeTab === 'usuarios' && (
          <div className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-light)] bg-[var(--bg-primary)]/50 text-[var(--text-muted)] uppercase tracking-wider font-bold">
                    <th className="p-4">Usuario / Nombre</th>
                    <th className="p-4">Correo Electrónico</th>
                    <th className="p-4">Rol Asignado Actual</th>
                    <th className="p-4 text-right">Asignar Nuevo Rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-primary)]">
                  {filteredUsers.map((u) => {
                    const isProtected = u.role === UserRoleEnum.ADMIN || u.role === UserRoleEnum.SUPER_ADMIN;
                    const canEditThisUser = userIsSuperAdmin || !isProtected;

                    return (
                      <tr key={u.id} className="hover:bg-[var(--bg-primary)]/30 transition">
                        <td className="p-4 font-bold flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-purple-400" />
                          <span>{u.full_name || 'Sin Nombre'}</span>
                        </td>
                        <td className="p-4 text-[var(--text-secondary)] font-mono">{u.email}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold border font-mono bg-purple-500/10 text-purple-400 border-purple-500/20">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {canEditThisUser ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeUserRole(u.id, u.email, e.target.value)}
                              className="px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-400 transition cursor-pointer"
                            >
                              {rolesList
                                .filter((r) => userIsSuperAdmin || (r.code !== UserRoleEnum.ADMIN && r.code !== UserRoleEnum.SUPER_ADMIN))
                                .map((r) => (
                                  <option key={r.code} value={r.code}>
                                    {r.name} ({r.code})
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              🔒 Rol Protegido
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL CREACIÓN DE ROL */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
                <h3 className="text-base font-bold text-[var(--text-primary)] my-0">Registrar Nuevo Rol</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">Código del Rol *</label>
                    <input
                      type="text"
                      placeholder="ej. supervisor_campo"
                      value={newRoleCode}
                      onChange={(e) => setNewRoleCode(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre del Rol *</label>
                    <input
                      type="text"
                      placeholder="ej. Supervisor de Campo"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">Descripción</label>
                    <textarea
                      rows={2}
                      placeholder="Descripción de funciones..."
                      value={newRoleDesc}
                      onChange={(e) => setNewRoleDesc(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">Clases de Estilo / Badge UI</label>
                    <input
                      type="text"
                      placeholder="bg-purple-500/10 text-purple-400 border-purple-500/20"
                      value={newRoleBadgeColor}
                      onChange={(e) => setNewRoleBadgeColor(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">Carpeta del Módulo</label>
                    <input
                      type="text"
                      placeholder="ej. turista"
                      value={newRoleFolder}
                      onChange={(e) => setNewRoleFolder(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-light)] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{creating ? 'Guardando en BD...' : 'Guardar Rol en BD'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleDrawerLayout>
  );
};

export default AdminPage;
