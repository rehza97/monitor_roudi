import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { doc, getDoc } from "@/lib/firebase-firestore"
import { COLLECTIONS, ORDER_KIND, type FirestoreOrder } from "@/data/schema"
import { canClientAccessOrder } from "@/lib/access-control"
import { formatFirestoreDate, formatFirestoreDateTime } from "@/lib/utils"
import OrderAttachmentsList from "@/components/OrderAttachmentsList"
import ProjectProgressPanel from "@/components/ProjectProgressPanel"
import { getOrderProgress, shouldShowAssignedEngineer } from "@/lib/project-progress"

const statusStyle: Record<string, string> = {
  "En attente": "bg-amber-50 text-amber-700 border-amber-100",
  "Validée": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "En cours": "bg-blue-50 text-blue-700 border-blue-100",
  "Rejetée": "bg-red-50 text-red-700 border-red-100",
  "Livré": "bg-slate-100 text-slate-700 border-slate-200",
}

export default function ClientRequestDetail() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<(FirestoreOrder & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!db || !id) {
      setLoading(false)
      setNotFound(true)
      return
    }

    async function fetchOrder() {
      if (!db || !id) return
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.orders, id))
        if (!snap.exists()) {
          setNotFound(true)
          return
        }
        const data = snap.data() as FirestoreOrder
        if (!canClientAccessOrder(data, user)) {
          setNotFound(true)
          return
        }
        setOrder({ id: snap.id, ...data })
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    void fetchOrder()
  }, [id, user])

  if (!loading && notFound) {
    return (
      <DashboardLayout role="client" navItems={clientNav} pageTitle="Détail de la demande">
        <div className="flex min-h-[70vh] items-center justify-center p-8">
          <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Demande introuvable</h2>
            <p className="mt-2 text-slate-500">Cette demande n'existe pas ou vous n'avez pas l'accès.</p>
            <Link to="/client/requests" className="mt-6 inline-flex rounded-lg bg-[#0891b2] px-5 py-2.5 font-semibold text-white">Retour aux demandes</Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Détail de la demande">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        {loading || !order ? (
          <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ) : (
          <>
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="rounded bg-[#0891b2]/10 px-2 py-1 text-xs font-bold uppercase tracking-wide text-[#0891b2]">{order.requestType || "Demande client"}</span>
                  <span className="text-xs font-medium text-slate-500">Soumis le {formatFirestoreDate(order.createdAt)}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  {order.kind === "material_supply" ? order.materialName ?? "Commande matériel" : order.requestType ?? "Demande client"}
                </h1>
                <p className="mt-2 text-base text-slate-500">Réf: REQ-{order.id.slice(0, 8).toUpperCase()} - Priorité {order.priority ?? "Normale"}</p>
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-medium ${statusStyle[order.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {order.status}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {order.kind === ORDER_KIND.clientRequest && (
                  <ProjectProgressPanel
                    variant="client"
                    status={order.status}
                    features={order.features}
                    completedFeatures={order.completedFeatures}
                    assignedEngineerName={order.assignedEngineerName}
                  />
                )}

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="flex items-center gap-2 font-semibold text-slate-900"><span className="material-symbols-outlined text-[20px] text-[#0891b2]">notes</span>Description du projet</h3>
                  </div>
                  <div className="space-y-4 p-6 leading-relaxed text-slate-600">
                    <p>{order.kind === "material_supply" ? order.notes || `Quantité: ${order.quantity ?? 1}` : order.description || "Aucune description fournie."}</p>
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="flex items-center gap-2 font-semibold text-slate-900"><span className="material-symbols-outlined text-[20px] text-[#0891b2]">code</span>Spécifications</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                      <Info label={order.kind === "material_supply" ? "Quantité" : "Budget"} value={order.kind === "material_supply" ? `${order.quantity ?? 1} unité(s)` : order.budgetLabel || "Montant à définir (DZD)"} />
                      <Info label="Date limite" value={order.timelineLabel || "À définir"} />
                      <Info label="Priorité" value={order.priority || "Normale"} />
                      <Info label="Dernière mise à jour" value={formatFirestoreDateTime(order.updatedAt ?? order.createdAt)} />
                    </div>
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Documents joints</p>
                      <OrderAttachmentsList orderId={order.id} />
                    </div>
                    {order.kind === ORDER_KIND.clientRequest &&
                      Array.isArray(order.features) &&
                      order.features.length > 0 && (
                        <div className="mt-6 border-t border-slate-100 pt-6">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Fonctionnalités demandées
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {order.features.map((f) => (
                              <span
                                key={f}
                                className="rounded-full bg-[#0891b2]/10 px-2.5 py-1 text-xs font-medium text-[#0891b2]"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4"><h3 className="text-sm font-semibold text-slate-900">Informations client</h3></div>
                  <div className="flex flex-col items-center p-6 text-center">
                    <div className="mb-4 flex size-20 items-center justify-center rounded-full border-2 border-white bg-[#0891b2]/10 text-xl font-bold text-[#0891b2] shadow-sm">
                      {(order.clientLabel || user?.name || "CL").slice(0, 2).toUpperCase()}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{order.clientLabel || user?.name || "Client"}</h4>
                    <p className="mb-4 text-sm text-slate-500">{order.clientEmail || user?.email || "—"}</p>
                    <div className="mt-2 w-full space-y-3 text-left">
                      <ContactRow icon="mail" value={order.clientEmail || user?.email || "—"} />
                      <ContactRow icon="business" value={order.organizationId || "Organisation non renseignée"} />
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4"><h3 className="text-sm font-semibold text-slate-900">Suivi</h3></div>
                  <div className="space-y-4 p-6">
                    <Info label="Statut" value={order.status} />
                    {order.kind === ORDER_KIND.clientRequest && (
                      <Info
                        label="Progression"
                        value={
                          getOrderProgress(order.status).isRejected
                            ? "Rejetée"
                            : `${getOrderProgress(order.status).percent}%`
                        }
                      />
                    )}
                    {order.kind === ORDER_KIND.clientRequest &&
                      shouldShowAssignedEngineer(order.status) &&
                      order.assignedEngineerName && (
                        <Info label="Ingénieur" value={order.assignedEngineerName} />
                      )}
                    <Info label="Référence" value={`REQ-${order.id.slice(0, 8).toUpperCase()}`} />
                    <Link to="/client/messages" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0891b2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">
                      Contacter l'équipe
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

function ContactRow({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded p-2 text-sm text-slate-600 transition-colors hover:bg-slate-50">
      <span className="material-symbols-outlined text-[20px] text-slate-400">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  )
}
