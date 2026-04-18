import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { getDashboardPathForRole } from "@/lib/auth-routing"

interface PublicLayoutProps {
  children: React.ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate("/", { replace: true })
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900 font-sans antialiased">
      {/* ── Header ──────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[20px]">terminal</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Projet Rodaina</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                {[
                  { to: "/",         label: "Accueil"       },
                  { to: "/apps",     label: "Applications"  },
                  { to: "/about",    label: "À propos"      },
                  { to: "/contact",  label: "Contact"       },
                ].map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) =>
                      `text-sm font-medium transition-colors ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-white"}`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    to={getDashboardPathForRole(user.role)}
                    className="flex items-center justify-center h-9 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Tableau de bord
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex items-center justify-center h-9 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hidden sm:flex items-center justify-center h-9 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    Connexion
                  </Link>
                  <Link to="/register" className="flex items-center justify-center h-9 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all">
                    Inscription
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────── */}
      <main className="flex-grow">
        {children}
      </main>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="size-6 rounded bg-blue-600 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">terminal</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">Projet Rodaina</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Solutions de monitoring et d'analyse pour les développeurs modernes.
              </p>
            </div>

            {/* Produits */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Produits</h4>
              <ul className="space-y-3">
                {[
                  { to: "/apps/ecotrack-pro",  label: "EcoTrack Pro"  },
                  { to: "/apps/devmonitor-x",  label: "DevMonitor X"  },
                  { to: "/apps/dataviz-suite", label: "DataViz Suite" },
                  { to: "/apps/securegate",    label: "SecureGate"    },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link className="text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors" to={to}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Entreprise */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Entreprise</h4>
              <ul className="space-y-3">
                {[
                  { to: "/about",   label: "À propos"  },
                  { to: "/careers", label: "Carrières" },
                  { to: "/blog",    label: "Blog"      },
                  { to: "/contact", label: "Contact"   },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link className="text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors" to={to}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Légal</h4>
              <ul className="space-y-3">
                {[
                  { to: "/privacy", label: "Confidentialité"         },
                  { to: "/terms",   label: "Conditions d'utilisation" },
                  { to: "/legal",   label: "Mentions légales"         },
                  { to: "/cookies", label: "Cookies"                  },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link className="text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors" to={to}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">© 2025 Projet Rodaina. Tous droits réservés.</p>
            <div className="flex gap-4">
              <a className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" href="#">
                <span className="material-symbols-outlined">public</span>
              </a>
              <a className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" href="#">
                <span className="material-symbols-outlined">alternate_email</span>
              </a>
              <a className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" href="#">
                <span className="material-symbols-outlined">rss_feed</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
