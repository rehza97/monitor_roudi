import { useEffect, useState } from "react"
import { getFunctions, httpsCallable } from "firebase/functions"
import { useNavigate } from "react-router-dom"
import { IS_VITE_DEV } from "@/config/devMode"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db, firebaseApp } from "@/config/firebase"
import { COLLECTIONS, type EngineerRosterRow, type FirestoreEngineer } from "@/data/schema"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "@/lib/firebase-firestore"

type Engineer = EngineerRosterRow & {
  phone?: string
}

const statusColor: Record<string, string> = {
  Disponible: "text-emerald-700 bg-emerald-50",
  Occupé: "text-amber-700 bg-amber-50",
  Congé: "text-slate-600 bg-slate-100",
}

const specialties = ["Toutes les spécialités", "Fullstack", "Backend", "Frontend", "Mobile", "DevOps"]
const statuses = ["Disponible", "Occupé", "Congé"]

type ModalMode = { type: "add" } | { type: "edit"; engineer: Engineer } | null

function docToEngineer(id: string, data: FirestoreEngineer): Engineer {
  return {
    id,
    name: data.name,
    email: data.email,
    specialty: data.specialty,
    projects: typeof data.projects === "number" ? data.projects : 0,
    status: data.status,
    phone: typeof data.phone === "string" ? data.phone : "",
  }
}

function EngineerModal({
  mode,
  onClose,
  onSave,
  onDelete,
}: {
  mode: ModalMode
  onClose: () => void
  onSave: (e: Engineer, isNew: boolean) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}) {
  const initial: Engineer =
    mode?.type === "edit"
      ? { ...mode.engineer }
      : { id: "", name: "", email: "", specialty: "Fullstack", projects: 0, status: "Disponible", phone: "" }

  const [form, setForm] = useState<Engineer>(initial)
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [localError, setLocalError] = useState("")
  const isDev = IS_VITE_DEV

  function pickRandom<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)]
  }

  function randomDigits(length: number): string {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setLocalError("")
    setSaving(true)
    try {
      if (mode?.type === "add") {
        await createRealUserFromDev()
      }
      await onSave(
        {
          ...form,
          projects: Number.isFinite(form.projects) ? Math.max(0, Math.floor(form.projects)) : 0,
        },
        mode?.type === "add",
      )
      onClose()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Enregistrement impossible.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (mode?.type !== "edit" || !onDelete) return
    if (!window.confirm("Supprimer cet ingénieur de la liste ?")) return
    setLocalError("")
    setDeleting(true)
    try {
      await onDelete(mode.engineer.id)
      onClose()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Suppression impossible.")
    } finally {
      setDeleting(false)
    }
  }

  function autofillForDev() {
    const firstNames = ["Amine", "Nour", "Yacine", "Sara", "Lina", "Mehdi"] as const
    const lastNames = ["Benkhaled", "Mebarki", "Mansouri", "Rahmani", "Khelifi", "Bouzid"] as const
    const firstName = pickRandom(firstNames)
    const lastName = pickRandom(lastNames)
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${randomDigits(3)}@technova.dz`

    setForm((p) => ({
      ...p,
      name: `${firstName} ${lastName}`,
      email,
      phone: `+213 ${randomDigits(3)} ${randomDigits(2)} ${randomDigits(2)} ${randomDigits(2)}`,
      projects: Math.floor(Math.random() * 8),
      specialty: pickRandom(specialties.slice(1)),
      status: pickRandom(statuses),
    }))
    setLocalError("")
  }

  async function createRealUserFromDev() {
    if (!form.name.trim() || !form.email.trim()) {
      setLocalError("Nom et email requis pour créer un vrai compte.")
      return
    }

    setLocalError("")

    try {
      if (isDev) {
        const res = await fetch("/__dev/firebase/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
                phone: form.phone?.trim() || null,
                password: password.trim() || null,
            role: "engineer",
          }),
        })
        const json = (await res.json()) as {
          ok?: boolean
          uid?: string
          created?: boolean
          password?: string | null
          error?: string
        }
        if (!res.ok || !json.ok || !json.uid) {
          throw new Error(json.error || "Provisionnement impossible.")
        }

        if (json.created && json.password) {
          console.info("[Dev account created]", { uid: json.uid, password: json.password })
        }
      } else {
        if (!firebaseApp) throw new Error("Firebase app indisponible.")
        const fn = httpsCallable<
          {
            email: string
            name: string
            role: string
            organizationId?: string | null
            phone?: string | null
            password?: string | null
          },
          { uid: string; created: boolean; password?: string | null }
        >(getFunctions(firebaseApp), "createManagedUser")
        const response = await fn({
          email: form.email.trim(),
          name: form.name.trim(),
          phone: form.phone?.trim() || null,
          password: password.trim() || null,
          role: "engineer",
          organizationId: null,
        })
        const data = response.data
        if (data.created && data.password) {
          console.info("[Managed account created]", { uid: data.uid, password: data.password })
        }
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Provisionnement impossible.")
      throw err
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">
              {mode?.type === "add" ? "Ajouter un ingénieur" : "Modifier l'ingénieur"}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Renseignez le profil puis enregistrez.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDev ? (
              <button
                type="button"
                onClick={autofillForDev}
                className="h-8 px-2.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Remplir (dev)
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {localError ? (
          <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
            {localError}
          </p>
        ) : null}

        <div className="rounded-xl border border-slate-200 p-4 space-y-3.5">
          {[
            { key: "name" as const, label: "Nom complet", type: "text" },
            { key: "email" as const, label: "Email", type: "email" },
            { key: "phone" as const, label: "Téléphone", type: "tel" },
          ].map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{f.label}</label>
              <input
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                type={f.type}
                required
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 p-4 space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Mot de passe (optionnel)</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Laisser vide pour génération auto"
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
          />
        </div>

        <div className="rounded-xl border border-slate-200 p-4 space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Projets actifs</label>
            <input
              type="number"
              min={0}
              max={10000}
              value={form.projects}
              onChange={(e) => setForm((p) => ({ ...p, projects: Number(e.target.value) || 0 }))}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Spécialité</label>
              <select
                value={form.specialty}
                onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              >
                {specialties.slice(1).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {mode?.type === "edit" && onDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting || saving}
              className="py-2.5 px-3 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-50 disabled:opacity-60"
            >
              {deleting ? "…" : "Supprimer"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex-1 py-2.5 bg-[#db143c] hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-opacity"
          >
            {saving ? "Création…" : mode?.type === "add" ? "Créer profil" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminEngineers() {
  const navigate = useNavigate()
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [search, setSearch] = useState("")
  const [specialty, setSpecialty] = useState("Toutes les spécialités")
  const [modal, setModal] = useState<ModalMode>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      setListError("Firestore indisponible (configuration Firebase).")
      return
    }

    const q = query(collection(db, COLLECTIONS.engineers), orderBy("name"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListError("")
        setEngineers(
          snap.docs.map((d) => docToEngineer(d.id, d.data() as FirestoreEngineer)),
        )
        setLoading(false)
      },
      (err) => {
        setListError(err.message || "Impossible de charger les ingénieurs.")
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  async function handleSave(eng: Engineer, isNew: boolean) {
    if (!db) throw new Error("Firestore indisponible.")

    const payload = {
      name: eng.name.trim(),
      email: eng.email.trim().toLowerCase(),
      specialty: eng.specialty,
      status: eng.status,
      projects: Math.max(0, Math.min(10000, Math.floor(eng.projects))),
      phone: eng.phone?.trim() || null,
      updatedAt: serverTimestamp(),
    }

    if (isNew) {
      await addDoc(collection(db, COLLECTIONS.engineers), {
        ...payload,
        createdAt: serverTimestamp(),
      })
    } else {
      await updateDoc(doc(db, COLLECTIONS.engineers, eng.id), payload)
    }
  }

  async function handleDelete(id: string) {
    if (!db) throw new Error("Firestore indisponible.")
    await deleteDoc(doc(db, COLLECTIONS.engineers, id))
  }

  const filtered = engineers.filter((e) => {
    const q = search.toLowerCase()
    const matchSearch = e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
    const matchSpec = specialty === "Toutes les spécialités" || e.specialty === specialty
    return matchSearch && matchSpec
  })

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Gestion des Ingénieurs">
      <div className="w-full bg-[#f8f6f6] p-8 space-y-6">
        {listError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {listError}
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-[#181112] mb-1">Gestion des Ingénieurs</h2>
            <p className="text-[#896169] text-sm">Gérez la liste des ingénieurs et leurs informations professionnelles.</p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ type: "add" })}
            disabled={!db || Boolean(listError)}
            className="bg-[#db143c] hover:bg-[#b01030] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm shadow-[#db143c]/30 active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="text-sm font-semibold">Ajouter un Ingénieur</span>
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e6dbdd] flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#896169]">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#f8f6f6] border-transparent focus:border-[#db143c] focus:bg-white focus:ring-0 rounded-lg text-sm text-[#181112] placeholder-[#896169] transition-all"
              placeholder="Rechercher par nom, email ou spécialité..."
            />
          </div>
          <div className="flex gap-2">
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="px-4 py-2.5 bg-[#f8f6f6] border border-transparent hover:border-[#e6dbdd] rounded-lg text-[#896169] hover:text-[#181112] text-sm font-medium transition-all"
            >
              {specialties.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button className="px-4 py-2.5 bg-[#f8f6f6] border border-transparent hover:border-[#e6dbdd] rounded-lg text-[#896169] hover:text-[#181112] flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span className="text-sm font-medium">Exporter</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#e6dbdd] overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr>
                {["Nom & Prénom", "Coordonnées", "Spécialité", "Statut", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-[#896169]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-[#f8f6f6]/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#db143c]/10 text-[#db143c] flex items-center justify-center font-bold text-sm">
                        {e.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium text-[#181112]">{e.name}</div>
                        <div className="text-xs text-[#896169]">ID: #{e.id.slice(0, 6).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-[#181112]">
                        <span className="material-symbols-outlined text-[16px] text-[#896169]">mail</span>
                        {e.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#896169]">
                        <span className="material-symbols-outlined text-[16px]">call</span>
                        {e.phone || "—"}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[#896169]">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {e.specialty}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[e.status] ?? "text-slate-600 bg-slate-100"}`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => navigate(`/admin/engineers/${e.id}`)} className="p-2 text-[#896169] hover:text-[#db143c] hover:bg-[#db143c]/5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && !listError ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                    {engineers.length === 0
                      ? "Aucun ingénieur. Ajoutez-en un pour alimenter la liste."
                      : "Aucun ingénieur ne correspond à la recherche."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-[#e6dbdd] flex items-center justify-between bg-[#f8f6f6]/30">
            <p className="text-sm text-[#896169]">
              {loading ? "Chargement…" : `Affichage de 1 à ${filtered.length} sur ${engineers.length} ingénieurs`}
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-[#db143c] text-white text-sm font-medium shadow-sm">1</button>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <EngineerModal
          mode={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </DashboardLayout>
  )
}
