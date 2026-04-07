import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreEngineer } from "@/data/schema"
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "@/lib/firebase-firestore"
import { formatFirestoreDate } from "@/lib/utils"

const SPECIALTIES = ["Fullstack", "Backend", "Frontend", "Mobile", "DevOps", "Data", "Security", "Cloud"]
const STATUSES = ["Disponible", "Occupé", "Congé"]

const statusColor: Record<string, string> = {
  Disponible: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  Occupé: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  Congé: "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

type Engineer = FirestoreEngineer & { id: string }

function EditSection({
  engineer,
  onSaved,
}: {
  engineer: Engineer
  onSaved: (updated: Partial<FirestoreEngineer>) => void
}) {
  const [form, setForm] = useState({
    name: engineer.name,
    email: engineer.email,
    phone: engineer.phone ?? "",
    specialty: engineer.specialty,
    status: engineer.status,
    projects: engineer.projects,
    bio: engineer.bio ?? "",
    skillsRaw: (engineer.skills ?? []).join(", "),
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!db) return
    setSaving(true)
    setError("")
    try {
      const skills = form.skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      const payload: Partial<FirestoreEngineer> = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        specialty: form.specialty,
        status: form.status,
        projects: Math.max(0, Math.floor(Number(form.projects) || 0)),
        bio: form.bio.trim() || undefined,
        skills: skills.length > 0 ? skills : undefined,
        updatedAt: serverTimestamp(),
      }
      await updateDoc(doc(db, COLLECTIONS.engineers, engineer.id), payload as Record<string, unknown>)
      onSaved(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(
          [
            { key: "name", label: "Nom complet", type: "text" },
            { key: "email", label: "Email", type: "email" },
            { key: "phone", label: "Téléphone", type: "tel" },
          ] as const
        ).map((f) => (
          <div key={f.key} className={f.key === "name" ? "sm:col-span-2" : ""}>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {f.label}
            </label>
            <input
              value={form[f.key]}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              type={f.type}
              required={f.key !== "phone"}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>
        ))}
      </div>

      {/* Role info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Spécialité
          </label>
          <select
            value={form.specialty}
            onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
          >
            {SPECIALTIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Statut
          </label>
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Projets actifs
          </label>
          <input
            type="number"
            min={0}
            value={form.projects}
            onChange={(e) => setForm((p) => ({ ...p, projects: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
          />
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          Compétences <span className="font-normal">(séparées par des virgules)</span>
        </label>
        <input
          value={form.skillsRaw}
          onChange={(e) => setForm((p) => ({ ...p, skillsRaw: e.target.value }))}
          placeholder="React, Node.js, Docker, PostgreSQL…"
          className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          Biographie / Notes
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          rows={3}
          placeholder="Présentation courte, notes internes…"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c] resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-[#db143c] hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-opacity"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Modifications enregistrées
          </span>
        )}
      </div>
    </form>
  )
}

export default function AdminEngineerDetail() {
  const { id } = useParams<{ id: string }>()
  const [engineer, setEngineer] = useState<Engineer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id || !db) {
      setError("Identifiant manquant.")
      setLoading(false)
      return
    }

    getDoc(doc(db, COLLECTIONS.engineers, id))
      .then((snap) => {
        if (!snap.exists()) {
          setError("Ingénieur introuvable.")
        } else {
          setEngineer({ id: snap.id, ...(snap.data() as FirestoreEngineer) })
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Chargement impossible.")
      })
      .finally(() => setLoading(false))
  }, [id])

  function handleSaved(updated: Partial<FirestoreEngineer>) {
    if (engineer) {
      setEngineer({ ...engineer, ...updated })
    }
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Fiche Ingénieur">
      <div className="p-6 w-full space-y-6">
        {/* Back */}
        <Link
          to="/admin/engineers"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Retour à la liste
        </Link>

        {loading && (
          <p className="text-sm text-slate-400">Chargement…</p>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {engineer && !loading && (
          <>
            {/* Profile header */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="size-20 rounded-2xl bg-[#db143c] text-white text-2xl font-bold flex items-center justify-center shrink-0">
                  {initials(engineer.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{engineer.name}</h2>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[engineer.status] ?? "text-slate-600 bg-slate-100"}`}
                    >
                      {engineer.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-0.5">{engineer.email}</p>
                  {engineer.phone && (
                    <p className="text-slate-500 text-sm">{engineer.phone}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {engineer.specialty}
                    </span>
                    <span className="text-xs text-slate-400">
                      {engineer.projects} projet{engineer.projects !== 1 ? "s" : ""} actif{engineer.projects !== 1 ? "s" : ""}
                    </span>
                    {engineer.createdAt && (
                      <span className="text-xs text-slate-400">
                        · Membre depuis {formatFirestoreDate(engineer.createdAt)}
                      </span>
                    )}
                  </div>
                  {engineer.bio && (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {engineer.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Skills badges */}
              {engineer.skills && engineer.skills.length > 0 && (
                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Compétences
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {engineer.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Projets actifs", value: String(engineer.projects), icon: "folder_open", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
                { label: "Statut", value: engineer.status, icon: "circle", color: statusColor[engineer.status] ?? "text-slate-600 bg-slate-100" },
                { label: "Spécialité", value: engineer.specialty, icon: "code", color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20" },
                {
                  label: "Compte lié",
                  value: engineer.linkedUserId ? "Oui" : "Non",
                  icon: engineer.linkedUserId ? "link" : "link_off",
                  color: engineer.linkedUserId
                    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                    : "text-slate-500 bg-slate-100 dark:bg-slate-800",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3"
                >
                  <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                    <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 truncate">{s.label}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit form */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="material-symbols-outlined text-[#db143c] text-[20px]">edit</span>
                <h3 className="font-semibold text-slate-900 dark:text-white">Modifier le profil</h3>
              </div>
              <EditSection engineer={engineer} onSaved={handleSaved} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
