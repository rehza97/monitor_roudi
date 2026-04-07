import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS, type UserRole } from "@/data/schema"
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "@/lib/firebase-firestore"
import { formatFirestoreDateTime } from "@/lib/utils"
import { createManagedUser, deleteManagedUser } from "@/lib/managed-users"

type ManagedRow = {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId?: string
  accountType?: string
  createdAt?: unknown
}

type ModalMode = { type: "add" } | { type: "edit"; row: ManagedRow } | null

function roleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Admins"
    case "client":
      return "Clients"
    case "engineer":
      return "Ingénieurs"
    case "technician":
      return "Techniciens"
  }
}

function roleBadge(role: UserRole): string {
  switch (role) {
    case "admin":
      return "text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400"
    case "client":
      return "text-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-400"
    case "engineer":
      return "text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"
    case "technician":
      return "text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
  }
}

function UserModal({
  role,
  mode,
  onClose,
  onSave,
}: {
  role: UserRole
  mode: ModalMode
  onClose: () => void
  onSave: (payload: { name: string; email: string; organizationId?: string; accountType?: string }, id: string | null) => Promise<void>
}) {
  const isEdit = mode?.type === "edit"
  const init = isEdit ? mode.row : null
  const [name, setName] = useState(init?.name ?? "")
  const [email, setEmail] = useState(init?.email ?? "")
  const [organizationId, setOrganizationId] = useState(init?.organizationId ?? "")
  const [accountType, setAccountType] = useState(init?.accountType ?? "other")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setCreatedPassword(null)
    try {
      await onSave(
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          organizationId: organizationId.trim() || undefined,
          accountType: accountType.trim() || undefined,
        },
        isEdit && init ? init.id : null,
      )
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur."
      setError(message)
      const passMatch = message.match(/TEMP_PASSWORD:\s*([^\s]+)/)
      setCreatedPassword(passMatch?.[1] ?? null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void submit(e)}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {isEdit ? `Modifier ${roleLabel(role).slice(0, -1)}` : `Créer ${roleLabel(role).slice(0, -1)}`}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error ? (
          <p className="text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 px-3 py-2 rounded-lg whitespace-pre-wrap">
            {error}
          </p>
        ) : null}
        {createdPassword ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-2 rounded-lg">
            Mot de passe temporaire: <strong>{createdPassword}</strong>
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom complet</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organization ID</label>
            <input
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="optionnel"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type compte</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              <option value="other">other</option>
              <option value="student">student</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-[#db143c] text-white rounded-lg text-sm font-bold disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer profil (Auth + Profil)"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminUsersRolePage({
  role,
  pageTitle,
}: {
  role: UserRole
  pageTitle: string
}) {
  const [rows, setRows] = useState<ManagedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState<ModalMode>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      setError("Firestore indisponible.")
      return
    }
    const q = query(
      collection(db, COLLECTIONS.users),
      where("role", "==", role),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setError("")
        const mapped = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>
          return {
            id: d.id,
            role,
            name: typeof data.name === "string" ? data.name : "—",
            email: typeof data.email === "string" ? data.email : "—",
            organizationId: typeof data.organizationId === "string" ? data.organizationId : undefined,
            accountType: typeof data.accountType === "string" ? data.accountType : undefined,
            createdAt: data.createdAt,
          }
        })
        mapped.sort((a, b) => a.name.localeCompare(b.name))
        setRows(mapped)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [role])

  async function handleSave(
    payload: { name: string; email: string; organizationId?: string; accountType?: string },
    id: string | null,
  ) {
    if (!db) throw new Error("Firestore indisponible.")
    if (id) {
      await updateDoc(doc(db, COLLECTIONS.users, id), {
        name: payload.name,
        email: payload.email,
        organizationId: payload.organizationId ?? null,
        accountType: payload.accountType ?? null,
        updatedAt: serverTimestamp(),
      })
      return
    }

    const created = await createManagedUser({
      email: payload.email,
      name: payload.name,
      role,
      organizationId: payload.organizationId ?? null,
    })

    await updateDoc(doc(db, COLLECTIONS.users, created.uid), {
      accountType: payload.accountType ?? null,
      updatedAt: serverTimestamp(),
    })

    if (created.created && created.password) {
      throw new Error(`Compte créé.\nUID: ${created.uid}\nTEMP_PASSWORD: ${created.password}`)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Supprimer ce compte utilisateur ?")) return
    await deleteManagedUser(id)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.id.includes(q))
  }, [rows, search])

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle={pageTitle}>
      <div className="p-6 w-full space-y-5">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              placeholder={`Rechercher ${roleLabel(role).toLowerCase()}...`}
            />
          </div>
          <button
            type="button"
            onClick={() => setModal({ type: "add" })}
            className="px-4 py-2 bg-[#db143c] text-white rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Créer {roleLabel(role).slice(0, -1)}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            {loading ? "Chargement…" : `${filtered.length} compte(s)`}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/40">
              <tr>
                {["Nom", "Email", "Role", "Org", "Créé", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${roleBadge(r.role)}`}>
                      {r.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.organizationId ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatFirestoreDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link to={`/admin/users/${role}/${r.id}`} className="text-xs text-[#db143c] font-semibold hover:underline">
                        Profil
                      </Link>
                      <button
                        type="button"
                        onClick={() => setModal({ type: "edit", row: r })}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(r.id)}
                        className="text-xs text-rose-600 hover:text-rose-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    Aucun compte.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {modal ? (
        <UserModal role={role} mode={modal} onClose={() => setModal(null)} onSave={handleSave} />
      ) : null}
    </DashboardLayout>
  )
}
