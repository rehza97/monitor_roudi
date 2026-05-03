import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { IS_VITE_DEV } from "@/config/devMode"
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
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@/lib/firebase-firestore"
import { formatFirestoreDate } from "@/lib/utils"
import {
  notifyAdminsOfOrderCreated,
  notifyClientOfOrderStatusChanged,
} from "@/lib/notifications"

type Row = {
  id: string
  client: string
  type: string
  budget: string
  status: string
  date: string
}

const statusColor: Record<string, string> = {
  "En attente": "text-amber-700 bg-amber-50",
  Validée: "text-emerald-700 bg-emerald-50",
  "En cours": "text-blue-700 bg-blue-50",
  Rejetée: "text-rose-700 bg-rose-50",
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
  const isDev = IS_VITE_DEV

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
        className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900">
            {isEdit ? "Modifier la demande" : "Nouvelle demande"}
          </h3>
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
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {[
          { label: "Client", value: clientLabel, set: setClientLabel, type: "text", required: true },
          { label: "Email client", value: clientEmail, set: setClientEmail, type: "email", required: false },
          { label: "Type / titre", value: requestType, set: setRequestType, type: "text", required: true },
          { label: "Budget", value: budgetLabel, set: setBudgetLabel, type: "text", required: false },
          { label: "Délai souhaité", value: timelineLabel, set: setTimelineLabel, type: "text", required: false },
        ].map(({ label, value, set, type, required }) => (
          <div key={label} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input
              value={value}
              onChange={(e) => set(e.target.value)}
              type={type}
              required={required}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Priorité</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white"
          >
            {["Basse", "Normale", "Haute", "Urgente"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        {isEdit ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-300 bg-white"
            >
              {statuses.slice(1).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#db143c]"
          />
        </div>
        <div className="flex gap-2 pt-2">
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
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState<Row[]>([])
  const [rawById, setRawById] = useState<Record<string, FirestoreOrder>>({})
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState("")
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "")
  const [status, setStatus] = useState("Tous les statuts")
  const [modal, setModal] = useState<ModalMode>(null)
  const userNameCache = useRef<Record<string, string>>({})

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "")
  }, [searchParams])

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

        // Resolve names for orders missing clientLabel
        if (!db) return
        const needsResolution = snap.docs.filter((d) => {
          const data = d.data() as FirestoreOrder
          return !data.clientLabel?.trim() && data.createdByUserId
        })
        if (needsResolution.length === 0) return

        const uidsToFetch = [...new Set(
          needsResolution
            .map((d) => (d.data() as FirestoreOrder).createdByUserId)
            .filter((uid): uid is string => Boolean(uid) && !userNameCache.current[uid])
        )]

        Promise.all(
          uidsToFetch.map(async (uid) => {
            const snap = await getDoc(doc(db!, COLLECTIONS.users, uid))
            const name = snap.exists() ? ((snap.data() as { name?: string }).name ?? "") : ""
            userNameCache.current[uid] = name
          })
        ).then(() => {
          setRows((prev) =>
            prev.map((row) => {
              if (row.client !== "—") return row
              const order = map[row.id]
              if (!order?.createdByUserId) return row
              const resolved = userNameCache.current[order.createdByUserId]
              return resolved ? { ...row, client: resolved } : row
            })
          )
        }).catch(() => {/* silent — names just stay as "—" */})
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
      const previous = rawById[docId]
      await updateDoc(doc(db, COLLECTIONS.orders, docId), {
        ...payload,
        updatedAt: serverTimestamp(),
      })
      if (previous && previous.status !== payload.status) {
        await notifyClientOfOrderStatusChanged(docId, previous, payload.status)
      }
    } else {
      const createPayload = {
        ...payload,
        createdByUserId: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as FirestoreOrder
      const ref = await addDoc(collection(db, COLLECTIONS.orders), createPayload)
      await notifyAdminsOfOrderCreated(ref.id, createPayload)
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
      <div className="w-full bg-[#f8fafc] p-6 md:p-8 lg:px-12">
        {listError ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {listError}
          </div>
        ) : null}

        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#0f172a]">Liste des Demandes</h1>
              <p className="mt-2 text-[#64748b]">Gérez et examinez toutes les demandes d'application entrantes.</p>
            </div>
            <button
              type="button"
              disabled={!db || !user}
              onClick={() => setModal({ type: "add" })}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nouvelle Demande
            </button>
          </div>

          <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="relative w-full lg:w-96 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#64748b]">search</span>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-[#e2e8f0] rounded-lg bg-[#f8fafc] text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
                placeholder="Rechercher un client, ID ou thème..."
              />
            </div>
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="inline-flex rounded-lg bg-[#f8fafc] px-4 py-2.5 text-sm font-medium text-[#0f172a] ring-1 ring-inset ring-[#e2e8f0]">
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-[#e2e8f0] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#e2e8f0] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["ID", "Client", "Domaine", "Thème", "Date", "Statut", "Action"].map((h) => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748b]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filtered.map((r) => (
                    <tr key={r.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#2563eb]">{r.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="mr-3 h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {(r.client || "CL").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-sm font-medium text-[#0f172a]">{r.client}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b]">{r.type || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0f172a]">{r.budget || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b]">{r.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="inline-flex items-center gap-2">
                          <button type="button" onClick={() => setModal({ type: "edit", id: r.id, initial: rawById[r.id] ?? ({} as FirestoreOrder) })} className="text-slate-500 hover:text-slate-800">Modifier</button>
                          <Link to={`/admin/requests/${r.id}`} className="text-[#2563eb] hover:text-[#1d4ed8] font-medium inline-flex items-center gap-1">Voir Détails<span className="material-symbols-outlined text-[16px]">arrow_forward</span></Link>
                          <button type="button" onClick={() => void handleDelete(r.id)} className="text-rose-600 hover:underline">Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && !listError ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                        {rows.length === 0 ? "Aucune demande. Créez-en une avec « Nouvelle demande »." : "Aucune demande ne correspond aux filtres."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between">
              <div className="text-sm text-[#64748b]">
                {loading ? "Chargement…" : `Affichage de 1 à ${filtered.length} sur ${rows.length} résultats`}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md">Précédent</button>
                <button className="px-3 py-1 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md">Suivant</button>
              </div>
            </div>
          </div>
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
