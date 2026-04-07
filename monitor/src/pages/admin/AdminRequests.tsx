import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { useAuth } from "@/contexts/AuthContext"
import {
  COLLECTIONS,
  ORDER_KIND,
  PLATFORM_ORGANIZATION_ID,
  type FirestoreOrder,
} from "@/data/schema"
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
  where,
} from "@/lib/firebase-firestore"
import { formatFirestoreDate } from "@/lib/utils"

type Row = {
  id: string
  client: string
  type: string
  budget: string
  status: string
  date: string
}

const statusColor: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  Validée: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "En cours": "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
  Rejetée: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
}

const statuses = ["Tous les statuts", "En attente", "Validée", "En cours", "Rejetée"]

type ModalMode = { type: "add" } | { type: "edit"; id: string; initial: FirestoreOrder } | null

function docToRow(id: string, data: FirestoreOrder): Row {
  return {
    id,
    client: data.clientLabel ?? "—",
    type: data.requestType ?? "—",
    budget: data.budgetLabel ?? "—",
    status: data.status ?? "En attente",
    date: formatFirestoreDate(data.createdAt),
  }
}

function RequestModal({
  mode,
  userId,
  onClose,
  onSave,
}: {
  mode: ModalMode
  userId: string
  onClose: () => void
  onSave: (payload: Omit<FirestoreOrder, "createdAt" | "updatedAt">, docId: string | null) => Promise<void>
}) {
  const isEdit = mode?.type === "edit"
  const init = mode?.type === "edit" ? mode.initial : null

  const [clientLabel, setClientLabel] = useState(init?.clientLabel ?? "")
  const [clientEmail, setClientEmail] = useState(init?.clientEmail ?? "")
  const [requestType, setRequestType] = useState(init?.requestType ?? "")
  const [budgetLabel, setBudgetLabel] = useState(init?.budgetLabel ?? "")
  const [description, setDescription] = useState(init?.description ?? "")
  const [timelineLabel, setTimelineLabel] = useState(init?.timelineLabel ?? "")
  const [priority, setPriority] = useState(init?.priority ?? "Normale")
  const [status, setStatus] = useState(init?.status ?? "En attente")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const isDev = import.meta.env.DEV

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientLabel.trim() || !requestType.trim()) return
    setError("")
    setSaving(true)
    try {
      const base: Omit<FirestoreOrder, "createdAt" | "updatedAt"> = {
        organizationId: PLATFORM_ORGANIZATION_ID,
        kind: ORDER_KIND.clientRequest,
        createdByUserId: isEdit && init?.createdByUserId ? init.createdByUserId : userId,
        status,
        clientLabel: clientLabel.trim(),
        clientEmail: clientEmail.trim() || undefined,
        requestType: requestType.trim(),
        budgetLabel: budgetLabel.trim() || undefined,
        description: description.trim() || undefined,
        timelineLabel: timelineLabel.trim() || undefined,
        priority: priority.trim() || undefined,
      }
      await onSave(base, isEdit && mode ? mode.id : null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur à l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  function autofillForDev() {
    setClientLabel("Entreprise Atlas")
    setClientEmail("contact@atlas.local")
    setRequestType("Application de suivi")
    setBudgetLabel("250 000 DA")
    setTimelineLabel("4 semaines")
    setPriority("Haute")
    setDescription("Besoin d'un portail web avec authentification, tableau de bord et reporting.")
    if (isEdit) setStatus("En attente")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <form
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {isEdit ? "Modifier la demande" : "Nouvelle demande"}
          </h3>
          <div className="flex items-center gap-2">
            {isDev ? (
              <button
                type="button"
                onClick={autofillForDev}
                className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Remplir (dev)
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {[
          { label: "Client", value: clientLabel, set: setClientLabel, type: "text", required: true },
          { label: "Email client", value: clientEmail, set: setClientEmail, type: "email", required: false },
          { label: "Type / titre", value: requestType, set: setRequestType, type: "text", required: true },
          { label: "Budget", value: budgetLabel, set: setBudgetLabel, type: "text", required: false },
          { label: "Délai souhaité", value: timelineLabel, set: setTimelineLabel, type: "text", required: false },
        ].map(({ label, value, set, type, required }) => (
          <div key={label} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <input
              value={value}
              onChange={(e) => set(e.target.value)}
              type={type}
              required={required}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priorité</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          >
            {["Basse", "Normale", "Haute", "Urgente"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        {isEdit ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              {statuses.slice(1).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#db143c]"
          />
        </div>
        <div className="flex gap-2 pt-2">
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
            className="flex-1 py-2.5 bg-[#db143c] text-white text-sm font-bold rounded-lg disabled:opacity-60"
          >
            {saving ? "…" : isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function AdminRequests() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [rawById, setRawById] = useState<Record<string, FirestoreOrder>>({})
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("Tous les statuts")
  const [modal, setModal] = useState<ModalMode>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      setListError("Firestore indisponible.")
      return
    }
    const q = query(
      collection(db, COLLECTIONS.orders),
      where("kind", "==", ORDER_KIND.clientRequest),
      orderBy("createdAt", "desc"),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListError("")
        const map: Record<string, FirestoreOrder> = {}
        const list: Row[] = []
        snap.docs.forEach((d) => {
          const data = d.data() as FirestoreOrder
          map[d.id] = data
          list.push(docToRow(d.id, data))
        })
        setRawById(map)
        setRows(list)
        setLoading(false)
      },
      (err) => {
        setListError(err.message)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  async function persistOrder(payload: Omit<FirestoreOrder, "createdAt" | "updatedAt">, docId: string | null) {
    if (!db) throw new Error("Firestore indisponible.")
    if (!user?.id) throw new Error("Utilisateur non connecté.")
    if (docId) {
      await updateDoc(doc(db, COLLECTIONS.orders, docId), {
        ...payload,
        updatedAt: serverTimestamp(),
      })
    } else {
      await addDoc(collection(db, COLLECTIONS.orders), {
        ...payload,
        createdByUserId: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }

  async function handleDelete(id: string) {
    if (!db || !window.confirm("Supprimer cette demande ?")) return
    await deleteDoc(doc(db, COLLECTIONS.orders, id))
  }

  const q = search.toLowerCase()
  const filtered = rows.filter((r) => {
    const matchSearch =
      r.client.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
    const matchStatus = status === "Tous les statuts" || r.status === status
    return matchSearch && matchStatus
  })

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Demandes">
      <div className="p-6 space-y-5">
        {listError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm text-rose-700">
            {listError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-3 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c]"
                placeholder="Rechercher par client, référence, type…"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              ) : null}
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!db || !user}
            onClick={() => setModal({ type: "add" })}
            className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nouvelle demande
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500">
              {loading ? "Chargement…" : `${filtered.length} demande${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {["Réf.", "Client", "Type", "Budget", "Date", "Statut", ""].map((h) => (
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
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.id.slice(0, 10)}…</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.client}</td>
                  <td className="px-4 py-3 text-slate-500">{r.type}</td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{r.budget}</td>
                  <td className="px-4 py-3 text-slate-500">{r.date}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[r.status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setModal({
                            type: "edit",
                            id: r.id,
                            initial: rawById[r.id] ?? ({} as FirestoreOrder),
                          })
                        }
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Modifier
                      </button>
                      <Link
                        to={`/admin/requests/${r.id}`}
                        className="text-xs text-[#db143c] font-medium hover:opacity-80"
                      >
                        Traiter →
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(r.id)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Suppr.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && !listError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    {rows.length === 0
                      ? "Aucune demande. Créez-en une avec « Nouvelle demande »."
                      : "Aucune demande ne correspond aux filtres."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {modal && user ? (
        <RequestModal
          key={modal.type === "edit" ? modal.id : "add"}
          mode={modal}
          userId={user.id}
          onClose={() => setModal(null)}
          onSave={async (payload, docId) => {
            await persistOrder(payload, docId)
          }}
        />
      ) : null}
    </DashboardLayout>
  )
}
