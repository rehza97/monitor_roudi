import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { clientNav } from "@/lib/nav"
import type { InvoiceRow } from "@/data/schema"
import { invoices as seedInvoices } from "@/data/seed"

type Invoice = InvoiceRow

function parseAmountDa(amount: string): number {
  return Number(amount.replace(/\s/g, "").replace(/\D/g, "")) || 0
}

function formatDa(n: number): string {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DA`
}

const statusColor: Record<string, string> = {
  "Payée":       "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "En attente":  "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "En retard":   "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
}

export default function ClientPayments() {
  const [invoices,    setInvoices]    = useState<Invoice[]>(() => [...seedInvoices])
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloaded,  setDownloaded]  = useState<Set<string>>(new Set())
  const [paying,      setPaying]      = useState<string | null>(null)
  const [editingCard, setEditingCard] = useState(false)

  function handleDownload(id: string) {
    if (downloaded.has(id)) return
    setDownloading(id)
    setTimeout(() => {
      setDownloading(null)
      setDownloaded(prev => new Set([...prev, id]))
    }, 1000)
  }

  function handlePay(id: string) {
    setPaying(id)
    setTimeout(() => {
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: "Payée" } : inv))
      setPaying(null)
    }, 1200)
  }

  const totalPaidDa = invoices
    .filter(i => i.status === "Payée")
    .reduce((sum, i) => sum + parseAmountDa(i.amount), 0)
  const totalPendingDa = invoices
    .filter(i => i.status === "En attente")
    .reduce((sum, i) => sum + parseAmountDa(i.amount), 0)

  return (
    <DashboardLayout role="client" navItems={clientNav} pageTitle="Factures & Paiements">
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total payé",     value: formatDa(totalPaidDa), icon: "check_circle", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "En attente",     value: formatDa(totalPendingDa),  icon: "schedule",     color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/20"   },
            { label: "Total factures", value: String(invoices.length), icon: "receipt_long", color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className={`size-10 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mb-3`}>
                <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Invoices */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">Historique des factures</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-6 py-4">
                <div className="size-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">description</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.title}</p>
                  <p className="text-xs text-slate-400">{inv.id} · {inv.date}</p>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{inv.amount}</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[inv.status]}`}>{inv.status}</span>
                {inv.status === "En attente" && (
                  <button
                    onClick={() => handlePay(inv.id)}
                    disabled={paying === inv.id}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {paying === inv.id ? "hourglass_empty" : "payments"}
                    </span>
                    {paying === inv.id ? "Traitement…" : "Payer"}
                  </button>
                )}
                <button
                  onClick={() => handleDownload(inv.id)}
                  disabled={downloading === inv.id}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                  title={downloaded.has(inv.id) ? "Téléchargé" : "Télécharger"}
                >
                  <span className={`material-symbols-outlined text-[18px] ${downloaded.has(inv.id) ? "text-emerald-500" : "text-slate-400"}`}>
                    {downloading === inv.id ? "hourglass_empty" : downloaded.has(inv.id) ? "check_circle" : "download"}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Moyen de paiement</h3>
          <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-cyan-600 bg-cyan-50 dark:bg-cyan-900/10">
            <span className="material-symbols-outlined text-cyan-600 text-[28px]">credit_card</span>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-white text-sm">Carte Visa •••• 4242</p>
              <p className="text-xs text-slate-500">Expire 09/2027</p>
            </div>
            <button
              onClick={() => setEditingCard(true)}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Modifier
            </button>
          </div>
          {editingCard && (
            <div className="mt-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Modifier le moyen de paiement</p>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
                placeholder="Numéro de carte"
              />
              <div className="grid grid-cols-2 gap-3">
                <input className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none" placeholder="MM/AA" />
                <input className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none" placeholder="CVV" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingCard(false)} className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                  Annuler
                </button>
                <button onClick={() => setEditingCard(false)} className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg">
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
