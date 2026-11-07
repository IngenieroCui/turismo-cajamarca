BEGIN;

-- The application uses RPCs, not direct table access:
-- turismo_get_public_settings exposes only key/value rows marked is_public.
-- Configuration RPCs enforce active-user, permission and Admin/Super Admin checks.
-- turismo_get_system_health restricts schema-version reads to technical admins.
-- Existing SECURITY DEFINER RPCs run as the table owner; do not FORCE RLS.
ALTER TABLE public.turismo_platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turismo_schema_version ENABLE ROW LEVEL SECURITY;

-- Also remove TRUNCATE and other table privileges that RLS does not protect.
-- Keep owner/service_role privileges for RPCs and trusted migrations.
REVOKE ALL PRIVILEGES ON TABLE
  public.turismo_platform_settings,
  public.turismo_schema_version
FROM PUBLIC, anon, authenticated;

-- Restrictive policies prevent future permissive policies from granting
-- direct client access. Public reads and authorized writes remain RPC-only.
CREATE POLICY turismo_platform_settings_no_direct_client_access
ON public.turismo_platform_settings AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY turismo_schema_version_no_direct_client_access
ON public.turismo_schema_version AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

COMMIT;
