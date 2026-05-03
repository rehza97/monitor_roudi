import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS, type UserRole } from "@/data/schema"
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "@/lib/firebase-firestore"
import { formatFirestoreDateTime } from "@/lib/utils"
import { createManagedUser, deleteManagedUser, setManagedUserPassword } from "@/lib/managed-users"

type ManagedRow = {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId?: string
  accountType?: string
  phone?: string
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
      return "text-rose-700 bg-rose-50"
    case "client":
      return "text-cyan-700 bg-cyan-50"
    case "engineer":
      return "text-blue-700 bg-blue-50"
    case "technician":
      return "text-amber-700 bg-amber-50"
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
  onSave: (
    payload: {
      name: string
      email: string
      organizationId?: string
      accountType?: string
      phone?: string
      password?: string
    },
    id: string | null,
  ) => Promise<void>
}) {
  const isEdit = mode?.type === "edit"
  const init = isEdit ? mode.row : null
  const [name, setName] = useState(init?.name ?? "")
  const [email, setEmail] = useState(init?.email ?? "")
  const [organizationId, setOrganizationId] = useState(init?.organizationId ?? "")
  const [accountType, setAccountType] = useState(init?.accountType ?? "other")
  const [phone, setPhone] = useState(init?.phone ?? "")
  const [password, setPassword] = useState("")
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
          phone: phone.trim() || undefined,
          password: password.trim() || undefined,
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
        className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void submit(e)}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">
            {isEdit ? `Modifier ${roleLabel(role).slice(0, -1)}` : `Créer ${roleLabel(role).slice(0, -1)}`}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error ? (
          <p className="text-sm text-rose-700 bg-rose-50 px-3 py-2 rounded-lg whitespace-pre-wrap">
            {error}
          </p>
        ) : null}
        {createdPassword ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
            Mot de passe temporaire: <strong>{createdPassword}</strong>
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Nom complet</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Organization ID</label>
            <input
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="optionnel"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Type compte</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
            >
              <option value="other">other</option>
              <option value="student">student</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+213..."
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              {isEdit ? "Nouveau mot de passe (optionnel)" : "Mot de passe (optionnel)"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Laisser vide pour conserver" : "Sinon genere automatiquement"}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-[#db143c] hover:bg-[#b91032] text-white rounded-lg text-sm font-bold disabled:opacity-60"
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
            phone: typeof data.phone === "string" ? data.phone : undefined,
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
    payload: {
      name: string
      email: string
      organizationId?: string
      accountType?: string
      phone?: string
      password?: string
    },
    id: string | null,
  ) {
    if (!db) throw new Error("Firestore indisponible.")
    if (id) {
      await updateDoc(doc(db, COLLECTIONS.users, id), {
        name: payload.name,
        email: payload.email,
        organizationId: payload.organizationId ?? null,
        accountType: payload.accountType ?? null,
        phone: payload.phone ?? null,
        updatedAt: serverTimestamp(),
      })
      if (payload.password?.trim()) {
        await setManagedUserPassword(id, payload.password)
      }
      return
    }

    const created = await createManagedUser({
      email: payload.email,
      name: payload.name,
      role,
      organizationId: payload.organizationId ?? null,
      phone: payload.phone ?? null,
      password: payload.password ?? null,
    })

    await updateDoc(doc(db, COLLECTIONS.users, created.uid), {
      accountType: payload.accountType ?? null,
      phone: payload.phone ?? null,
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
      <div className="p-6 w-full space-y-6 bg-[#f8f6f6] min-h-[calc(100vh-64px)]">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-[#181112]">Rôles et Permissions</h2>
            <p className="text-[#896169] mt-1">Gestion des comptes {roleLabel(role).toLowerCase()} et accès applicatifs.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-white border border-[#e6dbdd] px-4 py-2.5 rounded-lg text-sm font-medium text-[#181112]">Historique</button>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
              className="w-full pl-10 pr-4 h-10 rounded-lg border border-[#e6dbdd] bg-white text-sm"
              placeholder={`Rechercher ${roleLabel(role).toLowerCase()}...`}
            />
          </div>
          <button
            type="button"
            onClick={() => setModal({ type: "add" })}
            className="px-4 py-2 bg-[#db143c] text-white rounded-lg text-sm font-semibold hover:bg-[#b91032]"
          >
            Créer {roleLabel(role).slice(0, -1)}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#e6dbdd] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[#e6dbdd] text-xs text-[#896169]">
            {loading ? "Chargement…" : `${filtered.length} compte(s)`}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[#fff5f7]">
              <tr>
                {["Nom", "Email", "Role", "Org", "Créé", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-[#896169] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1e7e9]">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-[#fff8fa]">
                  <td className="px-4 py-3 font-medium text-[#181112]">{r.name}</td>
                  <td className="px-4 py-3 text-[#896169]">{r.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${roleBadge(r.role)}`}>
                      {r.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#896169]">{r.organizationId ?? "—"}</td>
                  <td className="px-4 py-3 text-[#896169]">{formatFirestoreDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link to={`/admin/users/${role}/${r.id}`} className="text-xs text-[#db143c] font-semibold hover:underline">
                        Profil
                      </Link>
                      <button type="button" onClick={() => setModal({ type: "edit", row: r })} className="text-xs text-[#896169] hover:text-[#181112]">
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
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#896169]">
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
