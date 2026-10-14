import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { loginSchema } from '../../types/auth.types';
import { getDefaultRoleRoute } from '../../utils/roleRouting';
import { getPlatformLogo } from '../../utils/getPlatformLogo';
import { Footer } from '../../Footer';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmail, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [logoPath] = useState<string>(() => getPlatformLogo());

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    const res = await loginWithEmail({ email, password });
    if (res.success) {
      const currentProfile = res.profile || useAuthStore.getState().profile;
      const defaultRolePath = getDefaultRoleRoute(currentProfile?.roles);
      const targetPath = from
        && from.startsWith('/')
        && !from.startsWith('/login')
        && !from.startsWith('/signup')
        && !from.startsWith('/unauthorized')
        ? from
        : defaultRolePath;
      navigate(targetPath, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center mb-1">
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
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Turismo Cajamarca</h2>
            <p className="text-xs text-[var(--text-secondary)]">Inicia sesión con tu cuenta de usuario</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="login-email" className="block text-xs font-semibold text-[var(--text-secondary)]">Correo Electrónico</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                  placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)] transition"
              />
              {fieldErrors.email && <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="login-password" className="block text-xs font-semibold text-[var(--text-secondary)]">Contraseña</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] focus:ring-1 focus:ring-[var(--color-primary-light)] transition"
              />
              {fieldErrors.password && <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-contrast)] font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Entrar
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[var(--border-light)]">
            <p className="text-xs text-[var(--text-secondary)]">
              ¿No tienes cuenta?{' '}
              <Link to="/signup" className="text-[var(--color-primary-light)] font-semibold hover:underline">
                Registrarse aquí como turista
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;
