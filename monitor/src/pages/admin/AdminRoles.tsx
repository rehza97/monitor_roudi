import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import type { PermissionRoleTemplate } from "@/data/schema"
import { permissionRoleTemplates } from "@/data/seed"

type Role = PermissionRoleTemplate

type ModalMode = { type: "add" } | { type: "edit"; role: Role } | null

function RoleModal({ mode, onClose, onSave }: {
  mode: ModalMode; onClose: () => void; onSave: (r: Role, isNew: boolean) => void
}) {
  const initial: Role = mode?.type === "edit"
    ? { ...mode.role, perms: [...mode.role.perms] }
    : { id: "", name: "", users: 0, perms: [], color: "bg-slate-500" }

  const [form, setForm]     = useState<Role>(initial)
  const [permInput, setPermInput] = useState("")
  const [saving, setSaving] = useState(false)

  const colorOptions = [
    { label: "Rouge",   value: "bg-[#db143c]"  },
    { label: "Orange",  value: "bg-orange-500"  },
    { label: "Bleu",    value: "bg-blue-600"    },
    { label: "Ambre",   value: "bg-amber-500"   },
    { label: "Cyan",    value: "bg-cyan-600"    },
    { label: "Ardoise", value: "bg-slate-500"   },
    { label: "Violet",  value: "bg-purple-600"  },
    { label: "Émeraude",value: "bg-emerald-600" },
  ]

  function addPerm() {
    const p = permInput.trim()
    if (!p || form.perms.includes(p)) return
    setForm(prev => ({ ...prev, perms: [...prev.perms, p] }))
    setPermInput("")
  }

  function removePerm(p: string) {
    setForm(prev => ({ ...prev, perms: prev.perms.filter(x => x !== p) }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setTimeout(() => {
      const withId =
        mode?.type === "add" && !form.id.trim()
          ? { ...form, id: `pr-${Date.now()}` }
          : form
      onSave(withId, mode?.type === "add")
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
            {mode?.type === "add" ? "Nouveau rôle" : `Modifier "${form.name}"`}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom du rôle</label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            placeholder="Ex: Manager"
          />
        </div>

        {/* Color picker */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm(p => ({ ...p, color: c.value }))}
                className={`size-7 rounded-full ${c.value} ring-offset-2 transition-all ${form.color === c.value ? "ring-2 ring-slate-400 dark:ring-slate-300" : ""}`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Permissions</label>
          <div className="flex gap-2">
            <input
              value={permInput}
              onChange={e => setPermInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPerm() } }}
              className="flex-1 h-9 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              placeholder="Ajouter une permission…"
            />
            <button type="button" onClick={addPerm} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-700">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {form.perms.map(p => (
              <span key={p} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                {p}
                <button type="button" onClick={() => removePerm(p)} className="text-slate-400 hover:text-slate-600 ml-0.5">
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#db143c] hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold rounded-lg">
            {saving ? "Enregistrement…" : mode?.type === "add" ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<Role[]>(() => [...permissionRoleTemplates])
  const [modal, setModal] = useState<ModalMode>(null)

  function handleSave(role: Role, isNew: boolean) {
    if (isNew) {
      setRoles(prev => [...prev, role])
    } else {
      setRoles(prev => prev.map(r => r.id === role.id ? role : r))
    }
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Rôles & Permissions">
      <div className="p-6 space-y-5 max-w-4xl">
        <div className="flex justify-end">
          <button
            onClick={() => setModal({ type: "add" })}
            className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>Nouveau rôle
          </button>
        </div>
        <div className="space-y-3">
          {roles.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-5">
              <div className={`size-10 rounded-lg ${r.color} flex items-center justify-center text-white shrink-0`}>
                <span className="material-symbols-outlined text-[20px]">shield</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{r.name}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{r.users} utilisateur{r.users > 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.perms.map(p => (
                    <span key={p} className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setModal({ type: "edit", role: r })}
                className="shrink-0 size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <RoleModal
          mode={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </DashboardLayout>
  )
}
