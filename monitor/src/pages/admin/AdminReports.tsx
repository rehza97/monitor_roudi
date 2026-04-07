import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { db, isFirebaseConfigured } from "@/config/firebase"
import { COLLECTIONS, ORDER_KIND, type FirestoreOrder } from "@/data/schema"
import { collection, onSnapshot } from "@/lib/firebase-firestore"
import { firestoreToMillis } from "@/lib/utils"

const periods = ["7 jours", "30 jours", "3 mois", "Année"] as const
type Period = (typeof periods)[number]

type OrderDoc = { id: string; data: FirestoreOrder }
type InvoiceDoc = { id: string; data: Record<string, unknown> }

function periodBounds(period: Period): { start: number; now: number; prevStart: number } {
  const now = Date.now()
  let days = 30
  if (period === "7 jours") days = 7
  else if (period === "3 mois") days = 90
  else if (period === "Année") days = 365
  const ms = days * 86400000
  return { start: now - ms, now, prevStart: now - 2 * ms }
}

function inRange(ms: number | null, start: number, end: number): boolean {
  return ms != null && ms >= start && ms <= end
}

function invoiceAmount(data: Record<string, unknown>): number {
  const a = data.amount
  if (typeof a === "number" && Number.isFinite(a)) return a
  if (typeof a === "string") {
    const n = parseFloat(a.replace(/\s/g, "").replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function invoiceTimeMs(data: Record<string, unknown>): number | null {
  return (
    firestoreToMillis(data.issuedAt) ??
    firestoreToMillis(data.createdAt) ??
    firestoreToMillis(data.dueAt)
  )
}

export default function AdminReports() {
  const [period, setPeriod] = useState<Period>("30 jours")
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([])
  const [deploymentCount, setDeploymentCount] = useState(0)
  const [healthyDeployments, setHealthyDeployments] = useState(0)

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      setError("Firebase n’est pas configuré.")
      return
    }

    const unsubs: Array<() => void> = []

    unsubs.push(
      onSnapshot(
        collection(db, COLLECTIONS.orders),
        snap => {
          setError(null)
          const list: OrderDoc[] = []
          snap.forEach(d => list.push({ id: d.id, data: d.data() as FirestoreOrder }))
          setOrders(list)
        },
        err => setError(err.message)
      )
    )

    unsubs.push(
      onSnapshot(
        collection(db, COLLECTIONS.invoices),
        snap => {
          const list: InvoiceDoc[] = []
          snap.forEach(d => list.push({ id: d.id, data: d.data() as Record<string, unknown> }))
          setInvoices(list)
        },
        () => {}
      )
    )

    unsubs.push(
      onSnapshot(
        collection(db, COLLECTIONS.deployments),
        snap => {
          let total = 0
          let ok = 0
          snap.forEach(d => {
            total += 1
            const h = (d.data() as Record<string, unknown>).health
            const s = typeof h === "string" ? h.toLowerCase() : ""
            if (s === "ok" || s === "healthy") ok += 1
          })
          setDeploymentCount(total)
          setHealthyDeployments(ok)
        },
        () => {}
      )
    )

    return () => unsubs.forEach(u => u())
  }, [])

  const { kpis, bars, typeDistribution, exportPayload, hasInvoiceRevenue } = useMemo(() => {
    const { start, now, prevStart } = periodBounds(period)

    const demandes = orders.filter(o => o.data.kind === ORDER_KIND.clientRequest)
    const supplies = orders.filter(o => o.data.kind === ORDER_KIND.materialSupply)

    const countDemandes = (from: number, to: number) =>
      demandes.filter(o => inRange(firestoreToMillis(o.data.createdAt), from, to)).length

    const countSupplies = (from: number, to: number) =>
      supplies.filter(o => inRange(firestoreToMillis(o.data.createdAt), from, to)).length

    const validated = (from: number, to: number) =>
      demandes.filter(
        o =>
          inRange(firestoreToMillis(o.data.createdAt), from, to) &&
          (o.data.status === "Validée" || o.data.status === "Validé")
      ).length

    const dNow = countDemandes(start, now)
    const dPrev = countDemandes(prevStart, start)
    const sNow = countSupplies(start, now)
    const sPrev = countSupplies(prevStart, start)
    const vNow = validated(start, now)
    const vPrev = validated(prevStart, start)
    const invRevenue = invoices.reduce((sum, inv) => {
      const t = invoiceTimeMs(inv.data)
      if (!inRange(t, start, now)) return sum
      return sum + invoiceAmount(inv.data)
    }, 0)
    const invPrev = invoices.reduce((sum, inv) => {
      const t = invoiceTimeMs(inv.data)
      if (!inRange(t, prevStart, start)) return sum
      return sum + invoiceAmount(inv.data)
    }, 0)

    function trendLabel(cur: number, prev: number): { text: string; up: boolean } {
      if (prev === 0 && cur === 0) return { text: "stable", up: true }
      if (prev === 0) return { text: `+${cur} vs période préc.`, up: true }
      const pct = Math.round(((cur - prev) / prev) * 100)
      return { text: `${pct >= 0 ? "+" : ""}${pct}% vs période préc.`, up: pct >= 0 }
    }

    const tDem = trendLabel(dNow, dPrev)
    const tVal = trendLabel(vNow, vPrev)
    const tSup = trendLabel(sNow, sPrev)
    const tInv =
      invPrev === 0 && invRevenue === 0
        ? { text: "aucune facture", up: true }
        : trendLabel(invRevenue, invPrev)

    const kpisList = [
      {
        label: "Demandes clients",
        value: String(dNow),
        trend: tDem.text,
        trendUp: tDem.up,
      },
      {
        label: "Demandes validées",
        value: String(vNow),
        trend: dNow ? `${tVal.text} · ${Math.round((vNow / dNow) * 100)}% du volume` : tVal.text,
        trendUp: tVal.up,
      },
      {
        label: "Commandes matériel",
        value: String(sNow),
        trend: tSup.text,
        trendUp: tSup.up,
      },
      {
        label: "CA factures (période)",
        value:
          invRevenue >= 1_000_000
            ? `${(invRevenue / 1_000_000).toFixed(1)} M`
            : invRevenue >= 1000
              ? `${(invRevenue / 1000).toFixed(1)} k`
              : `${Math.round(invRevenue)}`,
        trend: tInv.text,
        trendUp: tInv.up,
      },
    ]

    const hasInvoiceRevenue = invoices.some(inv => {
      const t = invoiceTimeMs(inv.data)
      return inRange(t, start, now) && invoiceAmount(inv.data) > 0
    })

    const weekMs = 7 * 86400000
    const span = Math.max(now - start, weekMs)
    const numWeeks = Math.min(12, Math.max(1, Math.ceil(span / weekMs)))
    const barsList: { label: string; value: number }[] = []
    for (let i = 0; i < numWeeks; i++) {
      const wStart = start + i * weekMs
      const wEnd = Math.min(now, wStart + weekMs)
      let rev = 0
      for (const inv of invoices) {
        const t = invoiceTimeMs(inv.data)
        if (t != null && t >= wStart && t < wEnd) rev += invoiceAmount(inv.data)
      }
      if (hasInvoiceRevenue) {
        barsList.push({ label: `S${i + 1}`, value: Math.round(rev) })
      } else {
        const vol = demandes.filter(o => {
          const t = firestoreToMillis(o.data.createdAt)
          return t != null && t >= wStart && t < wEnd
        }).length
        barsList.push({ label: `S${i + 1}`, value: vol })
      }
    }

    const types: Record<string, number> = {}
    for (const o of demandes) {
      const t = firestoreToMillis(o.data.createdAt)
      if (!inRange(t, start, now)) continue
      const key = (o.data.requestType && o.data.requestType.trim()) || "Non précisé"
      types[key] = (types[key] ?? 0) + 1
    }
    const typeTotal = Object.values(types).reduce((a, b) => a + b, 0)
    const palette = ["bg-[#db143c]", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-slate-500"]
    const typeDistributionList =
      typeTotal === 0
        ? []
        : Object.entries(types)
            .map(([label, n], i) => ({
              label,
              pct: Math.round((n / typeTotal) * 100),
              color: palette[i % palette.length]!,
            }))
            .sort((a, b) => b.pct - a.pct)

    const payload = {
      generatedAt: new Date().toISOString(),
      period,
      kpis: kpisList,
      demandesPeriode: dNow,
      commandesMaterielPeriode: sNow,
      validationsPeriode: vNow,
      revenuFacturesPeriode: invRevenue,
      deploiementsTotal: deploymentCount,
      deploiementsSains: healthyDeployments,
      repartitionTypes: types,
      semaines: barsList,
    }

    return {
      kpis: kpisList,
      bars: barsList,
      typeDistribution: typeDistributionList,
      exportPayload: payload,
      hasInvoiceRevenue,
    }
  }, [period, orders, invoices, deploymentCount, healthyDeployments])

  const maxBar = bars.length > 0 ? Math.max(...bars.map(b => b.value), 1) : 0

  function handleExport() {
    setExporting(true)
    try {
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `rapport-admin-${period.replace(/\s+/g, "-")}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setTimeout(() => setExporting(false), 400)
    }
  }

  const barTitle = hasInvoiceRevenue ? "Évolution du chiffre (factures)" : "Volume de demandes par semaine"

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Rapports & Statistiques">
      <div className="p-6 space-y-6">
        {error && (
          <p className="text-sm text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900 px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-500 dark:text-slate-400">Période :</span>
            {periods.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-[#db143c] text-white"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">{exporting ? "hourglass_empty" : "download"}</span>
            {exporting ? "Export…" : "Exporter JSON"}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Données en direct : commandes / demandes, factures et déploiements Firestore. Les tendances comparent à la
          période précédente de même durée.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div
              key={k.label}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5"
            >
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{k.label}</p>
              <p className={`text-xs font-semibold mt-2 ${k.trendUp ? "text-emerald-600" : "text-rose-600"}`}>
                {k.trendUp ? "↑" : "↓"} {k.trend}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{barTitle}</h3>
            {bars.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Pas de données sur cette période.</p>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {bars.map(b => (
                  <div key={b.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="w-full relative flex items-end" style={{ height: "120px" }}>
                      <div
                        className="w-full bg-[#db143c] rounded-t-sm transition-all duration-500 min-h-[4px]"
                        style={{ height: `${maxBar > 0 ? (b.value / maxBar) * 100 : 0}%` }}
                        title={String(b.value)}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 truncate w-full text-center">{b.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Répartition par type de demande</h3>
            {typeDistribution.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Aucune demande client sur cette période.</p>
            ) : (
              <div className="space-y-3">
                {typeDistribution.map(t => (
                  <div key={t.label}>
                    <div className="flex justify-between text-sm mb-1 gap-2">
                      <span className="text-slate-600 dark:text-slate-300 truncate">{t.label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white shrink-0">{t.pct}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${t.color} transition-all duration-500`}
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-sm text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-white">Déploiements : </span>
          {healthyDeployments} sains sur {deploymentCount} suivis (tous horizons, instantané).
        </div>
      </div>
    </DashboardLayout>
  )
}
