import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreFieldServiceClient, type FirestoreInvoice } from "@/data/schema"
import { collection, doc, getDoc, onSnapshot, query, where } from "@/lib/firebase-firestore"
import { formatFirestoreDate } from "@/lib/utils"

type ClientDoc = FirestoreFieldServiceClient & { id: string }

export default function AdminClientDetail() {
  const { id } = useParams()
  const [client, setClient] = useState<ClientDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordersCount, setOrdersCount] = useState(0)
  const [deploymentsCount, setDeploymentsCount] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [lastInvoiceDate, setLastInvoiceDate] = useState<string>("—")

  useEffect(() => {
    if (!db || !id) {
      setLoading(false)
      return
    }

    let cancelled = false
    void getDoc(doc(db, COLLECTIONS.fieldServiceClients, id)).then((snap) => {
      if (cancelled) return
      if (!snap.exists()) {
        setClient(null)
      } else {
        setClient({ id: snap.id, ...(snap.data() as FirestoreFieldServiceClient) })
      }
      setLoading(false)
    })

    const qOrders = query(collection(db, COLLECTIONS.orders), where("organizationId", "==", id))
    const unsubOrders = onSnapshot(qOrders, (snap) => setOrdersCount(snap.size))

    const qDeployments = query(collection(db, COLLECTIONS.deployments), where("organizationId", "==", id))
    const unsubDeployments = onSnapshot(qDeployments, (snap) => setDeploymentsCount(snap.size))

    const qInvoices = query(collection(db, COLLECTIONS.invoices), where("organizationId", "==", id))
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      let total = 0
      let newest: unknown = null
      snap.docs.forEach((d) => {
        const data = d.data() as FirestoreInvoice
        if (typeof data.amount === "number") total += data.amount
        if (!newest) newest = data.issuedAt ?? data.createdAt
      })
      setRevenue(total)
      setLastInvoiceDate(newest ? formatFirestoreDate(newest) : "—")
    })

    return () => {
      cancelled = true
      unsubOrders()
      unsubDeployments()
      unsubInvoices()
    }
  }, [id])

  const initials = useMemo(() => {
    const name = client?.name ?? ""
    if (!name.trim()) return "CL"
    return name
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }, [client?.name])

  if (loading) {
    return (
      <DashboardLayout role="admin" navItems={adminNav} pageTitle="Fiche Client">
        <div className="p-6 text-sm text-slate-500">Chargement…</div>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout role="admin" navItems={adminNav} pageTitle="Fiche Client">
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">Client introuvable.</p>
          <Link to="/admin/location" className="text-sm text-[#db143c] hover:underline">Retour</Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Fiche Client">
      <div className="p-6 w-full space-y-6">
        <Link to="/admin/location" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-start gap-5">
            <div className="size-16 rounded-xl bg-[#db143c] flex items-center justify-center text-white text-2xl font-bold shrink-0">{initials}</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{client.name}</h2>
              <p className="text-slate-500 text-sm mt-1">ID : {client.id}</p>
              <div className="flex gap-3 mt-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${client.status === "Actif" ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {client.status || "—"}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400">
                  {client.city || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">Informations de contact</h3>
            {[
              { icon: "person", label: "Contact", value: client.contact || "—" },
              { icon: "email", label: "Email", value: client.email || "—" },
              { icon: "call", label: "Téléphone", value: client.phone || "—" },
              { icon: "location_on", label: "Adresse", value: client.address || "—" },
            ].map((i) => (
              <div key={i.label} className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-[#db143c] text-[18px]">{i.icon}</span>
                <span className="text-slate-500">{i.label} :</span>
                <span className="font-medium text-slate-900 dark:text-white">{i.value}</span>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">Statistiques</h3>
            {[
              { label: "Demandes totales", value: String(ordersCount) },
              { label: "Apps déployées", value: String(deploymentsCount) },
              { label: "CA généré", value: `${revenue.toLocaleString("fr-FR")} DA` },
              { label: "Dernière facture", value: lastInvoiceDate },
            ].map((s) => (
              <div key={s.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{s.label}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
