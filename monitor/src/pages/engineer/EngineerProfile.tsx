import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  doc, getDoc, updateDoc, serverTimestamp,
  collection, query, where, getDocs,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreEngineer } from "@/data/schema"

type SaveState = "idle" | "saving" | "saved" | "error"

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Disponible", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
  { value: "busy",      label: "Occupé",     color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  { value: "on_leave",  label: "En congé",   color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
]

export default function EngineerProfile() {
  const { user } = useAuth()

  const [name, setName]               = useState(user?.name ?? "")
  const [phone, setPhone]             = useState("")
  const [specialty, setSpecialty]     = useState("")
  const [bio, setBio]                 = useState("")
  const [availability, setAvailability] = useState("available")
  const [skills, setSkills]           = useState<string[]>([])
  const [skillInput, setSkillInput]   = useState("")
  const [engineerDocId, setEngineerDocId] = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [saveState, setSaveState]     = useState<SaveState>("idle")
  const [errorMsg, setErrorMsg]       = useState("")

  useEffect(() => {
    if (!db || !user?.id) { setLoading(false); return }
    let cancelled = false

    async function load() {
      const userSnap = await getDoc(doc(db!, COLLECTIONS.users, user!.id))
      if (!cancelled && userSnap.exists()) {
        const d = userSnap.data() as Record<string, unknown>
        setName(typeof d.name === "string" ? d.name : user!.name ?? "")
        setPhone(typeof d.phone === "string" ? d.phone : "")
      }

      const q = query(
        collection(db!, COLLECTIONS.engineers),
        where("linkedUserId", "==", user!.id),
      )
      const snap = await getDocs(q)
      if (!cancelled && !snap.empty) {
        const engDoc = snap.docs[0]
        const d = engDoc.data() as FirestoreEngineer
        setEngineerDocId(engDoc.id)
        setSpecialty(d.specialty ?? "")
        setBio(d.bio ?? "")
        setSkills(Array.isArray(d.skills) ? d.skills : [])
        const extra = d as unknown as Record<string, unknown>
        if (typeof extra.availability === "string") {
          setAvailability(extra.availability)
        }
      }

      if (!cancelled) setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [user?.id])

  function addSkill() {
    const s = skillInput.trim()
    if (!s || skills.includes(s)) return
    setSkills((p) => [...p, s])
    setSkillInput("")
  }

  function removeSkill(s: string) {
    setSkills((p) => p.filter((x) => x !== s))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !user?.id) return
    setSaveState("saving")
    setErrorMsg("")
    try {
      await updateDoc(doc(db, COLLECTIONS.users, user.id), {
        name: name.trim(),
        phone: phone.trim(),
        updatedAt: serverTimestamp(),
      })
      if (engineerDocId) {
        await updateDoc(doc(db, COLLECTIONS.engineers, engineerDocId), {
          name: name.trim(),
          specialty: specialty.trim(),
          bio: bio.trim(),
          skills,
          availability,
          updatedAt: serverTimestamp(),
        })
      }
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.")
      setSaveState("error")
      setTimeout(() => setSaveState("idle"), 4000)
    }
  }

  const currentAvail = AVAILABILITY_OPTIONS.find((o) => o.value === availability) ?? AVAILABILITY_OPTIONS[0]

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Mon Profil">
      <div className="p-6 w-full space-y-6">

        {/* Avatar card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          {loading ? (
            <div className="flex items-center gap-5 animate-pulse">
              <div className="size-20 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3.5 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-5">
              <div
                className="size-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 select-none"
                style={{ backgroundColor: user?.avatarColor ?? "#2463eb" }}
              >
                {user?.initials ?? "?"}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{name || "—"}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400">
                    Ingénieur
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${currentAvail.color}`}>
                    {currentAvail.label}
                  </span>
                  {specialty && (
                    <span className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {specialty}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="space-y-6">

          {/* Personal info */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Informations personnelles</h3>
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom complet</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email <span className="text-xs text-slate-400 font-normal">(non modifiable)</span>
                  </label>
                  <input
                    value={user?.email ?? ""}
                    readOnly
                    tabIndex={-1}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Téléphone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="+213 6 00 00 00 00"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Engineer-specific */}
          {!loading && (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Profil technique</h3>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Spécialité</label>
                  <input
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ex: DevOps, Backend, Infrastructure…"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bio / Notes</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Présentation courte, domaines d'expertise…"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Compétences</label>
                  <div className="flex gap-2">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill() } }}
                      placeholder="Ex: Docker, Kubernetes, PostgreSQL…"
                      className="flex-1 h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-3 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                    >
                      Ajouter
                    </button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {skills.map((s) => (
                        <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          {s}
                          <button type="button" onClick={() => removeSkill(s)} className="hover:text-blue-900 dark:hover:text-blue-100">
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">Disponibilité</h3>
                <div className="flex gap-3 flex-wrap">
                  {AVAILABILITY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setAvailability(o.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                        availability === o.value
                          ? `border-current ${o.color}`
                          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {saveState === "error" && errorMsg && (
            <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-4 py-2.5 rounded-lg">{errorMsg}</p>
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
                saveState === "saved" ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"
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
