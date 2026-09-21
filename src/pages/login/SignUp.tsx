import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { signUpSchema } from '../../types/auth.types';
import { getPlatformLogo } from '../../utils/getPlatformLogo';
import { getDefaultRoleRoute } from '../../utils/roleRouting';
import { Footer } from '../../Footer';
import { AlertCircle, FileText, Loader2, Shield, UserPlus } from 'lucide-react';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, loading, error, clearError } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentType, setDocumentType] = useState<'DNI' | 'RUC' | 'PASAPORTE' | 'CE'>('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logoPath] = useState<string>(() => getPlatformLogo());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setFieldErrors({});

    const formData = {
      email,
      password,
      confirmPassword,
      fullName,
      phone: phone || undefined,
      documentType,
      documentNumber: documentNumber || undefined,
    };
    const validation = signUpSchema.safeParse(formData);
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        fullName: formatted.fullName?._errors[0] || '',
        email: formatted.email?._errors[0] || '',
        password: formatted.password?._errors[0] || '',
        confirmPassword: formatted.confirmPassword?._errors[0] || '',
      });
      return;
    }

    const result = await signUp(formData);
    if (result.success && result.requiresEmailConfirmation) {
      setRequiresEmailConfirmation(true);
    } else if (result.success) {
      navigate(getDefaultRoleRoute(useAuthStore.getState().profile?.roles), { replace: true });
    }
  };

  if (requiresEmailConfirmation) {
    return (
      <div className="flex min-h-screen flex-col justify-between bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <main className="flex flex-1 items-center justify-center p-5 sm:p-8">
          <section className="w-full max-w-md space-y-4 rounded-3xl border border-emerald-500/30 bg-[var(--bg-secondary)] p-6 text-center shadow-2xl">
            <h1 className="my-0 text-2xl font-bold">Cuenta creada</h1>
            <p className="text-sm text-[var(--text-secondary)]">Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.</p>
            <Link to="/login" className="inline-flex rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-white">Ir a iniciar sesión</Link>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="flex flex-1 items-center justify-center p-4 py-8">
        <section className="w-full max-w-xl space-y-6 rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-5 shadow-2xl sm:p-8">
          <div className="space-y-3 text-center">
            <Link to="/login" className="mb-1 inline-flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-light)] bg-transparent p-1 shadow-lg">
                <img src={logoPath} alt="Turismo Cajamarca Logo" className="h-full w-full object-contain" onError={(event) => { (event.target as HTMLImageElement).src = '/web/icon-192.png'; }} />
              </div>
            </Link>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-primary-light)]">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cuenta base de la plataforma</span>
            </div>
            <h1 className="my-0 text-2xl font-bold tracking-tight">Crear cuenta</h1>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-[var(--text-secondary)]">Comienza con una cuenta base. Un administrador podrá asignarte roles adicionales cuando corresponda.</p>
          </div>

          {error && <div className="flex items-center gap-2 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3.5 text-xs text-red-400" role="alert"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{error}</span></div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <h2 className="flex items-center gap-1.5 border-b border-[var(--border-light)] pb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-light)]"><Shield className="h-3.5 w-3.5" aria-hidden="true" />Información personal</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="signup-full-name" className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre completo *</label>
                  <input id="signup-full-name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary-light)] focus:outline-none" />
                  {fieldErrors.fullName && <p className="text-[11px] text-[var(--color-danger)]">{fieldErrors.fullName}</p>}
                </div>
                <div className="space-y-1">
                  <label htmlFor="signup-email" className="block text-xs font-semibold text-[var(--text-secondary)]">Correo electrónico *</label>
                  <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary-light)] focus:outline-none" />
                  {fieldErrors.email && <p className="text-[11px] text-[var(--color-danger)]">{fieldErrors.email}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="signup-phone" className="block text-xs font-semibold text-[var(--text-secondary)]">Teléfono</label>
                  <input id="signup-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary-light)] focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="signup-document-type" className="block text-xs font-semibold text-[var(--text-secondary)]">Tipo de documento</label>
                  <select id="signup-document-type" value={documentType} onChange={(event) => setDocumentType(event.target.value as typeof documentType)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary-light)] focus:outline-none">
                    <option value="DNI">Cédula de ciudadanía</option><option value="PASAPORTE">Pasaporte</option><option value="CE">Cédula de extranjería</option><option value="RUC">NIT</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="signup-document-number" className="block text-xs font-semibold text-[var(--text-secondary)]">Número de documento</label>
                  <div className="relative"><FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" /><input id="signup-document-number" type="text" value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] py-2 pl-8 pr-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary-light)] focus:outline-none" /></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-light)] pt-3 md:grid-cols-2">
              <div className="space-y-1"><label htmlFor="signup-password" className="block text-xs font-semibold text-[var(--text-secondary)]">Contraseña *</label><input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary-light)] focus:outline-none" />{fieldErrors.password && <p className="text-[11px] text-[var(--color-danger)]">{fieldErrors.password}</p>}<p className="text-[11px] text-[var(--text-muted)]">Mínimo 6 caracteres.</p></div>
              <div className="space-y-1"><label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-[var(--text-secondary)]">Confirmar contraseña *</label><input id="signup-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary-light)] focus:outline-none" />{fieldErrors.confirmPassword && <p className="text-[11px] text-[var(--color-danger)]">{fieldErrors.confirmPassword}</p>}</div>
            </div>

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-[var(--color-primary-contrast)] shadow-lg shadow-[var(--color-primary)]/20 transition disabled:opacity-50">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Creando cuenta...</> : <><UserPlus className="h-4 w-4" aria-hidden="true" /> Crear cuenta</>}
            </button>
          </form>

          <p className="border-t border-[var(--border-light)] pt-3 text-center text-xs text-[var(--text-secondary)]">¿Ya tienes una cuenta? <Link to="/login" className="font-semibold text-[var(--color-primary-light)] hover:underline">Iniciar sesión</Link></p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SignUp;
