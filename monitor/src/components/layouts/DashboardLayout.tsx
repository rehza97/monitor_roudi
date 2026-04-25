import { useEffect, useMemo, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {
  getHeaderNotificationsPath,
  getHeaderProfilePath,
  getHeaderSearchDestination,
} from "@/lib/dashboard-header-routing"
import { useClientSidebarBadges } from "@/hooks/useClientSidebarBadges"

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
      <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-52 rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export function DashboardShellSkeleton({ role, pageTitle }: { role: Role; pageTitle?: string }) {
  const cfg = roleConfig[role]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      <aside
        className="flex flex-col w-64 shrink-0 bg-slate-900 dark:bg-black/80 border-r border-white/5"
        style={{ width: "var(--sidebar-width)" }}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5 shrink-0">
          <div className="size-8 rounded-lg animate-pulse" style={{ backgroundColor: cfg.brand }} />
          <div className="flex-1 space-y-1.5 animate-pulse">
            <div className="h-3 rounded bg-slate-700 w-32" />
            <div className="h-2.5 rounded bg-slate-800 w-24" />
          </div>
        </div>
        <div className="flex-1 p-3 space-y-2 animate-pulse">
          <div className="h-9 rounded-lg bg-slate-800" />
          <div className="h-9 rounded-lg bg-slate-800" />
          <div className="h-9 rounded-lg bg-slate-800" />
          <div className="h-9 rounded-lg bg-slate-800" />
          <div className="h-9 rounded-lg bg-slate-800" />
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header
          className="flex items-center gap-4 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0"
          style={{ height: "var(--header-height)" }}
        >
          {pageTitle ? (
            <h1 className="text-slate-900 dark:text-white text-lg font-semibold truncate flex-1">{pageTitle}</h1>
          ) : (
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          )}
          <div className="flex items-center gap-2 ml-auto animate-pulse">
            <div className="size-9 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="size-9 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className="flex flex-col w-64 shrink-0 bg-slate-900 dark:bg-black/80 border-r border-white/5"
        style={{ width: "var(--sidebar-width)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5 shrink-0">
          <div
            className="size-8 rounded-lg flex items-center justify-center text-white text-sm shrink-0"
            style={{ backgroundColor: cfg.brand }}
          >
            <span className="material-symbols-outlined text-[20px]">{cfg.logoIcon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate leading-tight">Projet Rodaina</p>
            <p className="text-slate-400 text-xs truncate leading-tight">{cfg.logoText}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {sidebarNavItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== `/${role}/dashboard` && location.pathname.startsWith(item.to))
            return (
              <NavLink
                key={item.to}
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
            )
          })}
        </nav>

        {/* Current role */}
        <div className="px-3 pt-3 pb-2 border-t border-white/5 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-1 mb-2">Accès actif</p>
          <div
            className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            style={{ backgroundColor: cfg.brand + "1f" }}
          >
            <div
              className="flex size-8 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: cfg.brand }}
            >
              <span className="material-symbols-outlined text-[18px]">{cfg.switchIcon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: cfg.brand }}>{cfg.label}</p>
              <p className="text-xs text-slate-500">Compte limité à ce tableau de bord</p>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="px-3 pb-4 pt-2 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
            <div
              className="size-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: cfg.brand }}
            >
              {displayInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate leading-tight">{displayName}</p>
              <p className="text-slate-500 text-xs truncate leading-tight">{displayEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="text-slate-500 hover:text-rose-400 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center gap-4 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0"
          style={{ height: "var(--header-height)" }}
        >
          {pageTitle && (
            <h1 className="text-slate-900 dark:text-white text-lg font-semibold truncate flex-1">
              {pageTitle}
            </h1>
          )}
          <div className="flex items-center gap-2 ml-auto relative">
            <div className="relative" ref={searchWrapRef}>
              <button
                type="button"
                aria-expanded={searchOpen}
                aria-haspopup="dialog"
                title="Rechercher"
                onClick={() => setSearchOpen((o) => !o)}
                className={`size-9 flex items-center justify-center rounded-lg transition-colors ${
                  searchOpen
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
              {searchOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  role="dialog"
                  aria-label="Recherche rapide"
                >
                  <form onSubmit={submitHeaderSearch} className="space-y-2">
                    <input
                      autoFocus
                      value={headerQuery}
                      onChange={(e) => setHeaderQuery(e.target.value)}
                      placeholder={searchHint}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-slate-500"
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
                  <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    Ouvre la liste principale avec le filtre prérempli.
                  </p>
                </div>
              ) : null}
            </div>

            <Link
              to={notificationsPath}
              title="Notifications"
              className={`relative size-9 flex items-center justify-center rounded-lg transition-colors ${
                onNotificationsHub
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
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

            <Link
              to={profilePath}
              title="Profil et paramètres"
              className={`size-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent transition-shadow ${
                location.pathname === profilePath || location.pathname.startsWith(`${profilePath}/`)
                  ? "ring-slate-300 dark:ring-slate-500"
                  : "hover:ring-slate-200 dark:hover:ring-slate-600"
              }`}
              style={{ backgroundColor: cfg.brand }}
            >
              {displayInitials}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          {contentLoading ? <DashboardMainSkeleton /> : children}
        </main>
      </div>
    </div>
  )
}
