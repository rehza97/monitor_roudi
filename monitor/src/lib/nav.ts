import type { NavItem } from "@/components/layouts/DashboardLayout"

export const clientNav: NavItem[] = [
  { icon: "dashboard",      label: "Tableau de bord",   to: "/client/dashboard" },
  { icon: "apps",           label: "Mes Applications",  to: "/client/apps" },
  { icon: "deployed_code",  label: "Produits Software", to: "/client/software-store" },
  { icon: "inventory_2",    label: "Produits Matériels",to: "/client/material-store" },
  { icon: "description",    label: "Mes Demandes",      to: "/client/requests" },
  { icon: "monitoring",     label: "Monitoring",        to: "/client/monitoring" },
  { icon: "calendar_month", label: "Réunions",          to: "/client/meetings" },
  { icon: "chat_bubble",    label: "Messagerie",        to: "/client/messages" },
  { icon: "notifications",  label: "Notifications",     to: "/client/notifications" },
  { icon: "receipt_long",   label: "Factures",          to: "/client/payments" },
  { icon: "support_agent",  label: "Support",           to: "/client/support" },
  { icon: "person",         label: "Mon Profil",        to: "/client/profile" },
]

export const adminNav: NavItem[] = [
  { icon: "dashboard",            label: "Tableau de bord",     to: "/admin/dashboard" },
  { icon: "deployed_code",        label: "Catalogue Apps",      to: "/admin/catalog-apps" },
  { icon: "shield_person",        label: "Admins",              to: "/admin/users/admins" },
  { icon: "business_center",      label: "Clients",             to: "/admin/users/clients" },
  { icon: "construction",         label: "Techniciens",         to: "/admin/users/technicians" },
  { icon: "group",                label: "Ingénieurs",          to: "/admin/engineers" },
  { icon: "description",          label: "Demandes",            to: "/admin/requests",    badge: 38 },
  { icon: "inventory_2",          label: "Matériels",           to: "/admin/materials" },
  { icon: "location_on",          label: "Localisation",        to: "/admin/location" },
  { icon: "smart_toy",            label: "AI Agents",           to: "/admin/ai-agents" },
  { icon: "calendar_month",       label: "Réunions",            to: "/admin/meetings" },
  { icon: "chat",                 label: "Messagerie",          to: "/admin/messages" },
  { icon: "monitoring",           label: "Monitoring",          to: "/admin/monitoring" },
  { icon: "receipt_long",         label: "Facturation",         to: "/admin/invoices" },
  { icon: "analytics",            label: "Rapports",            to: "/admin/reports" },
  { icon: "history",              label: "Historique",          to: "/admin/history" },
  { icon: "settings",             label: "Paramètres",          to: "/admin/settings" },
]

export const engineerNav: NavItem[] = [
  { icon: "dashboard",       label: "Tableau de bord",  to: "/engineer/dashboard" },
  { icon: "folder_open",     label: "Mes Projets",      to: "/engineer/projects" },
  { icon: "assignment",      label: "Demandes",         to: "/engineer/requests",   badge: 3 },
  { icon: "monitoring",      label: "Monitoring",       to: "/engineer/monitoring" },
  { icon: "timer",           label: "Suivi du temps",   to: "/engineer/time-tracking" },
  { icon: "smart_toy",       label: "AI Agents",        to: "/engineer/ai-agents" },
  { icon: "calendar_today",  label: "Calendrier",       to: "/engineer/calendar" },
  { icon: "calendar_month",  label: "Réunions",         to: "/engineer/meetings" },
  { icon: "settings_remote", label: "Contrôle distant", to: "/engineer/remote" },
  { icon: "chat",            label: "Messagerie",       to: "/engineer/messages" },
  { icon: "notifications",   label: "Notifications",    to: "/engineer/notifications" },
  { icon: "settings",        label: "Paramètres",       to: "/engineer/settings" },
  { icon: "person",          label: "Mon Profil",       to: "/engineer/profile" },
]

export const technicianNav: NavItem[] = [
  { icon: "dashboard",           label: "Tableau de bord",  to: "/technician/dashboard" },
  { icon: "home_repair_service", label: "Interventions",    to: "/technician/tickets" },
  { icon: "calendar_month",      label: "Calendrier",       to: "/technician/calendar" },
  { icon: "event",               label: "Réunions",         to: "/technician/meetings" },
  { icon: "group",               label: "Clients",          to: "/technician/clients" },
  { icon: "inventory_2",         label: "Inventaire",       to: "/technician/inventory" },
  { icon: "settings_remote",     label: "Contrôle distant", to: "/technician/remote" },
  { icon: "chat",                label: "Messagerie",       to: "/technician/messages" },
  { icon: "notifications_active",label: "Notifications",    to: "/technician/notifications" },
  { icon: "settings",            label: "Réglages",         to: "/technician/settings" },
]
