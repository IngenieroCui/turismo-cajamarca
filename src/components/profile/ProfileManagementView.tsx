import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import ConfirmDialog from '../ui/ConfirmDialog';
import { ROLE_METADATA, type UserRole } from '../../types/auth.types';
import { cancelAccountDeletion, downloadMyDataJson, getMyDeletionRequest, requestAccountDeletion } from '../../services/privacyService';
import type { AccountDeletionRequest } from '../../types/privacy.types';
import { getUserFullRoleProfile, updateUserRoleProfile } from '../../services/profileService';
import { isDashboardRole } from '../../utils/roleRouting';
import WorkspaceSection from '../workspace/WorkspaceSection';
import {
  User,
  Mail,
  Phone,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles
} from 'lucide-react';

const neutralRoleMeta = {
  label: 'Cuenta',
  description: 'Perfil de cuenta sin persona operativa asignada.',
  badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
};

export const ProfileManagementView: React.FC = () => {
  const { user, profile, fetchProfile, activeRole } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);
  const [deletionConfirmOpen, setDeletionConfirmOpen] = useState(false);

  // Campos Base
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [docType, setDocType] = useState<'DNI' | 'RUC' | 'PASAPORTE' | 'CE'>('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [subRole, setSubRole] = useState('');
  const [orgRole, setOrgRole] = useState('dueno');
  const [rntNumber, setRntNumber] = useState('');

  // Campos Específicos por Rol
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [nationality, setNationality] = useState('');
  const [preferredLang, setPreferredLang] = useState('es');
  const [emergName, setEmergName] = useState('');
  const [emergPhone, setEmergPhone] = useState('');

  // Prestador
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Moderador
  const [specialtyArea, setSpecialtyArea] = useState('General');
  const [moderationLevel, setModerationLevel] = useState('Junior');
  const [dailyQuota, setDailyQuota] = useState(50);

  // Auditor
  const [auditCertId, setAuditCertId] = useState('');
  const [institutionalScope, setInstitutionalScope] = useState('Regional');
  const [clearanceLevel, setClearanceLevel] = useState('Nivel 2');

  // Soporte
  const [supportLevel, setSupportLevel] = useState('Nivel 1');
  const [assignedQueue, setAssignedQueue] = useState('Atencion General');
  const [maxRefundLimit, setMaxRefundLimit] = useState(500);

  // Analista
  const [biTool, setBiTool] = useState('Metabase');
  const [datasetScope, setDatasetScope] = useState('Datos Agregados');

  // DevOps
  const [gitHandle, setGitHandle] = useState('');
  const [envAccess, setEnvAccess] = useState('Staging');

  // IA
  const [serviceName, setServiceName] = useState('Motor de recomendaciones determinísticas');
  const [modelVersion, setModelVersion] = useState('rules-v1');

  // Regulador
  const [institutionalId, setInstitutionalId] = useState('');

  // Afiliado
  const [referralCode, setReferralCode] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'nequi' | 'daviplata' | 'transferencia' | 'yape' | 'plin' | 'cci'>('transferencia');

  const routedRoles = profile?.roles.filter(
    (role) => role.is_active && !role.is_system && isDashboardRole(role.code),
  ) || [];
  const activeRoutedRole = routedRoles.find((role) => role.code === activeRole);
  const primaryRoutedRole = routedRoles.find((role) => role.is_primary);
  const currentRole = (activeRoutedRole || primaryRoutedRole || routedRoles[0])?.code as UserRole | undefined;
  const roleMeta = currentRole ? ROLE_METADATA[currentRole] : neutralRoleMeta;
  const specializedReadOnly = currentRole !== undefined
    && ['moderador', 'auditor', 'soporte', 'analista_datos', 'desarrollador', 'funcionario_mincit', 'camara_comercio', 'servicios_ia'].includes(currentRole);

  const loadProfileData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const fullProfile = currentRole ? await getUserFullRoleProfile(user.id, currentRole) : null;
    const activeData = fullProfile || profile;

    if (activeData) {
      setFullName(activeData.full_name || '');
      setPhone(activeData.phone || '');
      setDocType(activeData.document_type || 'DNI');
      setDocNumber(activeData.document_number || '');
      setSubRole(activeData.sub_role || '');
      setOrgRole(activeData.org_role || 'dueno');
      setRntNumber(activeData.rnt_number || '');

      setCountryOfOrigin(activeData.country_of_origin || 'Colombia');
      setNationality(activeData.nationality || 'Colombiana');
      setPreferredLang(activeData.preferred_language || 'es');
      setEmergName(activeData.emergency_contact_name || '');
      setEmergPhone(activeData.emergency_contact_phone || '');

      setRuc(activeData.ruc || '');
      setRazonSocial(activeData.razon_social || '');
      setNombreComercial(activeData.nombre_comercial || '');
      setAddress(activeData.address || '');
      setWebsiteUrl(activeData.website_url || '');

      setSpecialtyArea(activeData.specialty_area || 'General');
      setModerationLevel(activeData.moderation_level || 'Junior');
      setDailyQuota(activeData.daily_quota || 50);

      setAuditCertId(activeData.audit_certification_id || '');
      setInstitutionalScope(activeData.institutional_scope || 'Regional');
      setClearanceLevel(activeData.security_clearance_level || 'Nivel 2');

      setSupportLevel(activeData.support_level || 'Nivel 1');
      setAssignedQueue(activeData.assigned_queue || 'Atencion General');
      setMaxRefundLimit(activeData.max_refund_limit || 500);

      setBiTool(activeData.bi_tool || 'Metabase');
      setDatasetScope(activeData.dataset_access_scope || 'Datos Agregados');

      setGitHandle(activeData.git_handle || '');
      setEnvAccess(activeData.environment_access || 'Staging');

      setServiceName(activeData.service_name || 'Motor de recomendaciones determinísticas');
      setModelVersion(activeData.model_version || 'rules-v1');

      setInstitutionalId(activeData.institutional_id || '');

      setReferralCode(activeData.referral_code || '');
      const storedPayout = activeData.payout_method;
      setPayoutMethod(storedPayout === 'yape' ? 'nequi' : storedPayout === 'plin' ? 'daviplata' : storedPayout === 'cci' ? 'transferencia' : storedPayout || 'transferencia');
    }
    setLoading(false);
  };

  useEffect(() => {
    void Promise.resolve().then(loadProfileData);
  // La función se mantiene estable por el cambio de rol; incluirla aquí provocaría una recarga tras cada fetchProfile.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currentRole]);

  useEffect(() => { if (user) void getMyDeletionRequest().then(setDeletionRequest).catch(() => undefined); }, [user]);

  const exportData = async () => { try { await downloadMyDataJson(); setStatusMessage({ type: 'success', text: 'Se descargó una copia JSON de tus datos.' }); } catch (error: unknown) { setStatusMessage({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible exportar tus datos.' }); } };
  const requestDeletion = async () => { try { await requestAccountDeletion(); setDeletionRequest(await getMyDeletionRequest()); setStatusMessage({ type: 'success', text: 'Solicitud de eliminación creada para revisión.' }); } catch (error: unknown) { setStatusMessage({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible crear la solicitud.' }); } };
  const cancelDeletion = async () => { try { await cancelAccountDeletion(); setDeletionRequest(null); setStatusMessage({ type: 'success', text: 'Solicitud cancelada.' }); } catch (error: unknown) { setStatusMessage({ type: 'error', text: error instanceof Error ? error.message : 'No fue posible cancelar la solicitud.' }); } };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setStatusMessage(null);

    // Preparar objeto de campos específicos según el rol
    const specificFields: Record<string, unknown> = {};

    if (currentRole === 'turista') {
      specificFields.country_of_origin = countryOfOrigin;
      specificFields.nationality = nationality;
      specificFields.preferred_language = preferredLang;
      specificFields.emergency_contact_name = emergName;
      specificFields.emergency_contact_phone = emergPhone;
    } else if (currentRole === 'prestador_turistico') {
      specificFields.ruc = ruc;
      specificFields.razon_social = razonSocial;
      specificFields.nombre_comercial = nombreComercial;
      specificFields.address = address;
      specificFields.website_url = websiteUrl;
    } else if (currentRole === 'moderador') {
      specificFields.specialty_area = specialtyArea;
      specificFields.moderation_level = moderationLevel;
      specificFields.daily_quota = dailyQuota;
    } else if (currentRole === 'auditor') {
      specificFields.audit_certification_id = auditCertId;
      specificFields.institutional_scope = institutionalScope;
      specificFields.security_clearance_level = clearanceLevel;
    } else if (currentRole === 'soporte') {
      specificFields.support_level = supportLevel;
      specificFields.assigned_queue = assignedQueue;
      specificFields.max_refund_limit = maxRefundLimit;
    } else if (currentRole === 'analista_datos') {
      specificFields.bi_tool = biTool;
      specificFields.dataset_access_scope = datasetScope;
    } else if (currentRole === 'desarrollador') {
      specificFields.git_handle = gitHandle;
      specificFields.environment_access = envAccess;
    } else if (currentRole === 'servicios_ia') {
      specificFields.service_name = serviceName;
      specificFields.model_version = modelVersion;
    } else if (currentRole === 'funcionario_mincit' || currentRole === 'camara_comercio') {
      specificFields.institutional_id = institutionalId;
    } else if (currentRole === 'embajador' || currentRole === 'afiliado') {
      specificFields.referral_code = referralCode;
      specificFields.payout_method = payoutMethod;
    }

    const res = await updateUserRoleProfile(
      user.id,
      currentRole || null,
      {
        full_name: fullName,
        phone,
        document_type: docType,
        document_number: docNumber,
        sub_role: subRole,
        org_role: orgRole,
        rnt_number: rntNumber,
      },
      specificFields
    );

    if (res.success) {
      setStatusMessage({ type: 'success', text: '¡Perfil actualizado exitosamente en Supabase!' });
      await fetchProfile(user.id);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Error al guardar los cambios.' });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* HEADER DE MI PERFIL */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl">
            {fullName ? fullName.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-purple-300">Mi cuenta</p>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] my-0">
                {fullName || 'Mi Perfil'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleMeta.badgeColor}`}>
                {roleMeta.label}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5 font-mono">
              <Mail className="w-3.5 h-3.5 text-purple-400" /> {user?.email}
            </p>
          </div>
        </div>
      </div>

      <WorkspaceSection title="Contexto de cuenta" description={currentRole ? 'Tu cuenta puede tener m\u00e1s de un rol; el formulario se adapta al panel activo.' : 'No hay un panel operativo asignado; aqu\u00ed se muestran los datos generales de la cuenta.'}><div className="flex flex-wrap gap-1.5">{profile?.roles.filter((role) => role.is_active && role.code !== 'usuario').map((role) => <span key={role.id} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${role.badge_color}`}>{role.name}{role.code === currentRole ? ' · Activo' : ''}</span>)}</div></WorkspaceSection>

      {/* NOTIFICACIÓN FLASH */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between transition ${statusMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* FORMULARIO DE EDICIÓN */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* SECCIÓN 1: DATOS DE CUENTA Y GENERALES */}
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] my-0 flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
            <User className="w-4 h-4 text-purple-400" />
            <span>Información General y de Cuenta</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CORREO ELECTRÓNICO (BLOQUEADO / NO EDITABLE) */}
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="profile-email" className="block text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                <span>Correo Electrónico (Identificador Único)</span>
                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> No Editable
                </span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  id="profile-email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  readOnly
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)]/50 border border-[var(--border-light)] text-[var(--text-muted)] text-xs font-mono cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* NOMBRE COMPLETO */}
            <div className="space-y-1">
              <label htmlFor="profile-full-name" className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre Completo *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  id="profile-full-name"
                  type="text"
                  placeholder="ej. Juan Perez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                  required
                />
              </div>
            </div>

            {/* TELÉFONO DE CONTACTO */}
            <div className="space-y-1">
              <label htmlFor="profile-phone" className="block text-xs font-semibold text-[var(--text-secondary)]">Teléfono de Contacto</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  id="profile-phone"
                  type="text"
                  placeholder="Ingresa tu número"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>

            {/* TIPO DE DOCUMENTO */}
            <div className="space-y-1">
              <label htmlFor="profile-document-type" className="block text-xs font-semibold text-[var(--text-secondary)]">Tipo de Documento</label>
              <select
                id="profile-document-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value as 'DNI' | 'RUC' | 'PASAPORTE' | 'CE')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition cursor-pointer"
              >
                <option value="DNI">Cédula de ciudadanía</option>
                <option value="RUC">NIT</option>
                <option value="PASAPORTE">Pasaporte Internacional</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
              </select>
            </div>

            {/* NÚMERO DE DOCUMENTO */}
            <div className="space-y-1">
              <label htmlFor="profile-document-number" className="block text-xs font-semibold text-[var(--text-secondary)]">Número de Documento</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  id="profile-document-number"
                  type="text"
                  placeholder="ej. 1012345678"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: DATOS ESPECÍFICOS DEL ROL */}
        <fieldset disabled={specializedReadOnly} className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4 disabled:opacity-80">
          <h3 className="text-base font-bold text-[var(--text-primary)] my-0 flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Perfil Específico: {roleMeta.label}</span>
          </h3>

          {/* DERECHO AUTOGESTIÓN TURISTA */}
          {currentRole === 'turista' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="profile-country" className="block text-xs font-semibold text-[var(--text-secondary)]">País de Origen</label>
                <input
                  id="profile-country"
                  type="text"
                  placeholder="ej. Colombia"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-nationality" className="block text-xs font-semibold text-[var(--text-secondary)]">Nacionalidad</label>
                <input
                  id="profile-nationality"
                  type="text"
                  placeholder="ej. Colombiana"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-language" className="block text-xs font-semibold text-[var(--text-secondary)]">Idioma Preferido</label>
                <select
                  id="profile-language"
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition cursor-pointer"
                >
                  <option value="es">Español (es)</option>
                  <option value="en">English (en)</option>
                  <option value="fr">Français (fr)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-emergency-name" className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre Contacto Emergencia</label>
                <input
                  id="profile-emergency-name"
                  type="text"
                  placeholder="ej. María Perez"
                  value={emergName}
                  onChange={(e) => setEmergName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="profile-emergency-phone" className="block text-xs font-semibold text-[var(--text-secondary)]">Teléfono Contacto Emergencia</label>
                <input
                  id="profile-emergency-phone"
                  type="text"
                  placeholder="Número de emergencia"
                  value={emergPhone}
                  onChange={(e) => setEmergPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>
          )}

          {/* DERECHO PRESTADOR TURÍSTICO */}
          {currentRole === 'prestador_turistico' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="profile-ruc" className="block text-xs font-semibold text-[var(--text-secondary)]">NIT Empresarial</label>
                <input
                  id="profile-ruc"
                  type="text"
                  placeholder="ej. 901234567-1"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-rnt" className="block text-xs font-semibold text-[var(--text-secondary)]">N° Registro RNT</label>
                <input
                  id="profile-rnt"
                  type="text"
                  placeholder="ej. RNT-12345"
                  value={rntNumber}
                  onChange={(e) => setRntNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-business-name" className="block text-xs font-semibold text-[var(--text-secondary)]">Razón Social</label>
                <input
                  id="profile-business-name"
                  type="text"
                  placeholder="ej. Hotel Los Pinos S.A.S."
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-trade-name" className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre Comercial</label>
                <input
                  id="profile-trade-name"
                  type="text"
                  placeholder="ej. Posada Campestre Los Pinos"
                  value={nombreComercial}
                  onChange={(e) => setNombreComercial(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="profile-service-address" className="block text-xs font-semibold text-[var(--text-secondary)]">Dirección Física del Servicio</label>
                <input
                  id="profile-service-address"
                  type="text"
                  placeholder="ej. Vereda Anaime Km 4, Cajamarca Tolima"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>
          )}

          {/* MODERADOR */}
          {currentRole === 'moderador' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="profile-specialty-area" className="block text-xs font-semibold text-[var(--text-secondary)]">Área de Especialidad</label>
                <input
                  id="profile-specialty-area"
                  type="text"
                  value={specialtyArea}
                  onChange={(e) => setSpecialtyArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-moderation-level" className="block text-xs font-semibold text-[var(--text-secondary)]">Nivel de Moderación</label>
                <select
                  id="profile-moderation-level"
                  value={moderationLevel}
                  onChange={(e) => setModerationLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition cursor-pointer"
                >
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead Moderador</option>
                </select>
              </div>
            </div>
          )}

          {/* AUDITOR */}
          {currentRole === 'auditor' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="profile-audit-cert" className="block text-xs font-semibold text-[var(--text-secondary)]">ID Certificación de Auditoría</label>
                <input
                  id="profile-audit-cert"
                  type="text"
                  placeholder="ej. AUD-2026-TOL"
                  value={auditCertId}
                  onChange={(e) => setAuditCertId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-institutional-scope" className="block text-xs font-semibold text-[var(--text-secondary)]">Alcance Institucional</label>
                <input
                  id="profile-institutional-scope"
                  type="text"
                  value={institutionalScope}
                  onChange={(e) => setInstitutionalScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>
          )}

          {/* SOPORTE */}
          {currentRole === 'soporte' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="profile-support-level" className="block text-xs font-semibold text-[var(--text-secondary)]">Nivel de Atención</label>
                <input
                  id="profile-support-level"
                  type="text"
                  value={supportLevel}
                  onChange={(e) => setSupportLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-assigned-queue" className="block text-xs font-semibold text-[var(--text-secondary)]">Cola Asignada</label>
                <input
                  id="profile-assigned-queue"
                  type="text"
                  value={assignedQueue}
                  onChange={(e) => setAssignedQueue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>
          )}

          {/* ANALISTA */}
          {currentRole === 'analista_datos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="profile-bi-tool" className="block text-xs font-semibold text-[var(--text-secondary)]">Herramienta BI Preferida</label>
                <input
                  id="profile-bi-tool"
                  type="text"
                  value={biTool}
                  onChange={(e) => setBiTool(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-dataset-scope" className="block text-xs font-semibold text-[var(--text-secondary)]">Alcance de Datasets</label>
                <input
                  id="profile-dataset-scope"
                  type="text"
                  value={datasetScope}
                  onChange={(e) => setDatasetScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>
          )}

          {/* DESARROLLADOR / DEVOPS */}
          {currentRole === 'desarrollador' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="profile-git-handle" className="block text-xs font-semibold text-[var(--text-secondary)]">Usuario Git / GitHub</label>
                <input
                  id="profile-git-handle"
                  type="text"
                  placeholder="ej. @dev-cajamarca"
                  value={gitHandle}
                  onChange={(e) => setGitHandle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-env-access" className="block text-xs font-semibold text-[var(--text-secondary)]">Entorno de Trabajo Asignado</label>
                <select
                  id="profile-env-access"
                  value={envAccess}
                  onChange={(e) => setEnvAccess(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition cursor-pointer"
                >
                  <option value="Staging">Staging (Pruebas)</option>
                  <option value="Production">Production (Producción)</option>
                  <option value="Sandbox">Sandbox / Localhost</option>
                </select>
              </div>
            </div>
          )}

          {/* SERVICIO IA / SISTEMA */}
          {currentRole === 'servicios_ia' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="profile-service-name" className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre del Servicio IA</label>
                <input
                  id="profile-service-name"
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-model-version" className="block text-xs font-semibold text-[var(--text-secondary)]">Versión del motor actual</label>
                <input
                  id="profile-model-version"
                  type="text"
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>
          )}

          {/* REGULADORES */}
          {(currentRole === 'funcionario_mincit' || currentRole === 'camara_comercio') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="profile-institutional-id" className="block text-xs font-semibold text-[var(--text-secondary)]">ID / Credencial Institucional</label>
                <input
                  id="profile-institutional-id"
                  type="text"
                  placeholder="ej. MINCIT-COL-987"
                  value={institutionalId}
                  onChange={(e) => setInstitutionalId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>
          )}

          {/* AFILIADO / EMBAJADOR */}
          {(currentRole === 'embajador' || currentRole === 'afiliado') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="profile-referral-code" className="block text-xs font-semibold text-[var(--text-secondary)]">Código Único de Referido</label>
                <input
                  id="profile-referral-code"
                  type="text"
                  placeholder="ej. CAJAMARCA-2026"
                  value={referralCode}
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="profile-payout-method" className="block text-xs font-semibold text-[var(--text-secondary)]">Método de Cobro Preferido</label>
                <select
                  id="profile-payout-method"
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as 'nequi' | 'daviplata' | 'transferencia')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition cursor-pointer"
                >
                  <option value="nequi">Nequi</option>
                  <option value="daviplata">Daviplata</option>
                  <option value="transferencia">Transferencia bancaria</option>
                </select>
              </div>
            </div>
          )}
        </fieldset>

        {/* BOTÓN GUARDAR CAMBIOS */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando en Supabase...' : 'Guardar Cambios en Perfil'}</span>
          </button>
        </div>
      </form>
      <section className="space-y-4 rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-6 shadow-xl"><h3 className="text-base font-bold">Privacidad y datos</h3><p className="text-xs text-[var(--text-secondary)]">Genera una copia JSON de la información asociada a tu cuenta.</p><button type="button" onClick={() => void exportData()} className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white">Descargar mis datos</button>{deletionRequest ? <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"><p className="text-xs text-amber-100">Tienes una solicitud pendiente de eliminación de cuenta.</p><p className="mt-2 text-[11px] text-[var(--text-secondary)]">La solicitud será revisada antes de eliminar o anonimizar los datos que legalmente puedan eliminarse. Los registros transaccionales/auditoría que deban conservarse pueden permanecer anonimizados.</p><button type="button" onClick={() => void cancelDeletion()} className="mt-3 rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-200">Cancelar solicitud</button></div> : <button type="button" onClick={() => setDeletionConfirmOpen(true)} className="rounded-xl border border-red-500/30 px-4 py-2.5 text-xs font-bold text-red-300">Solicitar eliminación de cuenta</button>}</section>
      <ConfirmDialog open={deletionConfirmOpen} title="Solicitar eliminación de cuenta" message="Esto crea una solicitud para revisión y no elimina inmediatamente todos los registros legales o de auditoría." variant="danger" confirmLabel="Solicitar eliminación" onCancel={() => setDeletionConfirmOpen(false)} onConfirm={() => { setDeletionConfirmOpen(false); void requestDeletion(); }} />
    </div>
  );
};

export default ProfileManagementView;
