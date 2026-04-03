import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { getDashboardPathForRole } from "@/lib/auth-routing"

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, authError } = useAuth()
  const [accountType, setAccountType] = useState<"student" | "other">("student")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Nom, email et mot de passe sont obligatoires.")
      return
    }

    if (password.trim().length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const profile = await register({
        accountType,
        email,
        name: fullName,
        password,
        phone,
      })
      navigate(getDashboardPathForRole(profile.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f6f8] dark:bg-[#111621] font-[Inter,sans-serif] antialiased">
      <header className="w-full bg-white dark:bg-[#1a202c] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 cursor-pointer">
              <div className="size-8 rounded bg-blue-600/10 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">monitoring</span>
              </div>
              <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold tracking-tight">Rodaina Project</h2>
            </Link>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-block text-slate-600 dark:text-slate-400 text-sm font-medium">
                Deja un compte ?
              </span>
              <Link
                to="/login"
                className="flex items-center justify-center rounded-lg h-9 px-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-sm font-bold transition-colors"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-start pt-10 pb-20 px-4 sm:px-6">
        <div className="w-full max-w-[640px] flex flex-col gap-8">
          <div className="text-center space-y-2">
            <h1 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">Creer votre compte</h1>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              L'inscription cree un compte Firebase Auth et un profil Firestore.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`group relative flex flex-col cursor-pointer border-2 bg-white dark:bg-[#1a202c] rounded-xl p-5 hover:shadow-lg transition-all ${
                accountType === "student" ? "border-blue-600" : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
              }`}
            >
              <input
                className="sr-only"
                name="account_type"
                type="radio"
                value="student"
                checked={accountType === "student"}
                onChange={() => setAccountType("student")}
              />
              <div
                className={`absolute top-4 right-4 size-5 rounded-full border flex items-center justify-center transition-colors ${
                  accountType === "student" ? "border-blue-600 bg-blue-600" : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {accountType === "student" && (
                  <span className="material-symbols-outlined text-white text-[14px]">check</span>
                )}
              </div>
              <div className="mb-3 size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">school</span>
              </div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-lg">Etudiant</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Profil en auto-inscription</p>
            </label>

            <label
              className={`group relative flex flex-col cursor-pointer border-2 bg-white dark:bg-[#1a202c] rounded-xl p-5 hover:shadow-lg transition-all ${
                accountType === "other" ? "border-blue-600" : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
              }`}
            >
              <input
                className="sr-only"
                name="account_type"
                type="radio"
                value="other"
                checked={accountType === "other"}
                onChange={() => setAccountType("other")}
              />
              <div
                className={`absolute top-4 right-4 size-5 rounded-full border flex items-center justify-center transition-colors ${
                  accountType === "other" ? "border-blue-600 bg-blue-600" : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {accountType === "other" && (
                  <span className="material-symbols-outlined text-white text-[14px]">check</span>
                )}
              </div>
              <div className="mb-3 size-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined">business_center</span>
              </div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-lg">Autre</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Demande traitee comme compte client</p>
            </label>
          </div>

          <form className="bg-white dark:bg-[#1a202c] shadow-sm rounded-xl p-6 sm:p-8 space-y-6" onSubmit={handleSubmit}>
            {(error || authError) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-sm text-rose-600 dark:text-rose-400">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                {error || authError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="fullname">
                Nom complet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">person</span>
                </div>
                <input
                  className="block w-full pl-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#252b36] text-slate-900 dark:text-white focus:ring-blue-600 focus:border-blue-600 text-sm h-11 outline-none focus:ring-2"
                  id="fullname"
                  placeholder="ex: Jean Dupont"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">mail</span>
                  </div>
                  <input
                    className="block w-full pl-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#252b36] text-slate-900 dark:text-white focus:ring-blue-600 focus:border-blue-600 text-sm h-11 outline-none focus:ring-2"
                    id="email"
                    placeholder="exemple@email.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="phone">
                  Telephone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">call</span>
                  </div>
                  <input
                    className="block w-full pl-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#252b36] text-slate-900 dark:text-white focus:ring-blue-600 focus:border-blue-600 text-sm h-11 outline-none focus:ring-2"
                    id="phone"
                    placeholder="+213 6 00 00 00 00"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">lock</span>
                </div>
                <input
                  className="block w-full pl-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#252b36] text-slate-900 dark:text-white focus:ring-blue-600 focus:border-blue-600 text-sm h-11 outline-none focus:ring-2"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Minimum 8 caracteres. Le role cree par defaut est `client`.
              </p>
            </div>

            <button
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-colors mt-4 disabled:opacity-60"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Creation..." : "Creer un compte"}
              <span className="material-symbols-outlined ml-2 text-[18px]">arrow_forward</span>
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            En vous inscrivant, vous acceptez nos{" "}
            <a className="text-blue-600 hover:underline" href="#">conditions d'utilisation</a>{" "}
            et notre{" "}
            <a className="text-blue-600 hover:underline" href="#">politique de confidentialite</a>.
          </p>
        </div>
      </main>
    </div>
  )
}
