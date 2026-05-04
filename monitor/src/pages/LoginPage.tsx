import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { TechnovaLogo } from "@/components/TechnovaLogo"
import { useAuth } from "@/contexts/AuthContext"

type DemoAccount = {
  id: string
  label: string
  role: string
  email: string
  password: string
}

const DEFAULT_ACCOUNTS: DemoAccount[] = [
  { id: "admin-main", label: "Admin principal", role: "Admin", email: "admin@roudi.dz", password: "admin123" },
  { id: "client-sonatrach", label: "Client Sonatrach", role: "Client", email: "nadia.khelifa@sonatrach.dz", password: "admin123" },
  { id: "engineer-karim", label: "Ingenieur Karim", role: "Ingenieur", email: "karim.touati@roudi.dz", password: "admin123" },
  { id: "technician-samir", label: "Technicien Samir", role: "Technicien", email: "samir.charef@roudi.dz", password: "admin123" },
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

  function handleAccountSelect(accountId: string) {
    setSelectedAccountId(accountId)
    const account = DEFAULT_ACCOUNTS.find((a) => a.id === accountId)
    if (!account) return
    if (emailRef.current) emailRef.current.value = account.email
    if (passwordRef.current) passwordRef.current.value = account.password
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setResetMessage("")
    setSubmitting(true)
    try {
      await login(emailRef.current?.value ?? "", passwordRef.current?.value ?? "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(e: React.MouseEvent) {
    e.preventDefault()
    setError("")
    setResetMessage("")
    setResettingPassword(true)
    try {
      await resetPassword(emailRef.current?.value ?? "")
      setResetMessage("Email de réinitialisation envoyé. Vérifiez votre boîte de réception.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réinitialisation impossible.")
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4 font-sans">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="p-8 pb-4 text-center">
          <div className="mb-6 flex justify-center px-2">
            <TechnovaLogo heightClass="h-10 sm:h-11" className="max-h-11" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">Connexion à votre espace</h2>
          <p className="text-sm text-slate-500">Entrez vos identifiants pour accéder au tableau de bord de monitoring.</p>
        </div>

        <form className="space-y-5 px-8 py-4" onSubmit={handleSubmit}>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          {resetMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{resetMessage}</div>}

          <div className="space-y-1.5">
            <label htmlFor="quick-account" className="block text-sm font-medium text-slate-700">Connexion rapide</label>
            <select
              id="quick-account"
              value={selectedAccountId}
              onChange={(e) => handleAccountSelect(e.target.value)}
              disabled={loading || submitting}
              className="block h-10 w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="">Sélectionner un compte...</option>
              {DEFAULT_ACCOUNTS.map((a) => (
                <option key={a.id} value={a.id}>{a.role} - {a.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
            <input
              id="email"
              ref={emailRef}
              type="email"
              placeholder="votre@email.com"
              autoComplete="email"
              disabled={loading || submitting}
              onChange={() => {
                setError("")
                setSelectedAccountId("")
              }}
              className="block w-full rounded-lg border-slate-300 px-3 py-2.5 text-sm shadow-sm focus:border-slate-500 focus:ring-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">Mot de passe</label>
            <div className="relative">
              <input
                id="password"
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading || submitting}
                onChange={() => {
                  setError("")
                  setSelectedAccountId("")
                }}
                className="block w-full rounded-lg border-slate-300 py-2.5 pl-3 pr-10 text-sm shadow-sm focus:border-slate-500 focus:ring-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? "visibility" : "visibility_off"}</span>
              </button>
            </div>
            <div className="flex justify-end pt-1">
              <a href="#" onClick={(e) => void handleResetPassword(e)} className="text-sm font-medium text-slate-500 hover:text-slate-700">
                {resettingPassword ? "Envoi..." : "Mot de passe oublié ?"}
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || submitting || resettingPassword}
            className="flex w-full justify-center rounded-lg border border-transparent bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-60"
          >
            {submitting ? "Connexion..." : "Se connecter"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-slate-500">Ou continuer avec</span></div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <span>Google</span>
            </button>
            <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <span>GitHub</span>
            </button>
          </div>
        </form>

        <div className="border-t border-slate-100 bg-slate-50 px-8 py-4 text-center">
          <p className="text-xs text-slate-500">
            Vous n'avez pas de compte ?{" "}
            <Link to="/register" className="font-semibold text-slate-600 hover:text-slate-800">Demander un accès</Link>
          </p>
        </div>
      </div>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-5%] top-[-10%] h-[500px] w-[500px] rounded-full bg-slate-500/5 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-slate-300/30 blur-3xl" />
      </div>
    </div>
  )
}
