import { useState, useRef } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"

type SaveState = "idle" | "saving" | "saved"

export default function ClientProfile() {
  const [firstName, setFirstName] = useState("Jean")
  const [lastName,  setLastName]  = useState("Dupont")
  const [email,     setEmail]     = useState("jean@client.fr")
  const [phone,     setPhone]     = useState("+213 6 12 34 56 78")
  const [password,  setPassword]  = useState("")
  const [confirm,   setConfirm]   = useState("")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const passwordMismatch = password !== "" && confirm !== "" && password !== confirm
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (passwordMismatch) return
    setSaveState("saving")
    setTimeout(() => {
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    }, 800)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatarUrl(url)
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Mon Profil">
      <div className="p-6 max-w-2xl space-y-6">
        {/* Avatar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="size-20 rounded-full object-cover" />
              ) : (
                <div className="size-20 rounded-full bg-cyan-600 flex items-center justify-center text-white text-2xl font-bold">{initials}</div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{firstName} {lastName}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{email} · Client depuis Jan 2024</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                Changer la photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Personal info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Prénom</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Téléphone</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                type="tel"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
          </div>

          {/* Security */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Sécurité</h3>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={`w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 ${
                  passwordMismatch
                    ? "border-rose-400 focus:ring-rose-500"
                    : "border-slate-300 dark:border-slate-600 focus:ring-cyan-600"
                }`}
              />
              {passwordMismatch && (
                <p className="text-xs text-rose-500">Les mots de passe ne correspondent pas.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saveState === "saving" || passwordMismatch}
              className={`px-6 py-2.5 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2 ${
                saveState === "saved" ? "bg-emerald-600" : "bg-cyan-600 hover:bg-cyan-700"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {saveState === "saving" ? "hourglass_empty" : saveState === "saved" ? "check_circle" : "save"}
              </span>
              {saveState === "saving" ? "Sauvegarde…" : saveState === "saved" ? "Sauvegardé !" : "Sauvegarder les modifications"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
