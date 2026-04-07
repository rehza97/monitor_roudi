import { useEffect, useState } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS, type UserRole } from "@/data/schema"
import { doc, getDoc, serverTimestamp, updateDoc } from "@/lib/firebase-firestore"
import { deleteManagedUser } from "@/lib/managed-users"

const ROLE_SET = new Set<UserRole>(["admin", "client", "engineer", "technician"])

function isUserRole(value: string): value is UserRole {
  return ROLE_SET.has(value as UserRole)
}

export default function AdminUserProfile() {
  const params = useParams<{ role: string; id: string }>()
  const navigate = useNavigate()

  const role = params.role
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "client" as UserRole,
    organizationId: "",
    accountType: "other",
    phone: "",
    bio: "",
  })

  useEffect(() => {
    if (!db || !id) {
      setLoading(false)
      setError("Firestore indisponible.")
      return
    }
    getDoc(doc(db, COLLECTIONS.users, id))
      .then((snap) => {
        if (!snap.exists()) {
          setError("Utilisateur introuvable.")
          return
        }
        const data = snap.data() as Record<string, unknown>
        setForm({
          name: typeof data.name === "string" ? data.name : "",
          email: typeof data.email === "string" ? data.email : "",
          role: typeof data.role === "string" && isUserRole(data.role) ? data.role : "client",
          organizationId: typeof data.organizationId === "string" ? data.organizationId : "",
          accountType: typeof data.accountType === "string" ? data.accountType : "other",
          phone: typeof data.phone === "string" ? data.phone : "",
          bio: typeof data.bio === "string" ? data.bio : "",
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false))
  }, [id])

  if (!role || !isUserRole(role) || !id) return <Navigate to="/admin/dashboard" replace />

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!db || !id) return
    setSaving(true)
    setError("")
    try {
      await updateDoc(doc(db, COLLECTIONS.users, id), {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        organizationId: form.organizationId.trim() || null,
        accountType: form.accountType.trim() || null,
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    if (!window.confirm("Supprimer ce compte (Auth + profil) ?")) return
    setDeleting(true)
    setError("")
    try {
      await deleteManagedUser(id)
      navigate(`/admin/users/${role}s`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.")
      setDeleting(false)
    }
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Profil Utilisateur">
      <div className="p-6 w-full space-y-6">
        <Link to={`/admin/users/${role}s`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Retour à la liste
        </Link>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSave(e)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rôle</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="admin">admin</option>
                <option value="client">client</option>
                <option value="engineer">engineer</option>
                <option value="technician">technician</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organization ID</label>
              <input
                value={form.organizationId}
                onChange={(e) => setForm((p) => ({ ...p, organizationId: e.target.value }))}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type compte</label>
              <select
                value={form.accountType}
                onChange={(e) => setForm((p) => ({ ...p, accountType: e.target.value }))}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="other">other</option>
                <option value="student">student</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Téléphone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                disabled={loading}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bio</label>
            <textarea
              rows={4}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={loading || deleting || saving}
              className="py-2.5 px-3 border border-rose-200 dark:border-rose-900 text-rose-600 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
            <button
              type="submit"
              disabled={loading || saving || deleting}
              className="py-2.5 px-5 bg-[#db143c] text-white rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
