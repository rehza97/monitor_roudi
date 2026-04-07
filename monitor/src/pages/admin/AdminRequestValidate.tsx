import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { COLLECTIONS, ORDER_KIND, type FirestoreOrder } from "@/data/schema"
import { doc, getDoc, serverTimestamp, updateDoc } from "@/lib/firebase-firestore"
import { formatFirestoreDate } from "@/lib/utils"

type Decision = "idle" | "validating" | "rejecting" | "validated" | "rejected"

export default function AdminRequestValidate() {
  const { id } = useParams()
  const { user } = useAuth()
  const [order, setOrder] = useState<FirestoreOrder | null>(null)
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [decision, setDecision] = useState<Decision>("idle")

  useEffect(() => {
    if (!db || !id) {
      setLoading(false)
      setLoadError(!db ? "Firestore indisponible." : "Référence manquante.")
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.orders, id))
        if (cancelled) return
        if (!snap.exists()) {
          setLoadError("Demande introuvable.")
          setOrder(null)
        } else {
          const data = snap.data() as FirestoreOrder
          if (data.kind !== ORDER_KIND.clientRequest) {
            setLoadError("Ce document n'est pas une demande client.")
            setOrder(null)
          } else {
            setOrder(data)
            setLoadError("")
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Erreur de chargement.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  async function persistDecision(status: string) {
    if (!db || !id || !user) throw new Error("Impossible d'enregistrer.")
    await updateDoc(doc(db, COLLECTIONS.orders, id), {
      status,
      adminComment: comment.trim(),
      updatedAt: serverTimestamp(),
    })
  }

  async function handleValidate() {
    setDecision("validating")
    try {
      await persistDecision("Validée")
      setDecision("validated")
    } catch {
      setDecision("idle")
    }
  }

  async function handleReject() {
    setDecision("rejecting")
    try {
      await persistDecision("Rejetée")
      setDecision("rejected")
    } catch {
      setDecision("idle")
    }
  }

  if (decision === "validated") {
    return (
      <DashboardLayout role="admin" navItems={adminNav} pageTitle="Validation de la demande">
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600 text-[40px]">check_circle</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Demande validée</h2>
          <p className="text-slate-500 text-sm text-center max-w-xs">
            La demande <strong>{id}</strong> a été validée.
          </p>
          {comment ? (
            <p className="text-sm text-slate-400 italic max-w-xs text-center">&quot;{comment}&quot;</p>
          ) : null}
          <Link
            to="/admin/requests"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#db143c] hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Retour aux demandes
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  if (decision === "rejected") {
    return (
      <DashboardLayout role="admin" navItems={adminNav} pageTitle="Validation de la demande">
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="size-20 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-rose-600 text-[40px]">cancel</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Demande rejetée</h2>
          <p className="text-slate-500 text-sm text-center max-w-xs">
            La demande <strong>{id}</strong> a été rejetée.
          </p>
          {comment ? (
            <p className="text-sm text-slate-400 italic max-w-xs text-center">&quot;{comment}&quot;</p>
          ) : null}
          <Link
            to="/admin/requests"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#db143c] hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Retour aux demandes
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const busy = decision === "validating" || decision === "rejecting"

  if (loading) {
    return (
      <DashboardLayout role="admin" navItems={adminNav} pageTitle="Validation de la demande">
        <div className="p-6 text-slate-500 text-sm">Chargement…</div>
      </DashboardLayout>
    )
  }

  if (loadError || !order) {
    return (
      <DashboardLayout role="admin" navItems={adminNav} pageTitle="Validation de la demande">
        <div className="p-6 space-y-4">
          <p className="text-rose-600 text-sm">{loadError || "Introuvable."}</p>
          <Link to="/admin/requests" className="text-sm text-[#db143c] font-medium">
            ← Retour aux demandes
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const statusBadge =
    order.status === "Validée"
      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
      : order.status === "Rejetée"
        ? "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400"
        : order.status === "En cours"
          ? "text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
          : "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400"

  const features = Array.isArray(order.features) ? order.features : []

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Validation de la demande">
      <div className="p-6 w-full space-y-6">
        <Link to="/admin/requests" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour
        </Link>

        <div className="flex items-start gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {order.requestType ?? "Demande"}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Réf. {id} · Client : {order.clientLabel ?? "—"}
              {order.clientEmail ? ` · ${order.clientEmail}` : ""}
            </p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full shrink-0 ${statusBadge}`}>
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Description du besoin</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                {order.description?.trim() || "—"}
              </p>
            </div>
            {features.length > 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Fonctionnalités / tags</h3>
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => (
                    <span
                      key={f}
                      className="text-xs font-medium px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {order.status === "En attente" || order.status === "En cours" ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Décision</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Commentaire interne <span className="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#db143c] resize-none"
                    placeholder="Ajouter un commentaire…"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleValidate()}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {decision === "validating" ? "hourglass_empty" : "check_circle"}
                    </span>
                    {decision === "validating" ? "Validation…" : "Valider"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReject()}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {decision === "rejecting" ? "hourglass_empty" : "cancel"}
                    </span>
                    {decision === "rejecting" ? "Rejet…" : "Rejeter"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Cette demande est déjà <strong>{order.status}</strong>.
                {order.adminComment ? ` Commentaire : ${order.adminComment}` : ""}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Détails</h3>
              {[
                { label: "Budget", value: order.budgetLabel ?? "—" },
                { label: "Délai", value: order.timelineLabel ?? "—" },
                { label: "Priorité", value: order.priority ?? "—" },
                { label: "Date soumission", value: formatFirestoreDate(order.createdAt) },
              ].map((i) => (
                <div key={i.label} className="flex justify-between text-sm gap-2">
                  <span className="text-slate-500">{i.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">{i.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Client</h3>
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-[#db143c] flex items-center justify-center text-white text-xs font-bold">
                  {(order.clientLabel ?? "?")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {order.clientLabel ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">{order.clientEmail ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
