import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, ORDER_KIND, type FirestoreOrder } from "@/data/schema"
import { formatFirestoreDate } from "@/lib/utils"

interface OrderDoc extends FirestoreOrder {
  id: string
}

const STATUS_TABS = ["Tous", "En attente", "Validée", "En cours", "Rejetée"]

const statusColor: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Validée":    "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "En cours":   "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "Rejetée":    "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  "Livré":      "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300",
}

const priorityColor: Record<string, string> = {
  "Urgente": "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
  "Haute":   "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Normale": "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  "Basse":   "text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300",
}

const INPUT_CLS =
  "w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
const TEXTAREA_CLS =
  "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c] resize-none"
const LABEL_CLS = "text-sm font-medium text-slate-700 dark:text-slate-300"
const EDITABLE_STATUSES = new Set(["En attente", "Brouillon"])

interface FormData {
  requestType: string
  budgetLabel: string
  timelineLabel: string
  priority: string
  description: string
  features: string
}

const EMPTY_FORM: FormData = {
  requestType: "",
  budgetLabel: "",
  timelineLabel: "",
  priority: "Normale",
  description: "",
  features: "",
}

function RequestModal({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
  isEdit,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: FormData) => Promise<void>
  onDelete?: () => Promise<void>
  initial: FormData
  isEdit: boolean
  saving: boolean
}) {
  const [form, setForm] = useState<FormData>(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setForm(initial)
    setConfirmDelete(false)
  }, [initial, open])

  if (!open) return null

  function set(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSave(form)
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white text-lg">
            {isEdit ? "Modifier la demande" : "Nouvelle demande"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Type de demande <span className="text-rose-500">*</span></label>
            <input
              required
              value={form.requestType}
              onChange={(e) => set("requestType", e.target.value)}
              className={INPUT_CLS}
              placeholder="Ex. Développement web, Application mobile…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Budget estimé</label>
              <input
                value={form.budgetLabel}
                onChange={(e) => set("budgetLabel", e.target.value)}
                className={INPUT_CLS}
                placeholder="Ex. 500 000 DA"
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL_CLS}>Délai souhaité</label>
              <input
                value={form.timelineLabel}
                onChange={(e) => set("timelineLabel", e.target.value)}
                className={INPUT_CLS}
                placeholder="Ex. 3 mois"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Priorité</label>
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              className={INPUT_CLS}
            >
              <option>Basse</option>
              <option>Normale</option>
              <option>Haute</option>
              <option>Urgente</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={TEXTAREA_CLS}
              placeholder="Décrivez votre besoin en détail…"
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Fonctionnalités (séparées par virgule)</label>
            <textarea
              rows={2}
              value={form.features}
              onChange={(e) => set("features", e.target.value)}
              className={TEXTAREA_CLS}
              placeholder="Ex. Authentification, Dashboard, Export PDF…"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !form.requestType.trim()}
              className="flex-1 h-10 bg-[#db143c] text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
            >
              {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer la demande"}
            </button>
            {isEdit && onDelete && (
              confirmDelete ? (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="px-4 h-10 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 text-sm disabled:opacity-50"
                >
                  {deleting ? "Suppression…" : "Confirmer"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 h-10 border border-rose-300 text-rose-600 font-semibold rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm"
                >
                  Supprimer
                </button>
              )
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function canEditOrDeleteOrder(order: OrderDoc): boolean {
  return order.kind === ORDER_KIND.clientRequest && EDITABLE_STATUSES.has(order.status)
}

export default function ClientRequests() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("Tous")
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "")

  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editTarget, setEditTarget] = useState<OrderDoc | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "")
  }, [searchParams])

  useEffect(() => {
    if (!db || !user?.organizationId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, COLLECTIONS.orders),
      where("organizationId", "==", user.organizationId),
      orderBy("createdAt", "desc"),
    )

    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreOrder) })))
      setLoading(false)
    })
    return () => unsub()
  }, [user?.organizationId])

  const filtered = orders.filter((o) => {
    const matchTab = activeTab === "Tous" || o.status === activeTab
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      (o.requestType ?? "").toLowerCase().includes(q) ||
      (o.materialName ?? "").toLowerCase().includes(q) ||
      (o.kind ?? "").toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      (o.status ?? "").toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  async function handleAdd(data: FormData) {
    if (!db || !user?.organizationId) return
    setSaving(true)
    try {
      await addDoc(collection(db, COLLECTIONS.orders), {
        organizationId: user.organizationId,
        kind: "client_request",
        status: "En attente",
        createdByUserId: user.id,
        requestType: data.requestType,
        budgetLabel: data.budgetLabel,
        timelineLabel: data.timelineLabel,
        priority: data.priority,
        description: data.description,
        features: data.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        createdAt: serverTimestamp(),
      } as FirestoreOrder)
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(data: FormData) {
    if (!db || !editTarget || !canEditOrDeleteOrder(editTarget)) return
    setSaving(true)
    try {
      await updateDoc(doc(db, COLLECTIONS.orders, editTarget.id), {
        requestType: data.requestType,
        budgetLabel: data.budgetLabel,
        timelineLabel: data.timelineLabel,
        priority: data.priority,
        description: data.description,
        features: data.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        updatedAt: serverTimestamp(),
      })
      setShowEdit(false)
      setEditTarget(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!db || !editTarget || !canEditOrDeleteOrder(editTarget)) return
    await deleteDoc(doc(db, COLLECTIONS.orders, editTarget.id))
    setShowEdit(false)
    setEditTarget(null)
  }

  function openEdit(o: OrderDoc) {
    if (!canEditOrDeleteOrder(o)) return
    setEditTarget(o)
    setShowEdit(true)
  }

  const editInitial: FormData = editTarget
    ? {
        requestType: editTarget.requestType ?? "",
        budgetLabel: editTarget.budgetLabel ?? "",
        timelineLabel: editTarget.timelineLabel ?? "",
        priority: editTarget.priority ?? "Normale",
        description: editTarget.description ?? "",
        features: (editTarget.features ?? []).join(", "),
      }
    : EMPTY_FORM

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Mes Demandes">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {filtered.length} demande{filtered.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouvelle demande
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            placeholder="Rechercher…"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {["Réf.", "Type", "Budget", "Priorité", "Date", "Statut", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-[180px] truncate">
                        {o.kind === ORDER_KIND.materialSupply
                          ? (o.materialName ?? "Commande matériel")
                          : (o.requestType ?? "—")}
                        <div className="mt-1">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              o.kind === ORDER_KIND.materialSupply
                                ? "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400"
                                : "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {o.kind === ORDER_KIND.materialSupply ? "Matériel" : "Software / Demande"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {o.kind === ORDER_KIND.materialSupply
                          ? `${o.quantity ?? 1} unité(s)`
                          : (o.budgetLabel ?? "—")}
                      </td>
                      <td className="px-4 py-3">
                        {o.priority ? (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityColor[o.priority] ?? "text-slate-600 bg-slate-100"}`}
                          >
                            {o.priority}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatFirestoreDate(o.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[o.status] ?? "text-slate-600 bg-slate-100"}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {o.kind === ORDER_KIND.clientRequest ? (
                            <>
                              <Link
                                to={`/client/requests/${o.id}`}
                                className="text-[#db143c] hover:opacity-80 text-xs font-semibold"
                              >
                                Voir
                              </Link>
                              {canEditOrDeleteOrder(o) ? (
                                <button
                                  onClick={() => openEdit(o)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  title="Modifier"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                              ) : (
                                <span
                                  className="text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                  title="Modification disponible uniquement pour En attente ou Brouillon"
                                >
                                  <span className="material-symbols-outlined text-[16px]">lock</span>
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Suivi en attente</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <span className="material-symbols-outlined text-[36px] text-slate-300 dark:text-slate-600 block mb-2">
                      inbox
                    </span>
                    <p className="text-slate-400 text-sm">Aucune demande trouvée</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <RequestModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleAdd}
        initial={EMPTY_FORM}
        isEdit={false}
        saving={saving}
      />

      {/* Edit Modal */}
      <RequestModal
        open={showEdit}
        onClose={() => { setShowEdit(false); setEditTarget(null) }}
        onSave={handleEdit}
        onDelete={handleDelete}
        initial={editInitial}
        isEdit
        saving={saving}
      />
    </DashboardLayout>
  )
}
