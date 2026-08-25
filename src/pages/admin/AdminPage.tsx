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
import { Footer } from '../../Footer';
import {
  ShieldCheck,
  LogOut,
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
  const { profile, logout, isSuperAdmin } = useAuthStore();
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
  const [modalError, setModalError] = useState<string | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  // Mensaje de éxito/error de actualización
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
    setModalError(null);

    if (!newRoleCode.trim() || !newRoleName.trim()) {
      setModalError('El código y el nombre del rol son obligatorios.');
      return;
    }

    setCreating(true);
    const res = await createTurismoRole({
      code: newRoleCode,
      name: newRoleName,
      description: newRoleDesc,
      badge_color: newRoleBadgeColor,
      folder_name: newRoleFolder,
    });

    if (res.success) {
      setIsCreateModalOpen(false);
      setNewRoleCode('');
      setNewRoleName('');
      setNewRoleDesc('');
      setStatusMessage({ type: 'success', text: `Rol "${newRoleName}" creado exitosamente en turismo_roles.` });
      await loadAllData();
    } else {
      setModalError(res.error || 'Error al crear el rol en la base de datos.');
    }
    setCreating(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean, roleName: string) => {
    const res = await toggleTurismoRoleStatus(id, !currentStatus);
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Estado del rol "${roleName}" actualizado a ${!currentStatus ? 'Activo' : 'Inactivo'}.`,
      });
      await loadAllData();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al cambiar estado del rol.' });
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

    const res = await updateUserProfileRole(userId, newRoleCode);
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Rol de ${userEmail} actualizado a "${newRoleCode}" en turismo_profiles.`,
      });
      await loadAllData();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al actualizar rol del usuario.' });
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between">
      {/* HEADER PRINCIPAL DE ADMINISTRADOR */}
      <header className="border-b border-[var(--border-light)] bg-[var(--bg-secondary)]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)] my-0 leading-tight">
                Turismo Cajamarca
              </h1>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
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

          </div>

          <button
            onClick={loadAllData}
            disabled={loadingData}
            className="px-4 py-2 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-light)] text-xs font-bold text-[var(--text-primary)] transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            <span>Recargar Datos</span>
          </button>
        </div>

        {/* NOTIFICACIÓN FLASH DE ÉXITO O ERROR */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between transition ${statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 hover:opacity-75 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* NAVEGACIÓN ENTRE PESTAÑAS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 border ${activeTab === 'roles'
                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/20'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-purple-400/40'
                }`}
            >
              <Tag className="w-4 h-4" />
              <span>Gestión de Roles</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-purple-200">
                {rolesList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('usuarios')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 border ${activeTab === 'usuarios'
                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/20'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-purple-400/40'
                }`}
            >
              <Users className="w-4 h-4" />
              <span>Gestión de Usuarios</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/40 text-purple-200">
                {usersList.length}
              </span>
            </button>
          </div>

          {/* BUSCADOR INTEGRADO */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={activeTab === 'roles' ? 'Buscar rol o código...' : 'Buscar usuario o correo...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-purple-400 transition"
            />
          </div>
        </div>

        {/* CONTENIDO PESTAÑA 1: GESTIÓN DE ROLES DINÁMICOS */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] my-0 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <span>Catálogo de Roles Registrados en la Base de Datos</span>
                </h3>

              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Rol</span>
              </button>
            </div>

            {/* TABLA DE ROLES */}
            <div className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-light)] bg-[var(--bg-primary)]/50 text-[var(--text-secondary)] uppercase tracking-wider font-bold">
                      <th className="p-4">Código / Identificador</th>
                      <th className="p-4">Nombre del Rol</th>
                      <th className="p-4">Vista Badge UI</th>
                      <th className="p-4">Carpeta Módulo</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-primary)]">
                    {filteredRoles.map((roleItem) => (
                      <tr key={roleItem.id} className="hover:bg-[var(--bg-primary)]/40 transition">
                        <td className="p-4 font-mono font-bold text-purple-300">{roleItem.code}</td>
                        <td className="p-4 font-bold">{roleItem.name}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${roleItem.badge_color}`}>
                            {roleItem.name}
                          </span>
                        </td>
                        <td className="p-4 text-[var(--text-secondary)] font-mono flex items-center gap-1">
                          <Folder className="w-3.5 h-3.5 text-amber-400" />
                          <span>{roleItem.folder_name}</span>
                        </td>
                        <td className="p-4">
                          {roleItem.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 text-[10px]">
                              <XCircle className="w-3 h-3" /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleToggleStatus(roleItem.id, roleItem.is_active, roleItem.name)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer border ${roleItem.is_active
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                              }`}
                          >
                            {roleItem.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA 2: GESTIÓN DE USUARIOS Y ASIGNACIÓN DINÁMICA */}
        {activeTab === 'usuarios' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] my-0 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Asignación de Roles a Usuarios Registrados</span>
              </h3>

            </div>

            <div className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-light)] bg-[var(--bg-primary)]/50 text-[var(--text-secondary)] uppercase tracking-wider font-bold">
                      <th className="p-4">Usuario / Nombre</th>
                      <th className="p-4">Correo Electrónico</th>
                      <th className="p-4">Rol Asignado Actual</th>
                      <th className="p-4 text-right">Cambiar Rol Dinámicamente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-primary)]">
                    {filteredUsers.map((u) => {
                      const isTargetAdmin = u.role === UserRoleEnum.ADMIN || u.role === UserRoleEnum.SUPER_ADMIN;

                      // Filtrar opciones de roles: Si no es Super Admin, no mostrar 'admin' ni 'super_admin' como opción asignable
                      const availableRoles = rolesList.filter((r) => {
                        if (!userIsSuperAdmin && (r.code === UserRoleEnum.ADMIN || r.code === UserRoleEnum.SUPER_ADMIN)) {
                          return false;
                        }
                        return true;
                      });

                      return (
                        <tr key={u.id} className="hover:bg-[var(--bg-primary)]/40 transition">
                          <td className="p-4 font-bold flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-purple-400" />
                            <span>{u.full_name || 'Sin Nombre'}</span>
                          </td>
                          <td className="p-4 text-[var(--text-secondary)]">{u.email}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {!userIsSuperAdmin && isTargetAdmin ? (
                              <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 inline-flex items-center gap-1 font-mono">
                                Rol Protegido
                              </span>
                            ) : (
                              <select
                                value={u.role}
                                onChange={(e) => handleChangeUserRole(u.id, u.email, e.target.value)}
                                className="px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-400 transition cursor-pointer"
                              >
                                {availableRoles.map((r) => (
                                  <option key={r.code} value={r.code}>
                                    {r.name} ({r.code})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PARA CREAR UN NUEVO ROL DINÁMICO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-3xl overflow-hidden shadow-2xl space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-[var(--text-primary)] my-0">
                  Crear Nuevo Rol Dinámico
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Código del Rol (slug sin espacios) *
                </label>
                <input
                  type="text"
                  placeholder="ej. guia_local"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Nombre del Rol (Legible) *
                </label>
                <input
                  type="text"
                  placeholder="ej. Guía de Turismo Local"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Descripción del Rol
                </label>
                <textarea
                  rows={2}
                  placeholder="Descripción de responsabilidades y permisos asignados..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    Carpeta Módulo
                  </label>
                  <select
                    value={newRoleFolder}
                    onChange={(e) => setNewRoleFolder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                  >
                    <option value="turista">turista</option>
                    <option value="prestador_turistico">prestador_turistico</option>
                    <option value="admin">admin</option>
                    <option value="usuario">usuario</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    Estilo de Badge UI
                  </label>
                  <input
                    type="text"
                    value={newRoleBadgeColor}
                    onChange={(e) => setNewRoleBadgeColor(e.target.value)}
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

      <Footer />
    </div>
  );
};

export default AdminPage;
