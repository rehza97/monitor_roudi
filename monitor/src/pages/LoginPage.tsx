import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

type DemoAccount = {
  id: string
  label: string
  role: string
  email: string
  password: string
}

const DEFAULT_ACCOUNTS: DemoAccount[] = [
  {
    id: "admin-main",
    label: "Admin principal",
    role: "Admin",
    email: "admin@roudi.dz",
    password: "admin123",
  },
  {
    id: "admin-ops",
    label: "Admin operations",
    role: "Admin",
    email: "ops.admin@roudi.dz",
    password: "admin123",
  },
  {
    id: "client-sonatrach",
    label: "Client Sonatrach",
    role: "Client",
    email: "nadia.khelifa@sonatrach.dz",
    password: "admin123",
  },
  {
    id: "client-cevital",
    label: "Client Cevital",
    role: "Client",
    email: "yacine.merabet@cevital.dz",
    password: "admin123",
  },
  {
    id: "engineer-karim",
    label: "Ingenieur Karim",
    role: "Ingenieur",
    email: "karim.touati@roudi.dz",
    password: "admin123",
  },
  {
    id: "engineer-meriem",
    label: "Ingenieur Meriem",
    role: "Ingenieur",
    email: "meriem.aitouali@roudi.dz",
    password: "admin123",
  },
  {
    id: "technician-samir",
    label: "Technicien Samir",
    role: "Technicien",
    email: "samir.charef@roudi.dz",
    password: "admin123",
  },
  {
    id: "technician-ines",
    label: "Technicien Ines",
    role: "Technicien",
    email: "ines.boulahbel@roudi.dz",
    password: "admin123",
  },
]

export default function LoginPage() {
  const { login, resetPassword, authError, loading } = useAuth()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetMessage, setResetMessage] = useState("")

  useEffect(() => {
    if (authError) setError(authError)
  }, [authError])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await login(emailRef.current?.value ?? "", passwordRef.current?.value ?? "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleAccountSelect(accountId: string) {
    setSelectedAccountId(accountId)
    setError("")
    setResetMessage("")

    const account = DEFAULT_ACCOUNTS.find((item) => item.id === accountId)
    if (!account) {
      if (emailRef.current) emailRef.current.value = ""
      if (passwordRef.current) passwordRef.current.value = ""
      return
    }

    if (emailRef.current) emailRef.current.value = account.email
    if (passwordRef.current) passwordRef.current.value = account.password
  }

  async function handleResetPassword(e: React.MouseEvent) {
    e.preventDefault()
    setError("")
    setResetMessage("")
    const email = emailRef.current?.value ?? ""
    setResettingPassword(true)
    try {
      await resetPassword(email)
      setResetMessage("Email de réinitialisation envoyé. Vérifiez votre boîte de réception.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réinitialisation impossible.")
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-8 pb-4 text-center">
          <div className="inline-flex items-center gap-3 justify-center mb-6">
            <div className="size-10 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">terminal</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Projet Rodaina</h1>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Connexion à votre espace</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Entrez vos identifiants pour accéder au tableau de bord de monitoring.
          </p>
        </div>

        <form className="px-8 py-4 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-sm text-rose-600 dark:text-rose-400">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              {error}
            </div>
          )}
          {resetMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400">
              <span className="material-symbols-outlined text-[16px] shrink-0">mark_email_read</span>
              {resetMessage}
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-blue-600 dark:text-blue-400">
                manage_accounts
              </span>
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="quick-account">
                  Connexion rapide
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choisissez un compte par defaut pour remplir les champs.
                </p>
              </div>
            </div>
            <select
              id="quick-account"
              value={selectedAccountId}
              onChange={(e) => handleAccountSelect(e.target.value)}
              disabled={loading || submitting}
              className="block w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-blue-900 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Selectionner un compte...</option>
              {DEFAULT_ACCOUNTS.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.role} - {account.label} ({account.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
              Email
            </label>
            <input
              ref={emailRef}
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:text-white text-sm py-2.5 px-3 outline-none focus:ring-2 focus:ring-offset-0"
              id="email"
              name="email"
              placeholder="votre@email.com"
              type="email"
              autoComplete="email"
              disabled={loading || submitting}
              onChange={() => {
                setError("")
                setSelectedAccountId("")
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
              Mot de passe
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:text-white text-sm py-2.5 px-3 pr-10 outline-none focus:ring-2"
                id="password"
                name="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={loading || submitting}
                onChange={() => {
                  setError("")
                  setSelectedAccountId("")
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
            <div className="flex justify-end pt-1">
              <a
                className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                href="#"
                onClick={(e) => void handleResetPassword(e)}
              >
                Mot de passe oublié ?
              </a>
            </div>
          </div>

          <button
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-60"
            type="submit"
            disabled={loading || submitting || resettingPassword}
          >
            {submitting ? "Connexion…" : "Se connecter"}
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Les comptes rapides remplissent uniquement les champs. La connexion reste verifiee par Firebase.
          </p>
        </form>

        <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vous n'avez pas de compte ?{" "}
            <Link className="font-semibold text-blue-600 hover:text-blue-700" to="/register">
              Demander un accès
            </Link>
          </p>
        </div>
      </div>

      <div aria-hidden="true" className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-slate-300/20 dark:bg-slate-700/20 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
