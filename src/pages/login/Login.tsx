import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { loginSchema } from '../../types/auth.types';
import { Footer } from '../../Footer';
import { Compass, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmail, profile, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

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
      const targetPath = from || (profile?.role ? `/${profile.role}` : '/usuario');
      navigate(targetPath, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-800/60 border border-slate-700/60 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 mb-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Compass className="w-7 h-7 text-slate-950" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Turismo Cajamarca</h2>
            <p className="text-xs text-slate-400">Inicia sesión con tu cuenta de usuario</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">Correo Electrónico</label>
              <input
                type="email"
                placeholder="usuario@turismocajamarca.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition"
              />
              {fieldErrors.email && <p className="text-[11px] text-red-400 font-medium">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition"
              />
              {fieldErrors.password && <p className="text-[11px] text-red-400 font-medium">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
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

          <div className="text-center pt-2 border-t border-slate-700/50">
            <p className="text-xs text-slate-400">
              ¿No tienes cuenta?{' '}
              <Link to="/signup" className="text-teal-400 font-semibold hover:underline">
                Registrarse aquí (Rol Usuario)
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
