import type { NavItem } from "@/components/layouts/DashboardLayout"

export const clientNav: NavItem[] = [
  { icon: "dashboard",      label: "Tableau de bord",   to: "/client/dashboard" },
  { icon: "apps",           label: "Mes Applications",  to: "/client/apps" },
  { icon: "description",    label: "Mes Demandes",      to: "/client/requests" },
  { icon: "monitoring",     label: "Monitoring",        to: "/client/monitoring" },
  { icon: "chat_bubble",    label: "Messagerie",        to: "/client/messages",       badge: 2 },
  { icon: "notifications",  label: "Notifications",     to: "/client/notifications" },
  { icon: "receipt_long",   label: "Factures",          to: "/client/payments" },
  { icon: "support_agent",  label: "Support",           to: "/client/support" },
  { icon: "person",         label: "Mon Profil",        to: "/client/profile" },
]

export const adminNav: NavItem[] = [
  { icon: "dashboard",            label: "Tableau de bord",     to: "/admin/dashboard" },
  { icon: "shield_person",        label: "Admins",              to: "/admin/users/admins" },
  { icon: "business_center",      label: "Clients",             to: "/admin/users/clients" },
  { icon: "construction",         label: "Techniciens",         to: "/admin/users/technicians" },
  { icon: "group",                label: "Ingénieurs",          to: "/admin/engineers" },
  { icon: "description",          label: "Demandes",            to: "/admin/requests",    badge: 38 },
  { icon: "inventory_2",          label: "Matériels",           to: "/admin/materials" },
  { icon: "location_on",          label: "Localisation",        to: "/admin/location" },
  { icon: "chat",                 label: "Messagerie",          to: "/admin/messages" },
  { icon: "monitoring",           label: "Monitoring",          to: "/admin/monitoring" },
  { icon: "analytics",            label: "Rapports",            to: "/admin/reports" },
  { icon: "admin_panel_settings", label: "Rôles & Permissions", to: "/admin/roles" },
  { icon: "history",              label: "Historique",          to: "/admin/history" },
  { icon: "settings",             label: "Paramètres",          to: "/admin/settings" },
]

export const engineerNav: NavItem[] = [
  { icon: "dashboard",       label: "Tableau de bord",  to: "/engineer/dashboard" },
  { icon: "folder_open",     label: "Mes Projets",      to: "/engineer/projects" },
  { icon: "assignment",      label: "Demandes",         to: "/engineer/requests",   badge: 3 },
  { icon: "monitoring",      label: "Monitoring",       to: "/engineer/monitoring" },
  { icon: "settings_remote", label: "Contrôle distant", to: "/engineer/remote" },
  { icon: "chat",            label: "Messagerie",       to: "/engineer/messages" },
  { icon: "notifications",   label: "Notifications",    to: "/engineer/notifications" },
  { icon: "settings",        label: "Paramètres",       to: "/engineer/settings" },
]

export const technicianNav: NavItem[] = [
  { icon: "dashboard",           label: "Tableau de bord",  to: "/technician/dashboard" },
  { icon: "home_repair_service", label: "Interventions",    to: "/technician/tickets" },
  { icon: "calendar_month",      label: "Calendrier",       to: "/technician/calendar" },
  { icon: "group",               label: "Clients",          to: "/technician/clients" },
  { icon: "inventory_2",         label: "Inventaire",       to: "/technician/inventory" },
  { icon: "settings_remote",     label: "Contrôle distant", to: "/technician/remote" },
  { icon: "notifications_active",label: "Notifications",    to: "/technician/notifications" },
  { icon: "settings",            label: "Réglages",         to: "/technician/settings" },
]
