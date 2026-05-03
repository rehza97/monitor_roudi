import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { collection, onSnapshot, query, where, orderBy } from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreOrder, type Deployment } from "@/data/schema"
import { formatFirestoreDate } from "@/lib/utils"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"

interface OrderDoc extends FirestoreOrder {
  id: string
}

interface DeploymentDoc extends Deployment {
  id: string
}

const statusClass: Record<string, string> = {
  "En cours": "bg-blue-50 text-blue-700 border border-blue-100",
  "Validée": "bg-emerald-50 text-emerald-700 border border-emerald-100",
  "En attente": "bg-orange-50 text-orange-700 border border-orange-100",
  "Livré": "bg-emerald-50 text-emerald-700 border border-emerald-100",
  "Rejetée": "bg-rose-50 text-rose-700 border border-rose-100",
}

export default function ClientDashboard() {
  const { user } = useAuth()
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "Jean"

  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [deployments, setDeployments] = useState<DeploymentDoc[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (!db || !user?.organizationId) {
      setLoadingOrders(false)
      return
    }
    const q = query(
      collection(db, COLLECTIONS.orders),
      where("organizationId", "==", user.organizationId),
      where("kind", "==", "client_request"),
      orderBy("createdAt", "desc"),
    )
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ ...(d.data() as FirestoreOrder), id: d.id })))
      setLoadingOrders(false)
    })
    return () => unsub()
  }, [user?.organizationId])

  useEffect(() => {
    if (!db || !user?.organizationId) return
    const q = query(collection(db, COLLECTIONS.deployments), where("organizationId", "==", user.organizationId))
    const unsub = onSnapshot(q, (snap) => {
      setDeployments(snap.docs.map((d) => ({ ...(d.data() as Deployment), id: d.id })))
    })
    return () => unsub()
  }, [user?.organizationId])

  const pending = orders.filter((o) => o.status === "En attente").length
  const waitingPayment = Math.max(0, pending - orders.filter((o) => o.status === "Validée").length)
  const openTickets = deployments.filter((d) => d.health === "down" || d.health === "degraded").length
  const recentOrders = useMemo(() => orders.slice(0, 4), [orders])

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle={`Bonjour, ${firstName}`}>
        <div className="p-6 max-w-7xl mx-auto flex flex-col gap-8 text-[#0f172a]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4"><div className="p-3 bg-cyan-50 rounded-lg"><span className="material-symbols-outlined text-[#0891b2]">pending_actions</span></div><span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+1 cette semaine</span></div>
              <div><p className="text-slate-500 text-sm font-medium">Demandes en cours</p><h3 className="text-3xl font-bold text-slate-900 mt-1">{pending}</h3></div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4"><div className="p-3 bg-orange-50 rounded-lg"><span className="material-symbols-outlined text-orange-500">payments</span></div><span className="flex items-center text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">Action requise</span></div>
              <div><p className="text-slate-500 text-sm font-medium">Paiements en attente</p><h3 className="text-3xl font-bold text-slate-900 mt-1">{waitingPayment}</h3></div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-blue-500">confirmation_number</span></div></div>
              <div><p className="text-slate-500 text-sm font-medium">Tickets ouverts</p><h3 className="text-3xl font-bold text-slate-900 mt-1">{openTickets}</h3></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Activités récentes</h3><Link to="/client/requests" className="text-sm font-medium text-[#0891b2] hover:underline">Voir tout</Link></div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 font-semibold"><th className="px-6 py-4">Projet / Demande</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Statut</th><th className="px-6 py-4 text-right">Montant</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingOrders ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">Chargement…</td></tr>
                      ) : recentOrders.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">Aucune activité récente.</td></tr>
                      ) : (
                        recentOrders.map((o, i) => (
                          <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4"><Link to={`/client/requests/${o.id}`} className="flex items-center gap-3"><div className={`p-2 rounded-lg ${i % 3 === 0 ? "bg-indigo-100 text-indigo-600" : i % 3 === 1 ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"}`}><span className="material-symbols-outlined text-sm">{i % 3 === 0 ? "code" : i % 3 === 1 ? "design_services" : "campaign"}</span></div><div><p className="text-sm font-semibold text-slate-900">{o.requestType ?? "Demande"}</p><p className="text-xs text-slate-500">ID: #{o.id.slice(0, 8).toUpperCase()}</p></div></Link></td>
                            <td className="px-6 py-4 text-sm text-slate-600">{formatFirestoreDate(o.createdAt)}</td>
                            <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusClass[o.status] ?? "bg-slate-100 text-slate-700 border border-slate-200"}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{o.status}</span></td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">{o.budgetLabel || "Montant à définir (DZD)"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-cyan-50 text-[#0891b2]">
                    <span className="material-symbols-outlined">shopping_cart</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Panier catalogue</h3>
                    <p className="mt-1 text-sm text-slate-500">Commander applications, app custom et matériels.</p>
                  </div>
                </div>
                <Link to="/client/materials/order" className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0891b2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">
                  Ouvrir le panier
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>

              <h3 className="text-lg font-bold text-slate-900">Prochaines étapes</h3>
              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100">
                <div className="relative h-32 w-full bg-slate-900">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2022&auto=format&fit=crop')" }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 mb-2 uppercase tracking-wide">Urgent</span><h4 className="text-lg font-bold leading-tight">Paiement Requis</h4></div>
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4"><span className="material-symbols-outlined text-slate-400 mt-1">receipt</span><div><p className="text-sm text-slate-600">Facture <span className="font-mono font-medium text-slate-800">#INV-2024-001</span> pour 'Développement Web' arrive à échéance.</p></div></div>
                  <Link to="/client/payments" className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"><span>Payer maintenant</span><span className="material-symbols-outlined text-sm">arrow_forward</span></Link>
                </div>
              </div>
            </div>
          </div>
        </div>
    </DashboardLayout>
  )
}
