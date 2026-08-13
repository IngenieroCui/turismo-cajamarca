import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import {
  UserRoleEnum,
  signUpSchema,
  ROLE_METADATA,
} from '../../types/auth.types';
import type { UserRole, PrestadorSubRole } from '../../types/auth.types';
import { Footer } from '../../Footer';
import { Compass, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, loading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Por defecto el rol es 'usuario' al autoregistrarse
  const [role, setRole] = useState<UserRole>(UserRoleEnum.USUARIO);
  const [subRole, setSubRole] = useState<PrestadorSubRole | ''>('');
  const [rntNumber, setRntNumber] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    const formData = {
      email,
      password,
      confirmPassword,
      fullName,
      role,
      subRole: subRole === '' ? undefined : subRole,
      rntNumber: rntNumber || undefined,
    };

    const validation = signUpSchema.safeParse(formData);
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        fullName: formatted.fullName?._errors[0] || '',
        email: formatted.email?._errors[0] || '',
        password: formatted.password?._errors[0] || '',
        confirmPassword: formatted.confirmPassword?._errors[0] || '',
        role: formatted.role?._errors[0] || '',
      });
      return;
    }

    const res = await signUp(formData);
    if (res.success) {
      const targetPath = role ? `/${role}` : '/usuario';
      navigate(targetPath, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="max-w-lg w-full p-8 rounded-3xl bg-slate-800/60 border border-slate-700/60 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <Link to="/login" className="inline-flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Compass className="w-6 h-6 text-slate-950" />
              </div>
            </Link>
            <h2 className="text-2xl font-bold text-slate-100">Registro de Nuevo Usuario</h2>
            <p className="text-xs text-slate-400">
              Por defecto tu cuenta tendrá el rol de <strong className="text-teal-400">Usuario</strong>. Puedes seleccionar otro rol si aplica.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">Nombre Completo</label>
              <input
                type="text"
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-400 transition"
              />
              {fieldErrors.fullName && <p className="text-[11px] text-red-400 font-medium">{fieldErrors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">Correo Electrónico</label>
              <input
                type="email"
                placeholder="correo@ejemplo.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-400 transition"
              />
              {fieldErrors.email && <p className="text-[11px] text-red-400 font-medium">{fieldErrors.email}</p>}
            </div>

            {/* Seleccionar Rol del Sistema (Por defecto: usuario) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">Rol a Solicitar / Asignar</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-400 transition"
              >
                {(Object.values(UserRoleEnum) as UserRole[]).map((roleValue) => (
                  <option key={roleValue} value={roleValue}>
                    {ROLE_METADATA[roleValue].label} ({roleValue})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 italic mt-1">
                {ROLE_METADATA[role].description}
              </p>
            </div>

            {/* Sub-rol opcional si es Prestador Turístico */}
            {role === UserRoleEnum.PRESTADOR_TURISTICO && (
              <div className="space-y-3 p-4 rounded-2xl bg-teal-950/30 border border-teal-800/40">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-teal-300">Sub-tipo de Servicio Turístico</label>
                  <select
                    value={subRole}
                    onChange={(e) => setSubRole(e.target.value as PrestadorSubRole)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-900/90 border border-teal-700/50 text-slate-100 text-sm"
                  >
                    <option value="">Selecciona tipo de servicio...</option>
                    <option value="alojamiento">Alojamiento / Hotel</option>
                    <option value="gastronomia">Gastronomía / Restaurante</option>
                    <option value="agencia_viajes">Agencia de Viajes</option>
                    <option value="transporte">Transporte Turístico</option>
                    <option value="guia">Guía Oficial de Turismo</option>
                    <option value="artesania">Artesanías & Souvenirs</option>
                    <option value="entretenimiento">Entretenimiento & Experiencias</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-teal-300">Registro Nacional de Turismo (RNT)</label>
                  <input
                    type="text"
                    placeholder="Ej. RNT-74839-MINCIT"
                    value={rntNumber}
                    onChange={(e) => setRntNumber(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-900/90 border border-teal-700/50 text-slate-100 text-sm placeholder-slate-500"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-400 transition"
                />
                {fieldErrors.password && <p className="text-[11px] text-red-400 font-medium">{fieldErrors.password}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Confirmar Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-teal-400 transition"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-red-400 font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Registrando usuario...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Crear Cuenta
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-teal-400 font-semibold hover:underline">
                Volver a Iniciar Sesión
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SignUp;
