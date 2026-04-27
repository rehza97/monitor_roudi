import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { doc, getDoc } from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreOrder } from "@/data/schema"
import { canClientAccessOrder } from "@/lib/access-control"
import { formatFirestoreDate, formatFirestoreDateTime } from "@/lib/utils"
import OrderAttachmentsList from "@/components/OrderAttachmentsList"

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

const STEPS = ["En attente", "Validée", "En cours", "Livré"] as const
type Step = (typeof STEPS)[number]

function stepIndex(status: string): number {
  const idx = STEPS.indexOf(status as Step)
  return idx === -1 ? 0 : idx
}

function Timeline({ status }: { status: string }) {
  const current = stepIndex(status)
  const isRejected = status === "Rejetée"

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Progression</h3>

      {isRejected ? (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
          <span className="material-symbols-outlined text-rose-500 text-[24px]">cancel</span>
          <div>
            <p className="font-semibold text-rose-700 dark:text-rose-400">Demande rejetée</p>
            <p className="text-sm text-rose-600/70 dark:text-rose-400/70">
              Votre demande n'a pas été retenue.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-0">
          {STEPS.map((step, i) => {
            const done    = i < current
            const active  = i === current

            return (
              <div key={step} className="flex-1 flex flex-col items-center">
                {/* Connector + circle row */}
                <div className="flex items-center w-full">
                  <div
                    className={`flex-1 h-0.5 ${i === 0 ? "bg-transparent" : done || active ? "bg-[#db143c]" : "bg-slate-200 dark:bg-slate-700"}`}
                  />
                  <div
                    className={`size-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                      done
                        ? "bg-[#db143c] border-[#db143c] text-white"
                        : active
                        ? "bg-white dark:bg-slate-900 border-[#db143c]"
                        : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {done ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : active ? (
                      <div className="size-2.5 rounded-full bg-[#db143c]" />
                    ) : (
                      <div className="size-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    )}
                  </div>
                  <div
                    className={`flex-1 h-0.5 ${i === STEPS.length - 1 ? "bg-transparent" : done ? "bg-[#db143c]" : "bg-slate-200 dark:bg-slate-700"}`}
                  />
                </div>

                {/* Label */}
                <p
                  className={`mt-2 text-xs font-medium text-center ${
                    done || active
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {step}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400 sm:w-36 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 dark:text-white font-medium flex-1">{value}</span>
    </div>
  )
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
        } else {
          const data = snap.data() as FirestoreOrder
          if (!canClientAccessOrder(data, user)) {
            setNotFound(true)
            setOrder(null)
          } else {
            setOrder({ id: snap.id, ...data })
          }
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id, user])

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Détail de la demande">
      <div className="p-6 w-full space-y-6">
        <Link
          to="/client/requests"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Retour aux demandes
        </Link>

        {loading && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse space-y-4">
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && notFound && (
          <div className="flex flex-col items-center gap-4 py-20">
            <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-600">
              search_off
            </span>
            <p className="font-semibold text-slate-900 dark:text-white">Demande introuvable</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              La demande demandée n'existe pas ou vous n'avez pas les droits pour la consulter.
            </p>
            <Link
              to="/client/requests"
              className="px-5 py-2.5 bg-[#db143c] text-white font-semibold rounded-lg hover:opacity-90 text-sm"
            >
              Retour à mes demandes
            </Link>
          </div>
        )}

        {!loading && order && (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {order.requestType ?? "Demande sans titre"}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Ref. {order.id.slice(0, 8).toUpperCase()} · Créée le{" "}
                    {formatFirestoreDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {order.priority && (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${priorityColor[order.priority] ?? "text-slate-600 bg-slate-100"}`}
                    >
                      {order.priority}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[order.status] ?? "text-slate-600 bg-slate-100"}`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <Timeline status={order.status} />

            <OrderAttachmentsList orderId={order.id} />

            {/* Details */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Détails</h3>

              <DetailRow label="Type" value={order.requestType ?? "—"} />
              <DetailRow label="Budget" value={order.budgetLabel ?? "—"} />
              <DetailRow label="Délai" value={order.timelineLabel ?? "—"} />
              <DetailRow label="Priorité" value={order.priority ?? "—"} />
              <DetailRow label="Statut" value={order.status} />
              <DetailRow
                label="Date de création"
                value={formatFirestoreDateTime(order.createdAt)}
              />

              {order.description && (
                <div className="py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1.5">Description</p>
                  <p className="text-sm text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                    {order.description}
                  </p>
                </div>
              )}

              {(order.features ?? []).length > 0 && (
                <div className="py-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    Fonctionnalités demandées
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(order.features ?? []).map((f, i) => (
                      <span
                        key={i}
                        className="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-700 dark:text-slate-300"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin comment */}
            {order.adminComment && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-blue-500 text-[20px]">
                    comment
                  </span>
                  <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">
                    Commentaire de l'équipe
                  </p>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                  {order.adminComment}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
