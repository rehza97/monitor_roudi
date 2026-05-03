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
  }, [user?.id, user?.email, user?.name, user?.organizationId])

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
      setTimeout(() => setSaveState("idle"), 2500)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.")
      setSaveState("error")
      setTimeout(() => setSaveState("idle"), 4000)
    }
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Mon Profil">
      <div className="p-6 w-full space-y-6 bg-[#f8fafc] min-h-[calc(100vh-64px)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Paramètres du profil</h2>
          <p className="text-slate-500 mt-1">Gérez vos informations personnelles et votre identité client.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-sm">
              {loading ? (
                <div className="space-y-3 animate-pulse w-full flex flex-col items-center">
                  <div className="size-32 rounded-full bg-slate-200" />
                  <div className="h-5 w-36 rounded bg-slate-200" />
                  <div className="h-3.5 w-24 rounded bg-slate-100" />
                </div>
              ) : (
                <>
                  <div
                    className="size-32 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-slate-100"
                    style={{ backgroundColor: user?.avatarColor ?? "#0891b2" }}
                  >
                    {user?.initials ?? "?"}
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-900">{fields.name || "—"}</h3>
                  <p className="text-slate-500 text-sm mb-4">Client</p>
                  <button className="w-full py-2 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                    Modifier la photo
                  </button>
                </>
              )}
            </div>

            <div className="bg-cyan-50 rounded-xl border border-cyan-100 p-6">
              <h4 className="text-cyan-700 font-semibold mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">verified</span>
                Compte vérifié
              </h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Vos informations sont synchronisées avec Firestore et prêtes pour les services Rodaina.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/70">
                  <span className="material-symbols-outlined text-cyan-600">badge</span>
                  <h3 className="font-semibold text-lg text-slate-900">Informations Personnelles</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Nom complet</span>
                    <input
                      value={fields.name}
                      onChange={(e) => setFields((p) => ({ ...p, name: e.target.value }))}
                      required
                      placeholder="Votre nom"
                      className="w-full h-11 px-3 text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Téléphone</span>
                    <input
                      value={fields.phone}
                      onChange={(e) => setFields((p) => ({ ...p, phone: e.target.value }))}
                      type="tel"
                      placeholder="+213 6 00 00 00 00"
                      className="w-full h-11 px-3 text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                    />
                  </label>
                  <label className="flex flex-col gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Email</span>
                    <input
                      value={fields.email}
                      readOnly
                      tabIndex={-1}
                      className="w-full h-11 px-3 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed select-none"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/70">
                  <span className="material-symbols-outlined text-cyan-600">corporate_fare</span>
                  <h3 className="font-semibold text-lg text-slate-900">Organisation</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="size-10 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-cyan-700 text-[18px]">apartment</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">ID Organisation</p>
                      <p className="text-xs font-mono text-slate-500">{fields.organizationId || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {saveState === "error" && errorMsg && (
                <p className="text-sm text-rose-600 bg-rose-50 px-4 py-2.5 rounded-lg">{errorMsg}</p>
              )}

              {saveState === "saved" && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-lg">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Profil mis à jour avec succès.
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || saveState === "saving"}
                  className={`flex items-center gap-2 px-6 py-2.5 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 ${
                    saveState === "saved" ? "bg-emerald-600" : "bg-[#0891b2] hover:bg-cyan-700"
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
                    : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
