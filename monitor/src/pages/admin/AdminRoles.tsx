import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreRoleTemplate } from "@/data/schema"
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

type Role = FirestoreRoleTemplate & { id: string }

const COLOR_OPTIONS = [
  { label: "Rouge",    value: "bg-[#db143c]"   },
  { label: "Orange",   value: "bg-orange-500"   },
  { label: "Bleu",     value: "bg-blue-600"     },
  { label: "Ambre",    value: "bg-amber-500"    },
  { label: "Cyan",     value: "bg-cyan-600"     },
  { label: "Ardoise",  value: "bg-slate-500"    },
  { label: "Violet",   value: "bg-purple-600"   },
  { label: "Émeraude", value: "bg-emerald-600"  },
]

const PRESET_PERMS = [
  "Lecture",
  "Écriture",
  "Suppression",
  "Gestion utilisateurs",
  "Gestion ingénieurs",
  "Gestion matériels",
  "Validation demandes",
  "Accès rapports",
  "Accès monitoring",
  "Configuration plateforme",
]

type ModalMode = { type: "add" } | { type: "edit"; role: Role } | null

function RoleModal({
  mode,
  onClose,
  onSave,
  onDelete,
}: {
  mode: ModalMode
  onClose: () => void
  onSave: (payload: Omit<FirestoreRoleTemplate, "createdAt" | "updatedAt">, id: string | null) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}) {
  const isEdit = mode?.type === "edit"
  const init = mode?.type === "edit" ? mode.role : null

  const [name, setName] = useState(init?.name ?? "")
  const [users, setUsers] = useState(init?.users ?? 0)
  const [color, setColor] = useState(init?.color ?? "bg-slate-500")
  const [perms, setPerms] = useState<string[]>(init?.perms ?? [])
  const [permInput, setPermInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  function addPerm(p?: string) {
    const val = (p ?? permInput).trim()
    if (!val || perms.includes(val)) { setPermInput(""); return }
    setPerms(prev => [...prev, val])
    setPermInput("")
  }

  function removePerm(p: string) {
    setPerms(prev => prev.filter(x => x !== p))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError("")
    try {
      await onSave(
        { name: name.trim(), users: Math.max(0, Math.floor(users)), color, perms },
        isEdit && mode ? mode.role.id : null
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isEdit || !mode || mode.type !== "edit" || !onDelete) return
    if (!window.confirm(`Supprimer le rôle « ${mode.role.name} » ?`)) return
    setDeleting(true)
    setError("")
    try {
      await onDelete(mode.role.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5"
        onClick={e => e.stopPropagation()}
        onSubmit={e => void handleSubmit(e)}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl ${color} flex items-center justify-center text-white`}>
              <span className="material-symbols-outlined text-[20px]">shield</span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              {isEdit ? `Modifier « ${init?.name} »` : "Nouveau rôle"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Identity */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identité</h4>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom du rôle *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Ex: Manager, Superviseur…"
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre d'utilisateurs</label>
            <input
              type="number"
              min={0}
              value={users}
              onChange={e => setUsers(Number(e.target.value) || 0)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>
        </div>

        {/* Color */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Couleur de badge</h4>
          <div className="flex flex-wrap gap-3">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setColor(c.value)}
                className={`size-8 rounded-full ${c.value} ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transition-all ${
                  color === c.value ? "ring-2 ring-slate-600 dark:ring-slate-300 scale-110" : "hover:scale-105"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Permissions */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Permissions</h4>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_PERMS.filter(p => !perms.includes(p)).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => addPerm(p)}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#db143c] hover:text-[#db143c] transition-colors"
              >
                + {p}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex gap-2">
            <input
              value={permInput}
              onChange={e => setPermInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPerm() } }}
              placeholder="Permission personnalisée…"
              className="flex-1 h-9 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
            <button
              type="button"
              onClick={() => addPerm()}
              className="px-3 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>

          {/* Active permissions */}
          {perms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {perms.map(p => (
                <span key={p} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-medium">
                  {p}
                  <button type="button" onClick={() => removePerm(p)} className="text-slate-400 hover:text-rose-500 ml-0.5">
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </span>
              ))}
            </div>
          )}
          {perms.length === 0 && (
            <p className="text-xs text-slate-400 italic">Aucune permission — cliquez sur les suggestions ci-dessus.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting || saving}
              className="py-2.5 px-3 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-lg text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-60"
            >
              {deleting ? "…" : "Supprimer"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex-1 py-2.5 bg-[#db143c] hover:opacity-90 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-opacity"
          >
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le rôle"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [modal, setModal] = useState<ModalMode>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!db) {
      setLoading(false)
      setListError("Firestore indisponible.")
      return
    }

    const q = query(collection(db, COLLECTIONS.permissionRoleTemplates), orderBy("name"))
    const unsub = onSnapshot(
      q,
      snap => {
        setListError("")
        setRoles(snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreRoleTemplate) })))
        setLoading(false)
      },
      err => {
        setListError(err.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  async function handleSave(payload: Omit<FirestoreRoleTemplate, "createdAt" | "updatedAt">, id: string | null) {
    if (!db) throw new Error("Firestore indisponible.")
    if (id) {
      await updateDoc(doc(db, COLLECTIONS.permissionRoleTemplates, id), {
        ...payload,
        updatedAt: serverTimestamp(),
      })
    } else {
      await addDoc(collection(db, COLLECTIONS.permissionRoleTemplates), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }

  async function handleDelete(id: string) {
    if (!db) throw new Error("Firestore indisponible.")
    await deleteDoc(doc(db, COLLECTIONS.permissionRoleTemplates, id))
  }

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.perms.some(p => p.toLowerCase().includes(search.toLowerCase()))
  )

  const totalUsers = roles.reduce((sum, r) => sum + (r.users ?? 0), 0)

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Rôles & Permissions">
      <div className="p-6 w-full space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-4 flex-wrap text-sm">
            <span className="text-slate-500">
              <span className="font-bold text-slate-900 dark:text-white">{loading ? "…" : roles.length}</span>{" "}
              rôle{roles.length !== 1 ? "s" : ""}
            </span>
            <span className="text-slate-500">
              <span className="font-bold text-slate-900 dark:text-white">{totalUsers}</span> utilisateur{totalUsers !== 1 ? "s" : ""} assigné{totalUsers !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un rôle…"
                className="pl-9 pr-3 h-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
              />
            </div>
            <button
              type="button"
              disabled={!db}
              onClick={() => setModal({ type: "add" })}
              className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nouveau rôle
            </button>
          </div>
        </div>

        {listError && (
          <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {listError}
          </div>
        )}

        {/* Roles grid */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-6 py-16 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-600 mb-3 block">shield</span>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {roles.length === 0
                ? "Aucun rôle défini. Créez votre premier rôle."
                : "Aucun rôle ne correspond à la recherche."}
            </p>
            {roles.length === 0 && (
              <button
                type="button"
                onClick={() => setModal({ type: "add" })}
                className="mt-4 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90"
              >
                Créer un rôle
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className={`size-12 rounded-xl ${r.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                  <span className="material-symbols-outlined text-[22px]">shield</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{r.name}</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {r.users} utilisateur{r.users !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {r.perms.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {r.perms.map(p => (
                        <span key={p} className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Aucune permission définie</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setModal({ type: "edit", role: r })}
                  className="shrink-0 size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#db143c] hover:text-[#db143c] text-slate-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <RoleModal
          key={modal.type === "edit" ? modal.role.id : "add"}
          mode={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </DashboardLayout>
  )
}
