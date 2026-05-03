import { useEffect, useMemo, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {
  getHeaderNotificationsPath,
  getHeaderProfilePath,
  getHeaderSearchDestination,
} from "@/lib/dashboard-header-routing"
import { useClientSidebarBadges } from "@/hooks/useClientSidebarBadges"
import AdminSidebar, { ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/layouts/AdminSidebar"

export type Role = "client" | "admin" | "engineer" | "technician"

export interface NavItem {
  icon: string
  label: string
  to: string
  badge?: number
}

interface DashboardLayoutProps {
  children: React.ReactNode
  role: Role
  navItems: NavItem[]
  pageTitle?: string
  // Legacy props — ignored when auth context provides a user
  userName?: string
  userEmail?: string
  userInitials?: string
}

const roleConfig: Record<Role, {
  brand: string
  activeBg: string
  activeText: string
  hoverBg: string
  dotColor: string
  logoIcon: string
  logoText: string
  label: string
  switchIcon: string
}> = {
  client: {
    brand:      "#0891b2",
    activeBg:   "bg-cyan-500/20",
    activeText: "text-cyan-400",
    hoverBg:    "hover:bg-white/5",
    dotColor:   "bg-cyan-400",
    logoIcon:   "monitoring",
    logoText:   "Espace Client",
    label:      "Client",
    switchIcon: "person",
  },
  admin: {
    brand:      "#db143c",
    activeBg:   "bg-rose-500/20",
    activeText: "text-rose-400",
    hoverBg:    "hover:bg-white/5",
    dotColor:   "bg-rose-400",
    logoIcon:   "admin_panel_settings",
    logoText:   "Administration",
    label:      "Admin",
    switchIcon: "shield_person",
  },
  engineer: {
    brand:      "#2463eb",
    activeBg:   "bg-blue-500/20",
    activeText: "text-blue-400",
    hoverBg:    "hover:bg-white/5",
    dotColor:   "bg-blue-400",
    logoIcon:   "code",
    logoText:   "Espace Ingénieur",
    label:      "Ingénieur",
    switchIcon: "code",
  },
  technician: {
    brand:      "#f9bc06",
    activeBg:   "bg-amber-400/20",
    activeText: "text-amber-400",
    hoverBg:    "hover:bg-white/5",
    dotColor:   "bg-amber-400",
    logoIcon:   "build",
    logoText:   "Espace Technicien",
    label:      "Technicien",
    switchIcon: "build",
  },
}

function DashboardMainSkeleton() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="h-10 rounded-xl bg-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 rounded-xl bg-slate-200" />
        <div className="h-24 rounded-xl bg-slate-200" />
        <div className="h-24 rounded-xl bg-slate-200" />
      </div>
      <div className="h-72 rounded-xl bg-slate-200" />
      <div className="h-52 rounded-xl bg-slate-200" />
    </div>
  )
}

export function DashboardShellSkeleton({ role, pageTitle }: { role: Role; pageTitle?: string }) {
  const cfg = roleConfig[role]
  const isSkeletonAdmin = role === "admin"
  const isSkeletonEngineer = role === "engineer"
  const isSkeletonTechnician = role === "technician"

  return (
    <div
      className={`flex h-screen overflow-hidden font-sans ${
        isSkeletonEngineer ? "bg-[#f6f6f8]" : isSkeletonTechnician ? "bg-[#f8f8f5]" : "bg-slate-100"
      }`}
    >
      <aside
        className={`flex flex-col shrink-0 border-r ${
          isSkeletonEngineer
            ? "bg-white border-slate-200 w-64"
            : isSkeletonTechnician
              ? "bg-[#181611] border-[#3a3527] w-72"
              : `bg-slate-900 border-white/5 ${isSkeletonAdmin ? "w-72" : "w-64"}`
        }`}
        style={isSkeletonTechnician || isSkeletonEngineer ? undefined : { width: "var(--sidebar-width)" }}
      >
        <div
          className={`flex items-center gap-3 px-5 shrink-0 border-b ${
            isSkeletonEngineer ? "h-16 border-slate-100"
              : isSkeletonTechnician ? "h-[4.5rem] border-[#3a3527] py-3"
              : "h-16 border-white/5"
          }`}
        >
          <div
            className={`animate-pulse shrink-0 ${isSkeletonTechnician ? "h-10 w-10 rounded-full bg-[#3a3527]" : "size-8 rounded-lg"}`}
            style={isSkeletonTechnician ? undefined : { backgroundColor: cfg.brand }}
          />
          <div className="flex-1 space-y-1.5 animate-pulse">
            <div
              className={`h-3 rounded w-32 ${
                isSkeletonEngineer ? "bg-slate-200" : isSkeletonTechnician ? "bg-[#3a3527]" : "bg-slate-700"
              }`}
            />
            <div
              className={`h-2.5 rounded w-24 ${
                isSkeletonEngineer ? "bg-slate-100" : isSkeletonTechnician ? "bg-[#3a3527]/80" : "bg-slate-800"
              }`}
            />
          </div>
        </div>
        <div className="flex-1 p-3 space-y-2 animate-pulse">
          <div
            className={`h-9 rounded-lg ${
              isSkeletonEngineer ? "bg-slate-100" : isSkeletonTechnician ? "bg-[#3a3527]/60" : "bg-slate-800"
            }`}
          />
          <div
            className={`h-9 rounded-lg ${
              isSkeletonEngineer ? "bg-slate-100" : isSkeletonTechnician ? "bg-[#3a3527]/60" : "bg-slate-800"
            }`}
          />
          <div
            className={`h-9 rounded-lg ${
              isSkeletonEngineer ? "bg-slate-100" : isSkeletonTechnician ? "bg-[#3a3527]/60" : "bg-slate-800"
            }`}
          />
          <div
            className={`h-9 rounded-lg ${
              isSkeletonEngineer ? "bg-slate-100" : isSkeletonTechnician ? "bg-[#3a3527]/60" : "bg-slate-800"
            }`}
          />
          <div
            className={`h-9 rounded-lg ${
              isSkeletonEngineer ? "bg-slate-100" : isSkeletonTechnician ? "bg-[#3a3527]/60" : "bg-slate-800"
            }`}
          />
        </div>
      </aside>

      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${isSkeletonAdmin ? ADMIN_SIDEBAR_OFFSET_CLASS : ""}`}>
        <header
          className="flex items-center gap-4 px-6 bg-white border-b border-slate-200 shrink-0"
          style={{ height: "var(--header-height)" }}
        >
          {pageTitle ? (
            <h1 className="text-slate-900 text-lg font-semibold truncate flex-1">{pageTitle}</h1>
          ) : (
            <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
          )}
          <div className="flex items-center gap-2 ml-auto animate-pulse">
            <div className="size-9 rounded-lg bg-slate-200" />
            <div className="size-9 rounded-lg bg-slate-200" />
            <div className="size-8 rounded-full bg-slate-200" />
          </div>
        </header>
        <main
          className={`flex-1 overflow-y-auto ${isSkeletonTechnician ? "bg-[#f8f8f5]" : "bg-slate-50"}`}
        >
          <DashboardMainSkeleton />
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
  role,
  navItems,
  pageTitle,
  userName = "Utilisateur",
  userEmail = "user@rodaina.fr",
  userInitials = "U",
}: DashboardLayoutProps) {
  const cfg = roleConfig[role]
  const isAdmin = role === "admin"
  const isClient = role === "client"
  const isEngineer = role === "engineer"
  const isTechnician = role === "technician"
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { messageUnread, notificationUnread } = useClientSidebarBadges(role, user)
  const [contentLoading, setContentLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [headerQuery, setHeaderQuery] = useState("")
  const searchWrapRef = useRef<HTMLDivElement>(null)

  const notificationsPath = getHeaderNotificationsPath(role)
  const profilePath = getHeaderProfilePath(role)
  const onNotificationsHub =
    location.pathname === notificationsPath || location.pathname.startsWith(`${notificationsPath}/`)

  useEffect(() => {
    const timer = window.setTimeout(() => setContentLoading(false), 240)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (!searchOpen) return
      const el = searchWrapRef.current
      if (el && !el.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [searchOpen])

  // Prefer live auth user, fall back to legacy props
  const displayName     = user?.name     ?? userName
  const displayEmail    = user?.email    ?? userEmail
  const displayInitials = user?.initials ?? userInitials

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  function submitHeaderSearch(e?: React.FormEvent) {
    e?.preventDefault()
    const q = headerQuery.trim()
    if (!q) return
    navigate(getHeaderSearchDestination(role, q))
    setHeaderQuery("")
    setSearchOpen(false)
  }

  const searchHint =
    role === "technician"
      ? "Tickets (sujet, organisation…)"
      : role === "client"
        ? "Vos demandes (type, réf…)"
        : "Demandes (client, réf., type…)"

  const sidebarNavItems = useMemo(() => {
    return navItems.map((item) => {
      if (item.to.endsWith("/messages")) {
        return messageUnread > 0 ? { ...item, badge: messageUnread } : { ...item, badge: undefined }
      }
      if (item.to.endsWith("/notifications")) {
        return notificationUnread > 0
          ? { ...item, badge: notificationUnread }
          : { ...item, badge: undefined }
      }
      return item
    })
  }, [navItems, messageUnread, notificationUnread])

  const adminDemandesBadge = useMemo(
    () =>
      navItems.find((n) => n.to === "/admin/requests")?.badge ??
      sidebarNavItems.find((n) => n.to === "/admin/requests")?.badge,
    [navItems, sidebarNavItems],
  )

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${isAdmin ? "bg-[#f8f6f6]" : isClient ? "bg-[#f8fafc]" : isEngineer ? "bg-[#f6f6f8]" : "bg-[#f8f8f5]"}`}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      {isAdmin ? (
        <AdminSidebar
          demandesBadge={adminDemandesBadge}
          userName={displayName}
          userEmail={displayEmail}
          userInitials={displayInitials}
          onLogout={handleLogout}
        />
      ) : isClient ? (
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-20">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-[#0891b2]/10 p-2 rounded-lg">
            <span className="material-symbols-outlined text-[#0891b2] text-2xl">grid_view</span>
          </div>
          <div>
            <h1 className="text-slate-900 text-base font-bold leading-tight">Projet Rodaina</h1>
            <p className="text-slate-500 text-xs font-medium">Espace Client</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          {sidebarNavItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== "/client/dashboard" && location.pathname.startsWith(item.to))
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? "bg-[#0891b2]/10 text-[#0891b2]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? "text-[#0891b2]" : "text-slate-500"}`}>{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="min-w-5 rounded-full bg-[#0891b2] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{item.badge}</span>
                ) : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-200">
              <span className="text-xs font-bold text-slate-600">{displayInitials}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
            </div>
            <button onClick={handleLogout} title="Déconnexion" className="text-slate-400 hover:text-[#0891b2]">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>
      ) : isEngineer ? (
      <aside
        className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 h-screen"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full ring-2 ring-[#2463eb]/30 bg-[#2463eb]/10 flex items-center justify-center text-sm font-bold text-[#2463eb]">
                {displayInitials}
              </div>
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-slate-900 text-base font-bold truncate">{displayName}</h1>
              <p className="text-slate-500 text-xs font-medium">Ingénieur</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          {sidebarNavItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== "/engineer/dashboard" && location.pathname.startsWith(item.to))
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#2463eb]/10 text-[#2463eb] border-l-4 border-[#2463eb]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent"
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] shrink-0 ${isActive ? "text-[#2463eb]" : "text-slate-500"}`}>{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center bg-[#2463eb]">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors w-full text-left"
            title="Déconnexion"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>
      ) : isTechnician ? (
      <aside className="hidden md:flex flex-col w-72 shrink-0 h-screen bg-[#181611] border-r border-[#3a3527]">
        <div className="flex flex-col flex-1 min-h-0 p-4">
          <div className="flex gap-3 items-center px-2 shrink-0">
            <div className="rounded-full h-10 w-10 ring-2 ring-[#f9bc06]/20 bg-[#3a3527] flex items-center justify-center text-sm font-bold text-[#f9bc06] shrink-0">
              {displayInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-white text-base font-medium truncate">{displayName}</p>
              <p className="text-[#f9bc06] text-xs uppercase tracking-wider">Technicien</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto flex flex-col gap-2 mt-8 min-h-0">
            {sidebarNavItems.map((item) => {
              const isActive =
                location.pathname === item.to ||
                (item.to !== "/technician/dashboard" && location.pathname.startsWith(item.to))
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#3a3527]/50 text-[#f9bc06] border border-[#3a3527]"
                      : "text-[#bbb39b] hover:bg-[#3a3527]/30 hover:text-white border border-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px] shrink-0">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 ? (
                    <span className="min-w-5 rounded-full bg-[#f9bc06] px-1.5 py-0.5 text-center text-[10px] font-bold text-black">
                      {item.badge}
                    </span>
                  ) : null}
                </NavLink>
              )
            })}
          </nav>

          <div className="shrink-0 pt-3 mt-auto border-t border-[#3a3527]">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-[#bbb39b] hover:bg-[#3a3527]/30 hover:text-red-400 text-left transition-colors"
              title="Déconnexion"
            >
              <span className="material-symbols-outlined text-[24px]">logout</span>
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>
      ) : (
      <aside
        className="flex flex-col w-64 shrink-0 border-r bg-slate-900 border-white/5"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className={`flex items-center gap-3 px-5 h-16 border-b shrink-0 ${isAdmin ? "border-gray-100" : "border-white/5"}`}>
          <div
            className="size-8 rounded-lg flex items-center justify-center text-white text-sm shrink-0"
            style={{ backgroundColor: cfg.brand }}
          >
            <span className="material-symbols-outlined text-[20px]">{cfg.logoIcon}</span>
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate leading-tight ${isAdmin ? "text-[#181112]" : "text-white"}`}>Projet Rodaina</p>
            <p className={`text-xs truncate leading-tight ${isAdmin ? "text-[#896169]" : "text-slate-400"}`}>{cfg.logoText}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {sidebarNavItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== `/${role}/dashboard` && location.pathname.startsWith(item.to))
            return (
              <div key={item.to}>
              <NavLink
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? `${cfg.activeBg} ${cfg.activeText}`
                    : `text-slate-400 ${cfg.hoverBg} hover:text-white`
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white flex items-center justify-center"
                    style={{ backgroundColor: cfg.brand }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
              </div>
            )
          })}
        </nav>

        <div className="px-3 pt-3 pb-2 border-t border-white/5 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-1 mb-2">Accès actif</p>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: cfg.brand + "1f" }}>
            <div className="flex size-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: cfg.brand }}>
              <span className="material-symbols-outlined text-[18px]">{cfg.switchIcon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: cfg.brand }}>{cfg.label}</p>
              <p className="text-xs text-slate-500">Compte limité à ce tableau de bord</p>
            </div>
          </div>
        </div>
        <div className="px-3 pb-4 pt-2 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group hover:bg-white/5">
            <div className="size-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: cfg.brand }}>
              {displayInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate leading-tight">{displayName}</p>
              <p className="text-slate-500 text-xs truncate leading-tight">{displayEmail}</p>
            </div>
            <button onClick={handleLogout} title="Déconnexion" className="transition-colors shrink-0 text-slate-500 hover:text-rose-400">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>
      )}

      {/* ── Main area ───────────────────────────────────── */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${isAdmin ? ADMIN_SIDEBAR_OFFSET_CLASS : isClient ? "md:ml-64" : ""}`}>
        {/* Header */}
        <header
          className="flex items-center gap-4 px-6 bg-white border-b border-slate-200 shrink-0"
          style={{ height: "var(--header-height)" }}
        >
          {pageTitle && (
            <h1 className="text-slate-900 text-lg font-semibold truncate flex-1">
              {pageTitle}
            </h1>
          )}
          <div className="flex items-center gap-2 ml-auto relative">
            {!isClient ? (
            <div className="relative" ref={searchWrapRef}>
              <button
                type="button"
                aria-expanded={searchOpen}
                aria-haspopup="dialog"
                title="Rechercher"
                onClick={() => setSearchOpen((o) => !o)}
                className={`size-9 flex items-center justify-center rounded-lg transition-colors ${
                  searchOpen
                    ? "bg-slate-100 text-slate-900"
                    : "hover:bg-slate-100 text-slate-500"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
              {searchOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
                  role="dialog"
                  aria-label="Recherche rapide"
                >
                  <form onSubmit={submitHeaderSearch} className="space-y-2">
                    <input
                      autoFocus
                      value={headerQuery}
                      onChange={(e) => setHeaderQuery(e.target.value)}
                      placeholder={searchHint}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!headerQuery.trim()}
                      className="w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: cfg.brand }}
                    >
                      Rechercher
                    </button>
                  </form>
                  <p className="mt-2 text-[11px] leading-snug text-slate-500">
                    Ouvre la liste principale avec le filtre prérempli.
                  </p>
                </div>
              ) : null}
            </div>
            ) : null}

            <Link
              to={notificationsPath}
              title="Notifications"
              className={`relative size-9 flex items-center justify-center rounded-lg transition-colors ${
                onNotificationsHub
                  ? "bg-slate-100 text-slate-900"
                  : "hover:bg-slate-100 text-slate-500"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {!onNotificationsHub ? (
                <span
                  className="absolute top-1.5 right-1.5 size-2 rounded-full"
                  style={{ backgroundColor: cfg.brand }}
                />
              ) : null}
            </Link>

            {isClient ? (
              <>
                <Link
                  to="/client/materials/order"
                  title="Panier catalogue"
                  className="size-9 flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0891b2]"
                >
                  <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                </Link>
                <Link
                  to="/client/requests/new"
                  className="hidden sm:flex items-center gap-2 rounded-lg bg-[#0891b2] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-cyan-200 transition-colors hover:bg-cyan-700"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Nouvelle demande</span>
                </Link>
              </>
            ) : null}

            {!isClient ? (
            <Link
              to={profilePath}
              title="Profil et paramètres"
              className={`size-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent transition-shadow ${
                location.pathname === profilePath || location.pathname.startsWith(`${profilePath}/`)
                  ? "ring-slate-300"
                  : "hover:ring-slate-200"
              }`}
              style={{ backgroundColor: cfg.brand }}
            >
              {displayInitials}
            </Link>
            ) : null}
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto ${isAdmin ? "bg-[#f8f6f6]" : isClient ? "bg-[#f8fafc]" : isEngineer ? "bg-[#f6f6f8]" : isTechnician ? "bg-[#f8f8f5]" : "bg-slate-50"}`}>
          {contentLoading ? <DashboardMainSkeleton /> : children}
        </main>
      </div>
    </div>
  )
}
