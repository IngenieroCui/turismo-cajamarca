import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, UserRoleEnum } from '../../types/auth.types';
import {
  getTurismoRoles,
  getAllUsersProfiles,
  updateUserProfileRole,
  type TurismoRoleItem,
  type UserProfileItem,
} from '../../services/rolesService';
import { Footer } from '../../Footer';
import {
  ShieldAlert,
  LogOut,
  Cpu,
  Key,
  Lock,
  Server,
  Users,
  Search,
  RefreshCw,
  X,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const { user, profile, logout } = useAuthStore();
  const meta = ROLE_METADATA[UserRoleEnum.SUPER_ADMIN];

  const [rolesList, setRolesList] = useState<TurismoRoleItem[]>([]);
  const [usersList, setUsersList] = useState<UserProfileItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  const handleChangeUserRole = async (userId: string, userEmail: string, newRoleCode: string) => {
    const res = await updateUserProfileRole(userId, newRoleCode);
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Rol de ${userEmail} actualizado a "${newRoleCode}" en turismo_profiles.`,
      });
      await loadAllData();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al actualizar el rol.' });
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* HEADER SUPER ADMIN */}
      <header className="border-b border-red-900/40 bg-slate-950/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 my-0 tracking-tight">Turismo Cajamarca</h1>
              <p className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                Super Admin (Platform Owner)
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
        {/* BANNER SUPER ADMIN & CARDS */}
        <div className="p-6 sm:p-8 rounded-3xl bg-red-950/20 border border-red-900/40 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold text-red-200 my-0">
                  {profile?.full_name || user?.email}
                </h2>
                <span className={`px-3 py-1 rounded-xl border text-xs font-bold ${meta.badgeColor}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
            </div>

            <button
              onClick={loadAllData}
              disabled={loadingData}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-red-400 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Recargar Usuarios</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{meta.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-red-900/40 space-y-1">
              <Cpu className="w-5 h-5 text-red-400" />
              <h4 className="text-xs font-bold text-slate-200">Infraestructura</h4>
              <p className="text-[11px] text-slate-400">Control total del sistema</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-red-900/40 space-y-1">
              <Key className="w-5 h-5 text-amber-400" />
              <h4 className="text-xs font-bold text-slate-200">Asignar Administradores</h4>
              <p className="text-[11px] text-slate-400">Crear y promover Admins</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-red-900/40 space-y-1">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200">Kill-Switch</h4>
              <p className="text-[11px] text-slate-400">Seguridad global</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-red-900/40 space-y-1">
              <Server className="w-5 h-5 text-teal-400" />
              <h4 className="text-xs font-bold text-slate-200">Logs de Inmutabilidad</h4>
              <p className="text-[11px] text-slate-400">Auditoría completa</p>
            </div>
          </div>
        </div>

        {/* NOTIFICACIÓN FLASH */}
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

        {/* SECCIÓN DE GESTIÓN DE ROLES Y ADMINISTRADORES */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-100 my-0 flex items-center gap-2">
                <Users className="w-5 h-5 text-red-400" />
                <span>Gestión Global de Usuarios y Nombramiento de Administradores</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Como Super Administrador, tienes privilegios exclusivos para asignar los roles de{' '}
                <code className="text-purple-400 font-mono font-bold">admin</code> y{' '}
                <code className="text-red-400 font-mono font-bold">super_admin</code> a cualquier usuario registrado.
              </p>
            </div>

            {/* BUSCADOR */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar usuario o correo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          {/* TABLA DE USUARIOS */}
          <div className="rounded-3xl bg-slate-950/60 border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="p-4">Usuario / Nombre</th>
                    <th className="p-4">Correo Electrónico</th>
                    <th className="p-4">Rol Asignado Actual</th>
                    <th className="p-4 text-right">Asignar Rol (Incluye Admin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-4 font-bold flex items-center gap-2">
                        {u.role === UserRoleEnum.SUPER_ADMIN ? (
                          <ShieldAlert className="w-4 h-4 text-red-400" />
                        ) : u.role === UserRoleEnum.ADMIN ? (
                          <ShieldCheck className="w-4 h-4 text-purple-400" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-slate-400" />
                        )}
                        <span>{u.full_name || 'Sin Nombre'}</span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{u.email}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border font-mono ${
                            u.role === UserRoleEnum.SUPER_ADMIN
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : u.role === UserRoleEnum.ADMIN
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeUserRole(u.id, u.email, e.target.value)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-red-500 transition cursor-pointer"
                        >
                          {rolesList.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.name} ({r.code})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SuperAdminPage;
