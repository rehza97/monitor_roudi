import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { doc, getDoc, updateDoc, serverTimestamp } from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"

type SaveState = "idle" | "saving" | "saved" | "error"

interface ProfileFields {
  name: string
  email: string
  phone: string
  organizationId: string
}

export default function ClientProfile() {
  const { user } = useAuth()

  const [fields, setFields] = useState<ProfileFields>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    organizationId: user?.organizationId ?? "",
  })
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!db || !user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false

    getDoc(doc(db, COLLECTIONS.users, user.id))
      .then((snap) => {
        if (cancelled || !snap.exists()) return
        const data = snap.data() as Record<string, unknown>
        setFields({
          name: typeof data.name === "string" ? data.name : user.name ?? "",
          email: typeof data.email === "string" ? data.email : user.email ?? "",
          phone: typeof data.phone === "string" ? data.phone : "",
          organizationId: typeof data.organizationId === "string" ? data.organizationId : user.organizationId ?? "",
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !user?.id) return
    setSaveState("saving")
    setErrorMsg("")
    try {
      await updateDoc(doc(db, COLLECTIONS.users, user.id), {
        name: fields.name.trim(),
        phone: fields.phone.trim(),
        updatedAt: serverTimestamp(),
      })
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.")
      setSaveState("error")
      setTimeout(() => setSaveState("idle"), 4000)
    }
  }

  const roleBadge: Record<string, string> = {
    client: "text-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 dark:text-cyan-400",
    admin: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
    engineer: "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
    technician: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  }

  const roleLabel: Record<string, string> = {
    client: "Client",
    admin: "Administrateur",
    engineer: "Ingénieur",
    technician: "Technicien",
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Mon Profil">
      <div className="p-6 w-full space-y-6">

        {/* Avatar card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          {loading ? (
            <div className="flex items-center gap-5 animate-pulse">
              <div className="size-20 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3.5 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <div
                className="size-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 select-none"
                style={{ backgroundColor: user?.avatarColor ?? "#db143c" }}
              >
                {user?.initials ?? "?"}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{fields.name || "—"}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{fields.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadge[user?.role ?? "client"] ?? roleBadge.client}`}
                  >
                    {roleLabel[user?.role ?? "client"] ?? user?.role}
                  </span>
                  {fields.organizationId && (
                    <span className="text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      org: {fields.organizationId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit form */}
        <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Informations personnelles</h3>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nom complet
                  </label>
                  <input
                    value={fields.name}
                    onChange={(e) => setFields((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Votre nom"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                  />
                </div>

                {/* Email — readonly */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                    <span className="ml-2 text-xs text-slate-400 font-normal">(non modifiable)</span>
                  </label>
                  <input
                    value={fields.email}
                    readOnly
                    tabIndex={-1}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Téléphone
                  </label>
                  <input
                    value={fields.phone}
                    onChange={(e) => setFields((p) => ({ ...p, phone: e.target.value }))}
                    type="tel"
                    placeholder="+213 6 00 00 00 00"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Organisation info (read-only) */}
          {!loading && fields.organizationId && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white">Organisation</h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div className="size-9 rounded-lg bg-[#db143c]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#db143c] text-[18px]">corporate_fare</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">ID Organisation</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{fields.organizationId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Feedback */}
          {saveState === "error" && errorMsg && (
            <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-4 py-2.5 rounded-lg">
              {errorMsg}
            </p>
          )}

          {saveState === "saved" && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 rounded-lg">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Profil mis à jour avec succès.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || saveState === "saving"}
              className={`flex items-center gap-2 px-6 py-2.5 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 ${
                saveState === "saved"
                  ? "bg-emerald-600"
                  : "bg-[#db143c] hover:opacity-90"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {saveState === "saving"
                  ? "hourglass_empty"
                  : saveState === "saved"
                  ? "check_circle"
                  : "save"}
              </span>
              {saveState === "saving"
                ? "Sauvegarde…"
                : saveState === "saved"
                ? "Sauvegardé !"
                : "Sauvegarder les modifications"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
