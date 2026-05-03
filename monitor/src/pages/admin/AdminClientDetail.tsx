import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { useParams } from "react-router-dom"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreFieldServiceClient, type FirestoreInvoice, type FirestoreOrder } from "@/data/schema"
import { collection, doc, getDoc, onSnapshot, query, where } from "@/lib/firebase-firestore"
import { formatFirestoreDate } from "@/lib/utils"

type ClientDoc = FirestoreFieldServiceClient & { id: string }
type OrderDoc = FirestoreOrder & { id: string }

const DZD = new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 })

export default function AdminClientDetail() {
  const { id } = useParams()
  const [client, setClient] = useState<ClientDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderDoc[]>([])
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
      setClient(snap.exists() ? { id: snap.id, ...(snap.data() as FirestoreFieldServiceClient) } : null)
      setLoading(false)
    })

    const qOrders = query(collection(db, COLLECTIONS.orders), where("organizationId", "==", id))
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreOrder) }))
      rows.sort((a, b) => {
        const ta = a.createdAt && typeof a.createdAt === "object" && "seconds" in (a.createdAt as Record<string, unknown>)
          ? Number((a.createdAt as { seconds?: number }).seconds ?? 0)
          : 0
        const tb = b.createdAt && typeof b.createdAt === "object" && "seconds" in (b.createdAt as Record<string, unknown>)
          ? Number((b.createdAt as { seconds?: number }).seconds ?? 0)
          : 0
        return tb - ta
      })
      setOrders(rows)
    })

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

  if (loading) return <DashboardLayout role="admin" navItems={adminNav} pageTitle="Informations Client"><div className="p-6 text-sm text-slate-400">Chargement...</div></DashboardLayout>
  if (!client) return <DashboardLayout role="admin" navItems={adminNav} pageTitle="Informations Client"><div className="p-6 text-sm text-slate-400">Client introuvable.</div></DashboardLayout>

  const status = (client.status || "").toLowerCase().includes("act") ? "Compte Actif" : "Compte inactif"

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Informations Client">
      <div className="w-full bg-[#f6f6f8] p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#111318]">Consultation Client</h1>
              <p className="mt-1 text-[#616e89]">Détails du profil, historique et état des paiements.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">{status}</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-blue-50 to-white px-6 py-6">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full border-4 border-white bg-slate-200 shadow-md" />
                  <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white bg-green-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[#111318]">{client.name || "Client"}</h2>
                  <p className="text-[#616e89]">Client • Membre depuis {lastInvoiceDate !== "—" ? lastInvoiceDate : "2021"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"><span className="material-symbols-outlined text-[14px]">location_on</span>{client.city || "—"}</span>
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"><span className="material-symbols-outlined text-[14px]">language</span>Français</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#111318]"><span className="material-symbols-outlined text-[#2463eb]">contact_page</span>Coordonnées</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="flex flex-col gap-1"><span className="text-xs font-medium uppercase tracking-wider text-[#616e89]">Email</span><div className="flex items-center gap-2 text-sm font-medium"><span className="material-symbols-outlined text-[18px] text-slate-400">mail</span>{client.email || "—"}</div></div>
                  <div className="flex flex-col gap-1"><span className="text-xs font-medium uppercase tracking-wider text-[#616e89]">Téléphone</span><div className="flex items-center gap-2 text-sm font-medium"><span className="material-symbols-outlined text-[18px] text-slate-400">call</span>{client.phone || "—"}</div></div>
                  <div className="flex flex-col gap-1 sm:col-span-2"><span className="text-xs font-medium uppercase tracking-wider text-[#616e89]">Adresse Principale</span><div className="flex items-center gap-2 text-sm font-medium"><span className="material-symbols-outlined text-[18px] text-slate-400">home</span>{client.address || "—"}</div></div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#111318]"><span className="material-symbols-outlined text-[#2463eb]">history</span>Historique des demandes</h3>
                <div className="flex flex-col divide-y divide-slate-100">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex flex-col gap-2 py-4 first:pt-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[#111318]">{o.requestType || o.kind || "Demande"}</h4>
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">{o.status || "En cours"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#616e89]"><span>{formatFirestoreDate(o.createdAt)}</span><span>Ref: #{o.id.slice(0, 8).toUpperCase()}</span></div>
                    </div>
                  ))}
                  {orders.length === 0 ? <p className="py-3 text-sm text-slate-400">Aucune demande liée.</p> : null}
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-8">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-[#111318]"><span className="material-symbols-outlined text-[#2463eb] text-[20px]">sticky_note_2</span>Notes Internes</h3>
                <div className="rounded-lg bg-yellow-50 p-4 text-sm leading-relaxed text-yellow-900">
                  <p>Client préfère les communications par email. Très attentif aux détails et délais contractuels.</p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-[#111318]"><span className="material-symbols-outlined text-[#2463eb] text-[20px]">payments</span>État des paiements</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"><div className="flex flex-col"><span className="text-xs text-[#616e89]">Dernière facture</span><span className="text-sm font-bold text-[#111318]">{DZD.format(revenue)}</span></div><span className="flex h-6 items-center rounded bg-green-100 px-2 text-xs font-bold text-green-700">Payée</span></div>
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4"><div className="flex justify-between text-sm"><span className="text-[#616e89]">Dernière date</span><span className="font-bold text-[#111318]">{lastInvoiceDate}</span></div></div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#616e89]">Gestionnaire de compte</h3>
                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-slate-200" /><div className="flex flex-col"><span className="text-sm font-bold text-[#111318]">Alexandre Martin</span><span className="text-xs text-[#616e89]">Ingénieur Principal</span></div></div>
              </section>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="mb-1 text-xs font-medium text-[#616e89]">Demandes</p><p className="text-lg font-bold text-[#111318]">{orders.length}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="mb-1 text-xs font-medium text-[#616e89]">Apps déployées</p><p className="text-lg font-bold text-[#111318]">{deploymentsCount}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="mb-1 text-xs font-medium text-[#616e89]">CA Client</p><p className="text-lg font-bold text-[#111318]">{DZD.format(revenue)}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="mb-1 text-xs font-medium text-[#616e89]">Dernière MAJ</p><p className="text-lg font-bold text-[#111318]">{lastInvoiceDate}</p></div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
