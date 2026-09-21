import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../context/useAuthStore';
import { signUpSchema } from '../../types/auth.types';
import { getPlatformLogo } from '../../utils/getPlatformLogo';
import { Footer } from '../../Footer';
import {
  UserPlus,
  AlertCircle,
  Loader2,
  Sparkles,
  Compass,
  Phone,
  Globe,
  Shield,
  HeartHandshake,
} from 'lucide-react';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, loading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentType, setDocumentType] = useState<'DNI' | 'RUC' | 'PASAPORTE' | 'CE'>('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('Colombia');
  const [nationality, setNationality] = useState('Colombiana');
  const [preferredLanguage, setPreferredLanguage] = useState('es');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logoPath] = useState<string>(() => getPlatformLogo());

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      countryOfOrigin: countryOfOrigin || undefined,
      nationality: nationality || undefined,
      preferredLanguage,
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactPhone: emergencyContactPhone || undefined,
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

    const res = await signUp(formData);
    if (res.success && res.requiresEmailConfirmation) {
      setRequiresEmailConfirmation(true);
    } else if (res.success) {
      navigate('/turista', { replace: true });
    }
  };

  if (requiresEmailConfirmation) return <div className="flex min-h-screen flex-col justify-between bg-[var(--bg-primary)] text-[var(--text-primary)]"><main className="flex flex-1 items-center justify-center p-5 sm:p-8"><section className="w-full max-w-md space-y-4 rounded-3xl border border-emerald-500/30 bg-[var(--bg-secondary)] p-6 text-center shadow-2xl"><h1 className="my-0 text-2xl font-bold">Cuenta creada</h1><p className="text-sm text-[var(--text-secondary)]">Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.</p><Link to="/login" className="inline-flex rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-white">Ir a iniciar sesión</Link></section></main><Footer /></div>;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="max-w-xl w-full p-5 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-2xl space-y-6">
          {/* Header */}
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

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary-light)] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Registro de Perfil Turístico</span>
            </div>

            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              ¡Bienvenido, Turista!
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
              Para personalizar tu viaje, sugerirte las mejores rutas y brindarte asistencia en Cajamarca, por favor completa tus datos de registro:
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Sección 1: Datos Personales */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-[var(--color-primary-light)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-light)] pb-1.5">
                <Shield className="w-3.5 h-3.5" /> Información Personal
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="signup-full-name" className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre Completo *</label>
                  <input
                    id="signup-full-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Ej. María García"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  />
                  {fieldErrors.fullName && <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.fullName}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="signup-email" className="block text-xs font-semibold text-[var(--text-secondary)]">Correo Electrónico *</label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="turista@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  />
                  {fieldErrors.email && <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="signup-phone" className="block text-xs font-semibold text-[var(--text-secondary)]">Teléfono / WhatsApp</label>
                  <div className="relative">
                    <input
                      id="signup-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Ingresa tu número"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                    />
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-3 text-[var(--text-muted)]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="signup-document-type" className="block text-xs font-semibold text-[var(--text-secondary)]">Tipo Documento</label>
                  <select
                    id="signup-document-type"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as 'DNI' | 'RUC' | 'PASAPORTE' | 'CE')}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  >
                    <option value="DNI">Cédula de ciudadanía</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="CE">Cédula de extranjería</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="signup-document-number" className="block text-xs font-semibold text-[var(--text-secondary)]">N° Documento</label>
                  <input
                    id="signup-document-number"
                    type="text"
                    placeholder="72849301"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Origen e Idioma */}
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-bold text-[var(--color-primary-light)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-light)] pb-1.5">
                <Globe className="w-3.5 h-3.5" /> Procedencia & Preferencias
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="signup-country" className="block text-xs font-semibold text-[var(--text-secondary)]">País de Origen</label>
                  <input
                    id="signup-country"
                    type="text"
                    placeholder="Ej. Colombia"
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="signup-nationality" className="block text-xs font-semibold text-[var(--text-secondary)]">Nacionalidad</label>
                  <input
                    id="signup-nationality"
                    type="text"
                    placeholder="Ej. Colombiana"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="signup-language" className="block text-xs font-semibold text-[var(--text-secondary)]">Idioma Principal</label>
                  <select
                    id="signup-language"
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="qu">Quechua</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección 3: Contacto de Emergencia (Opcional para seguridad del turista) */}
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-bold text-[var(--color-primary-light)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-light)] pb-1.5">
                <HeartHandshake className="w-3.5 h-3.5" /> Contacto de Emergencia <span className="text-[10px] normal-case text-[var(--text-muted)] font-normal">(Opcional)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="signup-emergency-name" className="block text-xs font-semibold text-[var(--text-secondary)]">Contacto de Emergencia</label>
                  <input
                    id="signup-emergency-name"
                    type="text"
                    placeholder="Ej. Carlos García (Padre)"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="signup-emergency-phone" className="block text-xs font-semibold text-[var(--text-secondary)]">Teléfono de Emergencia</label>
                  <input
                    id="signup-emergency-phone"
                    type="tel"
                      placeholder="Número de emergencia"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  />
                </div>
              </div>
            </div>

            {/* Sección 4: Contraseñas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-[var(--border-light)]">
              <div className="space-y-1">
                <label htmlFor="signup-password" className="block text-xs font-semibold text-[var(--text-secondary)]">Contraseña *</label>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                />
                {fieldErrors.password && <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.password}</p>}
                <p className="text-[11px] text-[var(--text-muted)]">Mínimo 6 caracteres.</p>
              </div>

              <div className="space-y-1">
                <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-[var(--text-secondary)]">Confirmar Contraseña *</label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-[var(--color-danger)] font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-contrast)] font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Registrando turista...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Crear Perfil de Turista
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[var(--border-light)] space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
              <Compass className="w-3.5 h-3.5 text-[var(--color-primary-light)]" />
              <span>Accede a mapas, eventos, atractivos e itinerarios de Cajamarca</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-[var(--color-primary-light)] font-semibold hover:underline">
                Iniciar Sesión
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
