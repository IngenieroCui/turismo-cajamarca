import React, { useState } from "react";
import type {
  ProviderCollaborator,
  ProviderMemberRole,
  ProviderTeamPermission,
} from "../../types/providerTeam.types";
import {
  addProviderCollaborator,
  updateProviderCollaborator,
} from "../../services/providerTeamService";
import ModalShell from "../ui/ModalShell";

interface Props {
  providerId: string;
  collaborator?: ProviderCollaborator | null;
  onClose: () => void;
  onSaved: () => void;
}
const permissionOptions: Array<[ProviderTeamPermission, string]> = [
  ["catalog", "Catálogo"],
  ["availability", "Disponibilidad"],
  ["promotions", "Promociones"],
  ["reservations", "Reservas"],
  ["reviews", "Reseñas"],
  ["finance", "Finanzas"],
  ["support", "Soporte"],
];

const ProviderCollaboratorModal: React.FC<Props> = ({
  providerId,
  collaborator,
  onClose,
  onSaved,
}) => {
  const [email, setEmail] = useState(collaborator?.email || "");
  const [memberRole, setMemberRole] = useState<
    Exclude<ProviderMemberRole, "owner">
  >(collaborator?.memberRole || "colaborador");
  const [permissions, setPermissions] = useState<ProviderTeamPermission[]>(
    collaborator?.permissions || [],
  );
  const [status, setStatus] = useState<"active" | "inactive">(
    collaborator?.status || "active",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (permission: ProviderTeamPermission) =>
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (collaborator)
        await updateProviderCollaborator(
          collaborator.collaboratorId,
          memberRole,
          permissions,
          status,
          providerId,
        );
      else
        await addProviderCollaborator(
          email,
          memberRole,
          permissions,
          providerId,
        );
      onSaved();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar el colaborador.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell
      open
      title={collaborator ? "Editar colaborador" : "Agregar colaborador"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-light)] px-4 py-2 text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            disabled={saving}
            form="provider-collaborator-form"
            type="submit"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      }
    >
      <form
        id="provider-collaborator-form"
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <p className="rounded-xl bg-blue-500/10 p-3 text-xs text-blue-200">
          El usuario debe tener previamente el rol Prestador Turístico. Solo se
          pueden agregar usuarios existentes.
        </p>
        {!collaborator && (
          <label
            htmlFor="collaborator-email"
            className="block text-xs font-semibold"
          >
            Correo electrónico
            <input
              id="collaborator-email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
            />
          </label>
        )}
        <label
          htmlFor="collaborator-role"
          className="block text-xs font-semibold"
        >
          Rol interno
          <select
            id="collaborator-role"
            value={memberRole}
            onChange={(event) =>
              setMemberRole(
                event.target.value as Exclude<ProviderMemberRole, "owner">,
              )
            }
            className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
          >
            <option value="manager">Administrador del negocio</option>
            <option value="colaborador">Colaborador</option>
          </select>
        </label>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold">
            Permisos delegados
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {permissionOptions.map(([permission, label]) => (
              <label
                key={permission}
                htmlFor={`permission-${permission}`}
                className="flex items-center gap-2 text-xs"
              >
                <input
                  id={`permission-${permission}`}
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  onChange={() => toggle(permission)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {collaborator && (
          <label
            htmlFor="collaborator-status"
            className="block text-xs font-semibold"
          >
            Estado
            <select
              id="collaborator-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "active" | "inactive")
              }
              className="mt-1 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
};

export default ProviderCollaboratorModal;
