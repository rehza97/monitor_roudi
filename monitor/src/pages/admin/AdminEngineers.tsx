import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import type { EngineerRosterRow } from "@/data/schema"
import { engineerRoster } from "@/data/seed"

type Engineer = EngineerRosterRow

const statusColor: Record<string, string> = {
  Disponible: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  Occupé:     "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  Congé:      "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400",
}

const specialties = ["Toutes les spécialités", "Fullstack", "Backend", "Frontend", "Mobile", "DevOps"]
const statuses    = ["Disponible", "Occupé", "Congé"]

type ModalMode = { type: "add" } | { type: "edit"; engineer: Engineer } | null

function EngineerModal({ mode, onClose, onSave }: {
  mode: ModalMode; onClose: () => void; onSave: (e: Engineer, isNew: boolean) => void
}) {
  const initial: Engineer = mode?.type === "edit"
    ? { ...mode.engineer }
    : { id: "", name: "", email: "", specialty: "Fullstack", projects: 0, status: "Disponible" }

  const [form, setForm]   = useState<Engineer>(initial)
  const [saving, setSaving] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    setTimeout(() => {
      const payload =
        mode?.type === "add" && !form.id.trim()
          ? { ...form, id: `e-${Date.now()}` }
          : form
      onSave(payload, mode?.type === "add")
      onClose()
    }, 700)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {mode?.type === "add" ? "Ajouter un ingénieur" : "Modifier l'ingénieur"}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {[
          { key: "name"  as const, label: "Nom complet",  type: "text"  },
          { key: "email" as const, label: "Email",        type: "email" },
        ].map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
            <input
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              type={f.type}
              required
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Spécialité</label>
            <select
              value={form.specialty}
              onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            >
              {specialties.slice(1).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Statut</label>
            <select
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            >
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-[#db143c] hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-opacity"
          >
            {saving ? "Enregistrement…" : mode?.type === "add" ? "Ajouter" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminEngineers() {
  const [engineers, setEngineers] = useState<Engineer[]>(() => [...engineerRoster])
  const [search, setSearch]       = useState("")
  const [specialty, setSpecialty] = useState("Toutes les spécialités")
  const [modal, setModal]         = useState<ModalMode>(null)

  const filtered = engineers.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
    const matchSpec   = specialty === "Toutes les spécialités" || e.specialty === specialty
    return matchSearch && matchSpec
  })

  function handleSave(eng: Engineer, isNew: boolean) {
    if (isNew) {
      setEngineers(prev => [...prev, eng])
    } else {
      setEngineers(prev => prev.map(e => e.id === eng.id ? eng : e))
    }
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Gestion des Ingénieurs">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-slate-500 dark:text-slate-400 text-sm">{filtered.length} ingénieur{filtered.length !== 1 ? "s" : ""}</p>
          <button
            onClick={() => setModal({ type: "add" })}
            className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>Ajouter un ingénieur
          </button>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              placeholder="Rechercher un ingénieur…"
            />
          </div>
          <select
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none"
          >
            {specialties.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {["Ingénieur", "Spécialité", "Projets actifs", "Statut", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-[#db143c] text-white text-xs font-bold flex items-center justify-center">
                        {e.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{e.name}</p>
                        <p className="text-xs text-slate-400">{e.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{e.specialty}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{e.projects}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setModal({ type: "edit", engineer: e })}
                      className="text-xs text-[#db143c] font-medium hover:opacity-80 flex items-center gap-0.5"
                    >
                      Gérer <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                    Aucun ingénieur ne correspond à la recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <EngineerModal
          mode={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </DashboardLayout>
  )
}
