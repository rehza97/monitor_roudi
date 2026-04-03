import type { Role } from "@/components/layouts/DashboardLayout"

export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  client: "/client/dashboard",
  admin: "/admin/dashboard",
  engineer: "/engineer/dashboard",
  technician: "/technician/dashboard",
}

export function getDashboardPathForRole(role: Role): string {
  return ROLE_DASHBOARD_PATH[role]
}

/** `location.state` set by ProtectedRoute when redirecting unauthenticated users to login. */
export type AuthRedirectState = { from?: { pathname?: string } }

/** After login, return deep-link target only if it belongs to this role's app area. */
export function getPostLoginRedirectPath(role: Role, fromPathname: string | undefined): string {
  const dashboard = getDashboardPathForRole(role)
  if (!fromPathname?.startsWith("/")) return dashboard
  const root = `/${role}`
  if (fromPathname === root || fromPathname.startsWith(`${root}/`)) return fromPathname
  return dashboard
}
