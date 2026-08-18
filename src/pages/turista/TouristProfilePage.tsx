import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import {
  User,
  Shield,
  Globe,
  HeartHandshake,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Edit3,
  FileText,
  Sparkles,
} from 'lucide-react';

export const TouristProfilePage: React.FC = () => {
  const { user, profile, updateProfile, loading } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados locales para edición
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [documentType, setDocumentType] = useState<'DNI' | 'RUC' | 'PASAPORTE' | 'CE'>('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [nationality, setNationality] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('es');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Sincronizar estados locales con el perfil del store
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setDocumentType((profile.document_type as 'DNI' | 'RUC' | 'PASAPORTE' | 'CE') || 'DNI');
      setDocumentNumber(profile.document_number || '');
      setCountryOfOrigin(profile.country_of_origin || 'Colombia');
      setNationality(profile.nationality || 'Colombiana');
      setPreferredLanguage(profile.preferred_language || 'es');
      setEmergencyContactName(profile.emergency_contact_name || '');
      setEmergencyContactPhone(profile.emergency_contact_phone || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const result = await updateProfile({
      full_name: fullName,
      phone,
      document_type: documentType,
      document_number: documentNumber,
      country_of_origin: countryOfOrigin,
      nationality,
      preferred_language: preferredLanguage,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
    });

    if (result.success) {
      setSuccessMessage('¡Tus datos de usuario han sido actualizados exitosamente en la base de datos!');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(result.error || 'Ocurrió un error al actualizar tus datos.');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE BIENVENIDA AL PERFIL */}
      <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/20 border border-[var(--color-primary-light)]/40 flex items-center justify-center text-[var(--color-primary-light)] font-bold text-2xl shadow-inner">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)] my-0">
                {profile?.full_name || 'Usuario Turista'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/15 border border-[var(--color-primary-light)]/30 text-[var(--color-primary-light)] text-[11px] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Turista
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            isEditing
              ? 'bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-contrast)] shadow-lg shadow-[var(--color-primary)]/20'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          {isEditing ? 'Cancelar Edición' : 'Modificar Datos'}
        </button>
      </div>

      {/* ALERTAS DE ÉXITO O ERROR */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 shadow-md">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* FORMULARIO DE DATOS DE USUARIO */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* SECCIÓN 1: DATOS PERSONALES DE CUENTA */}
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-primary-light)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-light)] pb-2">
            <Shield className="w-4 h-4" /> Información Personal de Cuenta
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre Completo</label>
              {isEditing ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  required
                />
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] font-medium">
                  {profile?.full_name || 'No especificado'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Correo Electrónico (No modificable)</label>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)]/60 border border-[var(--border-light)] text-sm text-[var(--text-muted)] font-mono">
                {user?.email}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Teléfono / WhatsApp</label>
              {isEditing ? (
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                    placeholder="+57 3107613371"
                  />
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[var(--color-primary-light)]" />
                  <span>{profile?.phone || 'No registrado'}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Tipo de Documento</label>
              {isEditing ? (
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as 'DNI' | 'RUC' | 'PASAPORTE' | 'CE')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                >
                  <option value="DNI">CC / DNI</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="CE">Carnet Extranjería</option>
                  <option value="RUC">RUC</option>
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-primary-light)]" />
                  <span>{profile?.document_type || 'DNI'}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">N° de Documento</label>
              {isEditing ? (
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  placeholder="1234444333"
                />
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] font-mono">
                  {profile?.document_number || 'No especificado'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: PROCEDENCIA Y PREFERENCIAS DEL TURISTA */}
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-primary-light)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-light)] pb-2">
            <Globe className="w-4 h-4" /> Procedencia & Idioma
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">País de Origen</label>
              {isEditing ? (
                <input
                  type="text"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  placeholder="Colombia"
                />
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)]">
                  {profile?.country_of_origin || 'Colombia'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nacionalidad</label>
              {isEditing ? (
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  placeholder="Colombiana"
                />
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)]">
                  {profile?.nationality || 'Colombiana'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Idioma Principal</label>
              {isEditing ? (
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="qu">Quechua</option>
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)]">
                  {profile?.preferred_language === 'en'
                    ? 'English'
                    : profile?.preferred_language === 'fr'
                    ? 'Français'
                    : profile?.preferred_language === 'de'
                    ? 'Deutsch'
                    : profile?.preferred_language === 'qu'
                    ? 'Quechua'
                    : 'Español'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: CONTACTO DE EMERGENCIA */}
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-primary-light)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--border-light)] pb-2">
            <HeartHandshake className="w-4 h-4" /> Contacto de Emergencia
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre del Contacto</label>
              {isEditing ? (
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  placeholder="Ej. Carlos García (Padre)"
                />
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)]">
                  {profile?.emergency_contact_name || 'No especificado'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Teléfono de Emergencia</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--color-primary-light)] transition"
                  placeholder="+57 3123456789"
                />
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)]">
                  {profile?.emergency_contact_phone || 'No especificado'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTÓN GUARDAR CAMBIOS CUANDO ESTÁ EN EDICIÓN */}
        {isEditing && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-sm transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-primary-contrast)] font-bold text-sm shadow-xl shadow-[var(--color-primary)]/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando cambios...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Guardar Cambios
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default TouristProfilePage;
