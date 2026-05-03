import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useNavigate } from "react-router-dom"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { COLLECTIONS, ORDER_KIND, type FirestoreInvoice, type FirestoreOrder, type FirestoreSupportTicket } from "@/data/schema"
import { collection, onSnapshot, orderBy, query, limit } from "@/lib/firebase-firestore"
import { formatFirestoreDate, firestoreToMillis } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import AdminSidebar, { ADMIN_SIDEBAR_OFFSET_CLASS } from "@/components/layouts/AdminSidebar"

type OrderRow = {
  id: string
  client: string
  type: string
  status: string
  date: string
}

const statusColor: Record<string, string> = {
  "En attente": "bg-amber-50 text-amber-700 border border-amber-100",
  Validée: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  "En cours": "bg-blue-50 text-blue-700 border border-blue-100",
  Rejetée: "bg-red-50 text-red-700 border border-red-100",
}

function initials(name: string) {
  const chunks = name.trim().split(/\s+/).filter(Boolean)
  if (chunks.length === 0) return "CL"
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase()
  return `${chunks[0][0] ?? ""}${chunks[1][0] ?? ""}`.toUpperCase()
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [orders, setOrders] = useState<{ id: string; data: FirestoreOrder }[]>([])
  const [engineers, setEngineers] = useState<number>(0)
  const [usersCount, setUsersCount] = useState<number>(0)
  const [invoices, setInvoices] = useState<FirestoreInvoice[]>([])
  const [openTickets, setOpenTickets] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setLoading(false)
      return
    }

    const unsubs: Array<() => void> = []

    unsubs.push(
      onSnapshot(
        query(collection(db, COLLECTIONS.orders), orderBy("createdAt", "desc"), limit(100)),
        (snap) => {
          setOrders(snap.docs.map((d) => ({ id: d.id, data: d.data() as FirestoreOrder })))
          setLoading(false)
        },
        () => setLoading(false),
      ),
    )

    unsubs.push(onSnapshot(collection(db, COLLECTIONS.engineers), (snap) => setEngineers(snap.size), () => {}))

    unsubs.push(
      onSnapshot(collection(db, COLLECTIONS.users), (snap) => setUsersCount(snap.size), () => {}),
    )

    unsubs.push(
      onSnapshot(collection(db, COLLECTIONS.invoices), (snap) => {
        setInvoices(snap.docs.map((d) => d.data() as FirestoreInvoice))
      }, () => {}),
    )

    unsubs.push(
      onSnapshot(collection(db, COLLECTIONS.supportTickets), (snap) => {
        const rows = snap.docs.map((d) => d.data() as FirestoreSupportTicket)
        setOpenTickets(rows.filter((t) => t.status === "Ouvert" || t.status === "En cours").length)
      }, () => {}),
    )

    return () => unsubs.forEach((u) => u())
  }, [])

  const revenuePaid = useMemo(() => {
    return invoices.filter((i) => i.status === "Payée").reduce((s, i) => s + (Number.isFinite(i.amount) ? i.amount : 0), 0)
  }, [invoices])

  const monthlyRevenuePoints = useMemo(() => {
    const labels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
    const year = new Date().getFullYear()
    const buckets = Array.from({ length: 12 }, (_, m) => ({ m, total: 0 }))
    for (const inv of invoices) {
      if (inv.status !== "Payée") continue
      const ms =
        firestoreToMillis(inv.paidAt) ??
        firestoreToMillis(inv.issuedAt) ??
        firestoreToMillis(inv.createdAt)
      if (ms == null) continue
      const d = new Date(ms)
      if (d.getFullYear() !== year) continue
      buckets[d.getMonth()].total += Number.isFinite(inv.amount) ? inv.amount : 0
    }
    const max = Math.max(...buckets.map((b) => b.total), 1)
    return buckets.map((b, i) => ({
      label: labels[i] ?? String(i),
      total: b.total,
      h: Math.round((b.total / max) * 100),
    }))
  }, [invoices])

  const stats = useMemo(() => {
    const clientRequests = orders.filter((o) => o.data.kind === ORDER_KIND.clientRequest)
    const pending = clientRequests.filter((o) => o.data.status === "En attente").length
    const totalUsers = usersCount > 0 ? usersCount : engineers + clientRequests.length
    return { pending, tickets: openTickets, totalUsers }
  }, [orders, engineers, usersCount, openTickets])

  const recentOrders = useMemo((): OrderRow[] => {
    return orders
      .filter((o) => o.data.kind === ORDER_KIND.clientRequest)
      .slice(0, 4)
      .map((o) => ({
        id: o.id,
        client: o.data.clientLabel ?? "Client",
        type: o.data.requestType ?? "Demande",
        status: o.data.status ?? "En attente",
        date: formatFirestoreDate(o.data.createdAt),
      }))
  }, [orders])

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="bg-[#f8f6f6] text-[#181112] font-[Inter,sans-serif] antialiased min-h-screen flex overflow-hidden">
      <AdminSidebar
        demandesBadge={loading ? 0 : stats.pending}
        userName={user?.name ?? "Jean Dupont"}
        userEmail={user?.email ?? "jean@technova.com"}
        userInitials={(user?.name ?? "JD").slice(0, 2).toUpperCase()}
        onLogout={() => { void handleLogout() }}
      />

      <main className={`flex-1 ${ADMIN_SIDEBAR_OFFSET_CLASS} p-8 overflow-y-auto h-screen bg-[#f8f6f6]`}>
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <header className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-[#181112] tracking-tight">Tableau de bord</h2>
              <p className="text-[#896169] mt-1">Bienvenue, voici un aperçu des performances du jour.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-[#181112] hover:bg-gray-50 transition-shadow shadow-sm">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                <span>Derniers 30 jours</span>
              </button>
              <Link to="/admin/reports" className="flex items-center gap-2 bg-[#db143c] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#c11236] transition-shadow shadow-sm shadow-[#db143c]/20">
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Nouveau Rapport</span>
              </Link>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Utilisateurs", value: loading ? "…" : String(stats.totalUsers), icon: "group", trend: "—", positive: true },
              {
                label: "Revenu (factures payées)",
                value: loading ? "…" : new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(revenuePaid),
                icon: "payments",
                trend: "Firestore",
                positive: true,
              },
              { label: "Demandes en attente", value: loading ? "…" : String(stats.pending), icon: "pending_actions", trend: "—", positive: stats.pending === 0 },
              { label: "Tickets actifs", value: loading ? "…" : String(stats.tickets), icon: "confirmation_number", trend: "Ouvert + En cours", positive: stats.tickets === 0 },
            ].map((k) => (
              <div key={k.label} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-6xl text-[#db143c]">{k.icon}</span>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[#896169] text-sm font-medium">{k.label}</p>
                    <h3 className="text-2xl font-bold text-[#181112] mt-1">{k.value}</h3>
                  </div>
                  <div className="p-2 bg-[#db143c]/5 rounded-lg text-[#db143c]">
                    <span className="material-symbols-outlined">{k.icon}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-auto">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${k.positive ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
                    {k.trend === "—" ? null : <span className="material-symbols-outlined text-[14px]">database</span>}
                    {k.trend}
                  </span>
                </div>
              </div>
            ))}
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#181112]">Revenus facturés (payées)</h3>
                <p className="text-sm text-[#896169]">Agrégation mensuelle — année en cours (`invoices`)</p>
              </div>
            </div>
            <div className="h-56 w-full flex items-end gap-1 md:gap-2 px-1">
              {monthlyRevenuePoints.map((pt) => (
                <div key={pt.label} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                  <div className="w-full bg-gray-100 rounded-t-md relative h-44 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-[#db143c]/90 rounded-t-md transition-all min-h-[4px]"
                      style={{ height: `${pt.h}%` }}
                      title={`${pt.label}: ${new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(pt.total)}`}
                    />
                  </div>
                  <span className="text-[10px] text-[#896169] font-medium truncate w-full text-center">{pt.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#181112]">Demandes Récentes</h3>
              <Link to="/admin/requests" className="text-sm text-[#db143c] font-medium hover:underline">Voir tout</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-xs uppercase text-[#896169] font-semibold tracking-wider">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Utilisateur</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#896169]">Chargement…</td></tr>
                  ) : recentOrders.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#896169]">Aucune demande récente.</td></tr>
                  ) : recentOrders.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-[#896169] font-mono">#REQ-{row.id.slice(0, 4).toUpperCase()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full ${idx % 3 === 0 ? "bg-blue-100 text-blue-600" : idx % 3 === 1 ? "bg-purple-100 text-purple-600" : "bg-pink-100 text-pink-600"} flex items-center justify-center text-xs font-bold`}>{initials(row.client)}</div>
                          <span className="text-sm font-medium text-[#181112]">{row.client}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#181112]">{row.type}</td>
                      <td className="px-6 py-4 text-sm text-[#896169]">{row.date}</td>
                      <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[row.status] ?? "bg-gray-100 text-gray-700 border border-gray-200"}`}>{row.status}</span></td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/admin/requests/${row.id}`} className="text-gray-400 hover:text-[#181112] transition-colors"><span className="material-symbols-outlined text-[20px]">more_vert</span></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div className="h-12" />
      </main>
    </div>
  )
}
