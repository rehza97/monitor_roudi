import type { Role } from "@/components/layouts/DashboardLayout"

export function getHeaderNotificationsPath(role: Role): string {
  switch (role) {
    case "client":
      return "/client/notifications"
    case "engineer":
      return "/engineer/notifications"
    case "technician":
      return "/technician/notifications"
    case "admin":
      return "/admin/messages"
  }
}

export function getHeaderProfilePath(role: Role): string {
  switch (role) {
    case "client":
      return "/client/profile"
    case "admin":
      return "/admin/settings"
    case "engineer":
      return "/engineer/settings"
    case "technician":
      return "/technician/settings"
  }
}

/** Primary list view for quick search from the shell header (`?q=`). */
export function getHeaderSearchDestination(role: Role, query: string): string {
  const q = encodeURIComponent(query.trim())
  switch (role) {
    case "client":
      return `/client/requests?q=${q}`
    case "admin":
      return `/admin/requests?q=${q}`
    case "engineer":
      return `/engineer/requests?q=${q}`
    case "technician":
      return `/technician/tickets?q=${q}`
  }
}
