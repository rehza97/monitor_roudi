import { NavLink } from "react-router-dom"

export const ADMIN_SIDEBAR_WIDTH_CLASS = "w-72"
export const ADMIN_SIDEBAR_OFFSET_CLASS = "ml-72"

type AdminSidebarProps = {
  demandesBadge?: number
  userName: string
  userEmail: string
  userInitials: string
  onLogout: () => void
}

const items = [
  { icon: "dashboard", label: "Tableau de bord", to: "/admin/dashboard" },
  { icon: "group", label: "Utilisateurs", to: "/admin/users/clients" },
  { icon: "description", label: "Demandes", to: "/admin/requests" },
  { icon: "inventory_2", label: "Matériels", to: "/admin/materials" },
  { icon: "support_agent", label: "Ingénieurs", to: "/admin/engineers" },
  { icon: "location_on", label: "Localisation", to: "/admin/location" },
  { icon: "mail", label: "Messagerie", to: "/admin/messages" },
  { icon: "monitoring", label: "Monitoring", to: "/admin/monitoring" },
  { icon: "receipt_long", label: "Facturation", to: "/admin/invoices" },
  { icon: "history", label: "Historique", to: "/admin/history" },
  { icon: "apps", label: "Catalogue Apps", to: "/admin/catalog-apps" },
  { icon: "analytics", label: "Rapports", to: "/admin/reports" },
  { icon: "settings", label: "Paramètres", to: "/admin/settings" },
]

export default function AdminSidebar({
  demandesBadge,
  userName,
  userEmail,
  userInitials,
  onLogout,
}: AdminSidebarProps) {
  return (
    <aside className={`${ADMIN_SIDEBAR_WIDTH_CLASS} flex flex-col h-screen bg-white border-r border-gray-200 fixed left-0 top-0 z-50`}>
      <div className="flex items-center gap-3 p-6 border-b border-gray-100">
        <div className="bg-[#db143c]/10 rounded-full h-10 w-10 flex items-center justify-center text-[#db143c]">
          <span className="material-symbols-outlined">admin_panel_settings</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-[#181112] text-base font-bold leading-tight">Projet Rodaina</h1>
          <p className="text-[#896169] text-xs font-medium">Administrateur</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 p-4 overflow-y-auto flex-1">
        {items.map((item, idx) => (
          <div key={item.to}>
            {idx === 11 ? <div className="my-2 border-t border-gray-100" /> : null}
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive
                    ? "bg-[#db143c]/10 text-[#db143c]"
                    : "text-[#896169] hover:bg-gray-50 hover:text-[#181112]"
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {item.to === "/admin/requests" && (demandesBadge ?? 0) > 0 ? (
                <span className="ml-auto bg-[#db143c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{demandesBadge}</span>
              ) : null}
            </NavLink>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <p className="text-xs font-semibold text-[#896169] mb-2 uppercase tracking-wider">ÉTAT DES SERVEURS</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#181112]">Serveur Principal</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] text-emerald-600 font-medium">En ligne</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#181112]">Base de Données</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500/90"></div>
                <span className="text-[10px] text-emerald-600 font-medium">Stable</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-full text-left"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center">{userInitials}</div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-medium text-[#181112] truncate">{userName}</p>
            <p className="text-xs text-[#896169] truncate">{userEmail}</p>
          </div>
          <span className="material-symbols-outlined text-gray-400 ml-auto text-[18px]">logout</span>
        </button>
      </div>
    </aside>
  )
}
