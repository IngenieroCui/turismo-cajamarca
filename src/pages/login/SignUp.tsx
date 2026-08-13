import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import {
  UserRoleEnum,
  signUpSchema,
  ROLE_METADATA,
} from '../../types/auth.types';
import type { UserRole, PrestadorSubRole } from '../../types/auth.types';
import { getPlatformLogo } from '../../utils/getPlatformLogo';
import { Footer } from '../../Footer';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, loading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRoleEnum.USUARIO);
  const [subRole, setSubRole] = useState<PrestadorSubRole | ''>('');
  const [rntNumber, setRntNumber] = useState('');
  const [logoPath, setLogoPath] = useState<string>('/web/icon-192.png');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLogoPath(getPlatformLogo());
  }, []);

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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="max-w-lg w-full p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <Link to="/login" className="inline-flex items-center justify-center mb-1">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-transparent flex items-center justify-center shadow-lg border border-[var(--border-light)] p-1">
                <img
                  src={logoPath}
                  alt="Turismo Cajamarca Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/web/icon-192.png';
                  }}
                />
              </div>
            </Link>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Registro de Nuevo Usuario</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Por defecto tu cuenta tendrá el rol de <strong className="text-[var(--color-primary-light)]">Usuario</strong>. Puedes seleccionar otro rol si aplica.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre Completo</label>
              <input
                type="text"
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)] transition"
              />
              {fieldErrors.fullName && <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Correo Electrónico</label>
              <input
                type="email"
                placeholder="correo@ejemplo.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)] transition"
              />
              {fieldErrors.email && <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.email}</p>}
            </div>

            {/* Seleccionar Rol del Sistema (Por defecto: usuario) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Rol a Solicitar / Asignar</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)] transition"
              >
                {(Object.values(UserRoleEnum) as UserRole[]).map((roleValue) => (
                  <option key={roleValue} value={roleValue}>
                    {ROLE_METADATA[roleValue].label} ({roleValue})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-secondary)] italic mt-1">
                {ROLE_METADATA[role].description}
              </p>
            </div>

            {/* Sub-rol opcional si es Prestador Turístico */}
            {role === UserRoleEnum.PRESTADOR_TURISTICO && (
              <div className="space-y-3 p-4 rounded-2xl bg-[var(--color-primary-dark)]/30 border border-[var(--color-primary)]/40">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--color-primary-light)]">Sub-tipo de Servicio Turístico</label>
                  <select
                    value={subRole}
                    onChange={(e) => setSubRole(e.target.value as PrestadorSubRole)}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--color-primary)]/50 text-[var(--text-primary)] text-sm"
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
                  <label className="block text-xs font-semibold text-[var(--color-primary-light)]">Registro Nacional de Turismo (RNT)</label>
                  <input
                    type="text"
                    placeholder="Ej. RNT-74839-MINCIT"
                    value={rntNumber}
                    onChange={(e) => setRntNumber(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--color-primary)]/50 text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)] transition"
                />
                {fieldErrors.password && <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.password}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Confirmar Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)] transition"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-contrast)] font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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

          <div className="text-center pt-2 border-t border-[var(--border-light)]">
            <p className="text-xs text-[var(--text-secondary)]">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-[var(--color-primary-light)] font-semibold hover:underline">
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
