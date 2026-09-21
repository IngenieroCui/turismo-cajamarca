import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, RefreshCw, ShieldAlert, UserCheck } from "lucide-react";
import {
  ROLE_METADATA,
  UserRoleEnum,
  type UserRole,
} from "../../types/auth.types";
import {
  getAllUsersProfiles,
  setUserStatus,
  type UserProfileItem,
} from "../../services/rolesService";
import {
  getFullProfilesByRole,
  type RoleProfileDetails,
} from "../../services/profileService";
import RegulatoryProfileModal from "./RegulatoryProfileModal";

interface Props {
  isSuperAdmin?: boolean;
}
type FlashMessage = { type: "success" | "error"; text: string };
const standardReviewRoles: UserRole[] = [
  UserRoleEnum.USUARIO,
  UserRoleEnum.TURISTA,
  UserRoleEnum.PRESTADOR_TURISTICO,
  UserRoleEnum.MODERADOR,
  UserRoleEnum.SOPORTE,
  UserRoleEnum.ANALISTA_DATOS,
  UserRoleEnum.EMBAJADOR,
  UserRoleEnum.AFILIADO,
];
const protectedHumanRoles: UserRole[] = [
  UserRoleEnum.ADMIN,
  UserRoleEnum.SUPER_ADMIN,
  UserRoleEnum.AUDITOR,
  UserRoleEnum.DESARROLLADOR,
  UserRoleEnum.FUNCIONARIO_MINCIT,
  UserRoleEnum.CAMARA_COMERCIO,
];
const detailFields: Partial<
  Record<UserRole, Array<[string, keyof RoleProfileDetails]>>
> = {
  usuario: [["Pais", "country_of_origin"]],
  turista: [["Pais", "country_of_origin"]],
  prestador_turistico: [
    ["NIT", "ruc"],
    ["Razon social", "razon_social"],
    ["RNT", "rnt_number"],
  ],
  auditor: [["Certificacion", "audit_certification_id"]],
  soporte: [
    ["Nivel", "support_level"],
    ["Limite", "max_refund_limit"],
  ],
  analista_datos: [["Herramienta", "bi_tool"]],
  funcionario_mincit: [
    ["Entidad", "entity_type"],
    ["ID", "institutional_id"],
  ],
  camara_comercio: [
    ["Entidad", "entity_type"],
    ["ID", "institutional_id"],
  ],
  embajador: [["Codigo", "referral_code"]],
  afiliado: [["Codigo", "referral_code"]],
};
const displayValue = (value: unknown): string =>
  Array.isArray(value)
    ? value.join(", ")
    : value === null || value === undefined || value === ""
      ? "Sin dato"
      : String(value);

export const RevisionRolesView: React.FC<Props> = ({
  isSuperAdmin = false,
}) => {
  const reviewRoles = useMemo(
    () =>
      isSuperAdmin
        ? [...standardReviewRoles, ...protectedHumanRoles]
        : standardReviewRoles,
    [isSuperAdmin],
  );
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    UserRoleEnum.TURISTA,
  );
  const [users, setUsers] = useState<UserProfileItem[]>([]);
  const [roleUsers, setRoleUsers] = useState<RoleProfileDetails[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<FlashMessage | null>(null);
  const [regulatoryUser, setRegulatoryUser] =
    useState<RoleProfileDetails | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setUsers(await getAllUsersProfiles());
    } catch (error: unknown) {
      setUsers([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : "No fue posible cargar usuarios.",
      );
    } finally {
      setLoading(false);
    }
  };
  const loadRoleDetails = async (role: UserRole) => {
    setDetailsLoading(true);
    setLoadError(null);
    try {
      setRoleUsers(await getFullProfilesByRole(role));
    } catch (error: unknown) {
      setRoleUsers([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : "No fue posible cargar detalles.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRoleDetails(selectedRole);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedRole]);
  const roleCounts = useMemo(
    () =>
      new Map(
        reviewRoles.map((role) => [
          role,
          users.filter((item) =>
            item.roles.some((assigned) => assigned.code === role),
          ).length,
        ]),
      ),
    [reviewRoles, users],
  );
  const visibleUsers = roleUsers.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  );
  const changeStatus = async (item: RoleProfileDetails) => {
    const result = await setUserStatus(item.id, !item.is_active);
    if (!result.success) {
      setMessage({
        type: "error",
        text: result.error || "No se pudo actualizar el estado.",
      });
      return;
    }
    setMessage({ type: "success", text: "Estado actualizado." });
    await Promise.all([loadUsers(), loadRoleDetails(selectedRole)]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black my-0">Revision de roles</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Un usuario puede aparecer en varias categorias.
          </p>
        </div>
        <button
          onClick={() =>
            void Promise.all([loadUsers(), loadRoleDetails(selectedRole)])
          }
          className="p-2 rounded-xl border border-[var(--border-light)] cursor-pointer"
          aria-label="Actualizar"
        >
          <RefreshCw
            className={
              loading || detailsLoading ? "animate-spin w-4 h-4" : "w-4 h-4"
            }
          />
        </button>
      </div>
      {message && (
        <p
          className={`p-3 rounded-xl border text-xs ${message.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}
        >
          {message.text}
        </p>
      )}
      {loadError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-200">
          {loadError}
        </div>
      )}
      {loading && (
        <p className="text-xs text-[var(--text-secondary)]">
          Cargando usuarios y roles...
        </p>
      )}
      {!loading && !loadError && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {reviewRoles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`p-3 rounded-2xl text-left border cursor-pointer ${selectedRole === role ? "bg-purple-600 text-white border-purple-500" : "bg-[var(--bg-secondary)] border-[var(--border-light)]"}`}
              >
                <span className="block text-xs font-bold truncate">
                  {ROLE_METADATA[role].label}
                </span>
                <span className="text-lg font-black">
                  {roleCounts.get(role) || 0}
                </span>
                <span className="block text-[10px] opacity-70">usuarios</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nombre, email o documento..."
              className="w-full sm:w-96 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-xs"
            />
          </div>
          {detailsLoading ? (
            <p className="text-xs text-[var(--text-secondary)]">
              Cargando detalles...
            </p>
          ) : (
            <div className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-light)] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)]">
                    <th scope="col" className="p-4">
                      Nombre
                    </th>
                    <th scope="col" className="p-4">
                      Email
                    </th>
                    <th scope="col" className="p-4">
                      Roles
                    </th>
                    <th scope="col" className="p-4">
                      Cuenta
                    </th>
                    <th scope="col" className="p-4 text-right">
                      Accion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((item) => {
                    const expanded = expandedUser === item.id;
                    const canConfigure =
                      isSuperAdmin &&
                      (selectedRole === UserRoleEnum.FUNCIONARIO_MINCIT ||
                        selectedRole === UserRoleEnum.CAMARA_COMERCIO);
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="border-b border-[var(--border-light)]">
                          <td className="p-4 font-bold">
                            {item.full_name || "Sin nombre"}
                          </td>
                          <td className="p-4">{item.email}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {item.roles.map((role) => (
                                <span
                                  key={role.id}
                                  className={`px-2 py-1 rounded-lg border text-[10px] ${role.badge_color}`}
                                >
                                  {role.name}{role.is_primary ? " · Principal" : ""}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            {item.is_active ? "Activa" : "Inactiva"}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              {canConfigure && (
                                <button
                                  onClick={() => setRegulatoryUser(item)}
                                  className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Configurar institucion
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setExpandedUser(expanded ? null : item.id)
                                }
                                className="p-2 rounded-xl border border-[var(--border-light)] cursor-pointer"
                              >
                                <ChevronDown
                                  className={`w-4 h-4 ${expanded ? "rotate-180" : ""}`}
                                />
                              </button>
                              {item.roles.some((role) => role.is_protected) &&
                              !isSuperAdmin ? (
                                <span className="text-[10px] text-amber-300 self-center">
                                  <ShieldAlert className="inline w-3 h-3 mr-1" />
                                  Protegido
                                </span>
                              ) : (
                                <button
                                  onClick={() => void changeStatus(item)}
                                  className="px-3 py-2 rounded-xl bg-purple-600 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  <UserCheck className="inline w-3 h-3 mr-1" />
                                  {item.is_active ? "Desactivar" : "Activar"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={5} className="p-4">
                              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(detailFields[selectedRole] || []).map(
                                  ([label, key]) => (
                                    <div
                                      key={key}
                                      className="p-3 rounded-xl bg-[var(--bg-primary)]"
                                    >
                                      <div className="text-[10px] text-[var(--text-muted)]">
                                        {label}
                                      </div>
                                      <div className="text-xs font-semibold break-words">
                                        {displayValue(item[key])}
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {regulatoryUser && (
        <RegulatoryProfileModal
          userId={regulatoryUser.id}
          initialEntity={
            selectedRole === UserRoleEnum.CAMARA_COMERCIO
              ? "CAMARA_COMERCIO"
              : "MINCIT"
          }
          onClose={() => setRegulatoryUser(null)}
          onSaved={() => {
            setRegulatoryUser(null);
            setMessage({
              type: "success",
              text: "Perfil institucional configurado.",
            });
          }}
        />
      )}
    </div>
  );
};
export default RevisionRolesView;
