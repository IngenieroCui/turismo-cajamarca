import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/useAuthStore';
import { ROLE_METADATA, type UserRole } from '../../types/auth.types';
import { getUserFullRoleProfile, updateUserRoleProfile } from '../../services/profileService';
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

export const ProfileManagementView: React.FC = () => {
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  const [serviceName, setServiceName] = useState('Recomendador Gemini');
  const [modelVersion, setModelVersion] = useState('v2.5-flash');

  // Regulador
  const [institutionalId, setInstitutionalId] = useState('');

  // Afiliado
  const [referralCode, setReferralCode] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'yape' | 'plin' | 'cci' | 'transferencia'>('yape');

  const currentRole: UserRole = profile?.role || 'turista';
  const roleMeta = ROLE_METADATA[currentRole];

  const loadProfileData = async () => {
    if (!user) return;
    setLoading(true);

    const fullProfile = await getUserFullRoleProfile(user.id, currentRole);
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

      setServiceName(activeData.service_name || 'Recomendador Gemini');
      setModelVersion(activeData.model_version || 'v2.5-flash');

      setInstitutionalId(activeData.institutional_id || '');

      setReferralCode(activeData.referral_code || '');
      setPayoutMethod(activeData.payout_method || 'yape');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfileData();
  }, [user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setStatusMessage(null);

    // Preparar objeto de campos específicos según el rol
    const specificFields: Record<string, unknown> = {};

    if (currentRole === 'turista' || currentRole === 'usuario') {
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
      currentRole,
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
              <label className="block text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                <span>Correo Electrónico (Identificador Único)</span>
                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> No Editable
                </span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
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
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre Completo *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
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
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Teléfono de Contacto</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="ej. +57 310 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>

            {/* TIPO DE DOCUMENTO */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Tipo de Documento</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as 'DNI' | 'RUC' | 'PASAPORTE' | 'CE')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition cursor-pointer"
              >
                <option value="DNI">DNI / Cédula de Ciudadanía</option>
                <option value="RUC">RUC / NIT Empresarial</option>
                <option value="PASAPORTE">Pasaporte Internacional</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
              </select>
            </div>

            {/* NÚMERO DE DOCUMENTO */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Número de Documento</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
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
        <div className="p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-xl space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] my-0 flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Perfil Específico: {roleMeta.label}</span>
          </h3>

          {/* DERECHO AUTOGESTIÓN TURISTA */}
          {(currentRole === 'turista' || currentRole === 'usuario') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">País de Origen</label>
                <input
                  type="text"
                  placeholder="ej. Colombia"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nacionalidad</label>
                <input
                  type="text"
                  placeholder="ej. Colombiana"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Idioma Preferido</label>
                <select
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre Contacto Emergencia</label>
                <input
                  type="text"
                  placeholder="ej. María Perez"
                  value={emergName}
                  onChange={(e) => setEmergName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Teléfono Contacto Emergencia</label>
                <input
                  type="text"
                  placeholder="ej. +57 300 9876543"
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">RUC / NIT Empresarial</label>
                <input
                  type="text"
                  placeholder="ej. 901234567-1"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">N° Registro RNT</label>
                <input
                  type="text"
                  placeholder="ej. RNT-12345"
                  value={rntNumber}
                  onChange={(e) => setRntNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Razón Social</label>
                <input
                  type="text"
                  placeholder="ej. Hotel Los Pinos S.A.S."
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre Comercial</label>
                <input
                  type="text"
                  placeholder="ej. Posada Campestre Los Pinos"
                  value={nombreComercial}
                  onChange={(e) => setNombreComercial(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Dirección Física del Servicio</label>
                <input
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Área de Especialidad</label>
                <input
                  type="text"
                  value={specialtyArea}
                  onChange={(e) => setSpecialtyArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nivel de Moderación</label>
                <select
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">ID Certificación de Auditoría</label>
                <input
                  type="text"
                  placeholder="ej. AUD-2026-TOL"
                  value={auditCertId}
                  onChange={(e) => setAuditCertId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Alcance Institucional</label>
                <input
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nivel de Atención</label>
                <input
                  type="text"
                  value={supportLevel}
                  onChange={(e) => setSupportLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Cola Asignada</label>
                <input
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Herramienta BI Preferida</label>
                <input
                  type="text"
                  value={biTool}
                  onChange={(e) => setBiTool(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Alcance de Datasets</label>
                <input
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Usuario Git / GitHub</label>
                <input
                  type="text"
                  placeholder="ej. @dev-cajamarca"
                  value={gitHandle}
                  onChange={(e) => setGitHandle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Entorno de Trabajo Asignado</label>
                <select
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Nombre del Servicio IA</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Versión del Modelo LLM</label>
                <input
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">ID / Credencial Institucional</label>
                <input
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
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Código Único de Referido</label>
                <input
                  type="text"
                  placeholder="ej. CAJAMARCA-2026"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-purple-400 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Método de Cobro Preferido</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as 'yape' | 'plin' | 'cci' | 'transferencia')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-purple-400 transition cursor-pointer"
                >
                  <option value="yape">Yape / Nequi</option>
                  <option value="plin">Plin / Daviplata</option>
                  <option value="cci">Cuenta Bancaria CCI</option>
                  <option value="transferencia">Transferencia Directa</option>
                </select>
              </div>
            </div>
          )}
        </div>

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
    </div>
  );
};

export default ProfileManagementView;
