import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  onSnapshot,
  updateDoc,
  collection,
  doc,
  query,
  where,
  orderBy,
} from "@/lib/firebase-firestore"
import { COLLECTIONS } from "@/data/schema"
import type { FirestoreInvoice } from "@/data/schema"
import { buildInvoicePdfDataUri, downloadInvoicePdf } from "@/lib/invoice-pdf"
import { formatFirestoreDate } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceStatus = "En attente" | "Payée" | "En retard"

interface InvoiceDoc extends FirestoreInvoice {
  id: string
}

type FilterTab = "Tous" | InvoiceStatus

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000
    const formatted =
      k % 1 === 0
        ? `${k.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k`
        : `${k.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`
    return `${formatted} DA`
  }
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DA`
}

const statusConfig: Record<
  InvoiceStatus,
  { badge: string; icon: string }
> = {
  "En attente": {
    badge: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
    icon: "schedule",
  },
  Payée: {
    badge: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: "check_circle",
  },
  "En retard": {
    badge: "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
    icon: "error",
  },
}

const FILTER_TABS: FilterTab[] = ["Tous", "En attente", "Payée", "En retard"]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientPayments() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("Tous")
  const [paying, setPaying] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!db || !user?.organizationId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, COLLECTIONS.invoices),
      where("organizationId", "==", user.organizationId),
      orderBy("createdAt", "desc"),
    )

    const unsub = onSnapshot(q, (snap) => {
      const docs: InvoiceDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as FirestoreInvoice),
      }))
      setInvoices(docs)
      setLoading(false)
    })

    return unsub
  }, [user?.organizationId])

  async function handlePay(inv: InvoiceDoc) {
    if (!db) return
    setPaying(inv.id)
    await new Promise((r) => setTimeout(r, 800))
    try {
      await updateDoc(doc(db, COLLECTIONS.invoices, inv.id), {
        status: "Payée",
      } as Partial<FirestoreInvoice>)
    } finally {
      setPaying(null)
    }
  }

  function handleDownload(inv: InvoiceDoc) {
    const id = inv.id
    if (downloaded.has(id)) return
    setDownloading(id)
    setTimeout(() => {
      const dataUri =
        inv.pdfUrl ||
        buildInvoicePdfDataUri({
          invoiceNumber: inv.id,
          title: inv.title,
          amountLabel: formatAmount(inv.amount ?? 0),
          status: inv.status,
          issuedAt: inv.issuedAt ?? inv.createdAt,
          dueAt: inv.dueAt,
          clientLabel: inv.clientLabel,
          clientEmail: inv.clientEmail,
          organizationId: inv.organizationId,
        })
      downloadInvoicePdf(dataUri, `facture-${inv.id.slice(0, 8)}.pdf`)
      setDownloading(null)
      setDownloaded((prev) => new Set([...prev, id]))
    }, 800)
  }

  const totalPaid = invoices
    .filter((i) => i.status === "Payée")
    .reduce((s, i) => s + (i.amount ?? 0), 0)

  const totalPending = invoices
    .filter((i) => i.status === "En attente")
    .reduce((s, i) => s + (i.amount ?? 0), 0)

  const filtered =
    filter === "Tous" ? invoices : invoices.filter((i) => i.status === filter)

  const stats = [
    {
      label: "Total factures",
      value: String(invoices.length),
      icon: "receipt_long",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Montant total payé",
      value: formatAmount(totalPaid),
      icon: "check_circle",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Montant en attente",
      value: formatAmount(totalPending),
      icon: "schedule",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ]

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Factures & Paiements">
      <div className="p-6 w-full space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5"
            >
              <div
                className={`size-10 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mb-3`}
              >
                <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === tab
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Historique des factures
            </h3>
          </div>

          {/* Loading */}
          {loading && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="size-9 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center text-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[48px] mb-3">
                receipt_long
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {filter === "Tous"
                  ? "Aucune facture pour le moment."
                  : `Aucune facture avec le statut "${filter}".`}
              </p>
            </div>
          )}

          {/* Rows */}
          {!loading && filtered.length > 0 && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((inv) => {
                const sc =
                  statusConfig[(inv.status as InvoiceStatus) ?? "En attente"] ??
                  statusConfig["En attente"]
                return (
                  <div key={inv.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">
                        description
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {inv.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        Émise le {formatFirestoreDate(inv.issuedAt ?? inv.createdAt)}
                        {inv.dueAt ? ` · Échéance ${formatFirestoreDate(inv.dueAt)}` : ""}
                      </p>
                    </div>

                    <p className="font-bold text-slate-900 dark:text-white text-sm tabular-nums shrink-0">
                      {formatAmount(inv.amount ?? 0)}
                    </p>

                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${sc.badge}`}
                    >
                      {inv.status}
                    </span>

                    {inv.status === "En attente" && (
                      <button
                        onClick={() => handlePay(inv)}
                        disabled={paying === inv.id}
                        className="px-3 py-1.5 bg-[#db143c] hover:bg-[#b01030] disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shrink-0"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {paying === inv.id ? "hourglass_empty" : "payments"}
                        </span>
                        {paying === inv.id ? "Traitement…" : "Payer"}
                      </button>
                    )}

                    <button
                      onClick={() => handleDownload(inv)}
                      disabled={downloading === inv.id}
                      title={downloaded.has(inv.id) ? "Téléchargé" : "Télécharger"}
                      className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 shrink-0"
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          downloaded.has(inv.id)
                            ? "text-emerald-500"
                            : "text-slate-400"
                        }`}
                      >
                        {downloading === inv.id
                          ? "hourglass_empty"
                          : downloaded.has(inv.id)
                          ? "check_circle"
                          : "download"}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
