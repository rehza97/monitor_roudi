import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreInvoice, type FirestoreOrder, type InvoiceLineItem, type FirestorePlatformConfig, type InvoiceCompanyConfig } from "@/data/schema"
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "@/lib/firebase-firestore"
import { buildInvoicePdfDataUri, downloadInvoicePdf } from "@/lib/invoice-pdf"
import { formatFirestoreDate } from "@/lib/utils"

type InvoiceStatus = FirestoreInvoice["status"]

interface InvoiceDoc extends FirestoreInvoice {
  id: string
}

interface OrderDoc extends FirestoreOrder {
  id: string
}

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  "En attente": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  Payée: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "En retard": "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
}

const STATUS_FLOW: InvoiceStatus[] = ["En attente", "Payée", "En retard"]

function formatAmount(amount: number): string {
  return `${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} DA`
}

export default function AdminInvoices() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([])
  const [orders, setOrders] = useState<Map<string, OrderDoc>>(new Map())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<InvoiceStatus | "Tous">("Tous")
  const [queryText, setQueryText] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newOrganizationId, setNewOrganizationId] = useState("")
  const [newOrderId, setNewOrderId] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newClientLabel, setNewClientLabel] = useState("")
  const [newClientAddress, setNewClientAddress] = useState("")
  const [newClientPhone, setNewClientPhone] = useState("")
  const [newDueAt, setNewDueAt] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newTaxRate, setNewTaxRate] = useState("19")
  const [lineItems, setLineItems] = useState([{ description: "", qty: "1", unitPrice: "" }])
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const qInvoices = query(collection(db, COLLECTIONS.invoices), orderBy("createdAt", "desc"))
    const unsubInvoices = onSnapshot(qInvoices, (snap) => {
      setInvoices(snap.docs.map((d) => ({ id: d.id, ...(d.data() as FirestoreInvoice) })))
      setLoading(false)
    })
    const qOrders = query(collection(db, COLLECTIONS.orders), orderBy("createdAt", "desc"))
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const map = new Map<string, OrderDoc>()
      snap.docs.forEach((d) => {
        map.set(d.id, { id: d.id, ...(d.data() as FirestoreOrder) })
      })
      setOrders(map)
    })
    return () => {
      unsubInvoices()
      unsubOrders()
    }
  }, [])

  useEffect(() => {
    const fromOrderId = searchParams.get("orderId")?.trim()
    if (!fromOrderId || !orders.size) return
    const linked = orders.get(fromOrderId)
    if (!linked) return
    setNewOrderId(fromOrderId)
    setNewOrganizationId(linked.organizationId ?? "")
    setNewTitle(`Facture - ${linked.requestType ?? "Demande client"}`)
    setNewClientEmail(linked.clientEmail ?? "")
    setNewClientLabel(linked.clientLabel ?? "")
    setShowInvoiceForm(true)
  }, [orders, searchParams])

  const invoiceSubtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0
    const price = parseFloat(item.unitPrice) || 0
    return sum + qty * price
  }, 0)
  const invoiceTax = invoiceSubtotal * (parseFloat(newTaxRate) || 0) / 100
  const invoiceTotal = invoiceSubtotal + invoiceTax

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", qty: "1", unitPrice: "" }])
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateLineItem(idx: number, field: "description" | "qty" | "unitPrice", value: string) {
    setLineItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function setInvoiceStatus(id: string, status: InvoiceStatus) {
    if (!db) return
    setUpdatingId(id)
    try {
      await updateDoc(doc(db, COLLECTIONS.invoices, id), {
        status,
        updatedAt: serverTimestamp(),
      } as Partial<FirestoreInvoice>)
    } finally {
      setUpdatingId(null)
    }
  }

  async function sendInvoice(inv: InvoiceDoc) {
    if (!db || !user) return
    setSendingId(inv.id)
    try {
      const linkedOrder = inv.orderId ? orders.get(inv.orderId) : undefined

      let company: Partial<InvoiceCompanyConfig> | undefined
      try {
        const cfgSnap = await getDoc(doc(db, COLLECTIONS.platformConfig, "main"))
        if (cfgSnap.exists()) {
          const cfg = cfgSnap.data() as FirestorePlatformConfig
          company = cfg.invoiceConfig
        }
      } catch {}

      const pdfUrl = buildInvoicePdfDataUri({
        invoiceNumber: inv.id,
        title: inv.title,
        amountLabel: formatAmount(inv.amount ?? 0),
        status: inv.status,
        issuedAt: inv.issuedAt ?? inv.createdAt,
        dueAt: inv.dueAt,
        clientLabel: inv.clientLabel || linkedOrder?.clientLabel || "Client",
        clientEmail: inv.clientEmail || linkedOrder?.clientEmail || "",
        clientAddress: inv.clientAddress,
        clientPhone: inv.clientPhone,
        organizationId: inv.organizationId,
        taxRate: inv.taxRate,
        lineItems: inv.lineItems,
        notes: inv.notes,
        company,
      })

      await updateDoc(doc(db, COLLECTIONS.invoices, inv.id), {
        pdfUrl,
        sentAt: serverTimestamp(),
        sentByUserId: user.id,
        sentByName: user.name,
        updatedAt: serverTimestamp(),
      } as Partial<FirestoreInvoice>)

      downloadInvoicePdf(pdfUrl, `facture-${inv.id.slice(0, 8)}.pdf`)
    } finally {
      setSendingId(null)
    }
  }

  async function createInvoice() {
    if (!db || !user) return
    if (!newTitle.trim() || !newOrganizationId.trim() || invoiceTotal <= 0) {
      setCreateError("Titre, organisation et au moins une ligne de service sont obligatoires.")
      return
    }
    setCreateError("")
    setCreating(true)
    try {
      const dueDate = newDueAt ? new Date(`${newDueAt}T00:00:00`) : undefined
      const savedLineItems: InvoiceLineItem[] = lineItems
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description.trim(),
          qty: parseFloat(i.qty) || 1,
          unitPrice: parseFloat(i.unitPrice) || 0,
          total: (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0),
        }))

      const ref = await addDoc(collection(db, COLLECTIONS.invoices), {
        title: newTitle.trim(),
        amount: invoiceTotal,
        status: "En attente",
        organizationId: newOrganizationId.trim(),
        orderId: newOrderId.trim() || undefined,
        clientEmail: newClientEmail.trim() || undefined,
        clientLabel: newClientLabel.trim() || undefined,
        clientAddress: newClientAddress.trim() || undefined,
        clientPhone: newClientPhone.trim() || undefined,
        taxRate: parseFloat(newTaxRate) || 19,
        lineItems: savedLineItems.length ? savedLineItems : undefined,
        notes: newNotes.trim() || undefined,
        createdByUserId: user.id,
        issuedAt: serverTimestamp(),
        dueAt: dueDate,
        createdAt: serverTimestamp(),
      } as FirestoreInvoice)

      if (newOrderId.trim()) {
        await updateDoc(doc(db, COLLECTIONS.orders, newOrderId.trim()), {
          invoiceId: ref.id,
          updatedAt: serverTimestamp(),
        } as Partial<FirestoreOrder>)
      }

      setNewTitle("")
      setNewOrganizationId("")
      setNewOrderId("")
      setNewClientEmail("")
      setNewClientLabel("")
      setNewClientAddress("")
      setNewClientPhone("")
      setNewDueAt("")
      setNewNotes("")
      setNewTaxRate("19")
      setLineItems([{ description: "", qty: "1", unitPrice: "" }])
      setShowInvoiceForm(false)
    } finally {
      setCreating(false)
    }
  }

  const filtered = invoices.filter((inv) => {
    const byStatus = filter === "Tous" || inv.status === filter
    const q = queryText.trim().toLowerCase()
    if (!q) return byStatus
    const hay = [
      inv.id,
      inv.title,
      inv.organizationId,
      inv.clientEmail,
      inv.clientLabel,
      inv.orderId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return byStatus && hay.includes(q)
  })

  const stats = useMemo(() => {
    const total = invoices.length
    const sent = invoices.filter((i) => i.sentAt).length
    const paid = invoices.filter((i) => i.status === "Payée").length
    return { total, sent, paid }
  }, [invoices])

  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Facturation">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Factures", value: String(stats.total), icon: "receipt_long" },
            { label: "PDF envoyés", value: String(stats.sent), icon: "send" },
            { label: "Payées", value: String(stats.paid), icon: "payments" },
          ].map((k) => (
            <div key={k.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Toggle button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowInvoiceForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
          >
            <span className="material-symbols-outlined text-[18px]">{showInvoiceForm ? "close" : "add"}</span>
            {showInvoiceForm ? "Annuler" : "Nouvelle facture"}
          </button>
        </div>

        {/* Invoice document form */}
        {showInvoiceForm && (
          <div ref={formRef} className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">

            {/* Invoice header — mimics letterhead */}
            <div className="bg-[#1c2840] px-8 py-6 flex items-start justify-between gap-6">
              <div>
                <p className="text-white font-bold text-xl tracking-tight">RODAINA</p>
                <p className="text-slate-300 text-xs mt-0.5">Digital Systems & Monitoring</p>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  Alger, Algérie<br />
                  contact@rodaina.dz &nbsp;·&nbsp; +213 XX XX XX XX
                </p>
              </div>
              <div className="text-right">
                <p className="text-white font-extrabold text-3xl tracking-widest">FACTURE</p>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-slate-400 text-xs">Objet :</span>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Titre de la facture"
                      className="bg-white/10 border border-white/20 rounded-lg px-2 h-7 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/50 w-56 text-right"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-slate-400 text-xs">Ref. commande :</span>
                    <input
                      value={newOrderId}
                      onChange={(e) => setNewOrderId(e.target.value)}
                      placeholder="orderId (opt.)"
                      className="bg-white/10 border border-white/20 rounded-lg px-2 h-7 text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-white/50 w-40 text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">

              {/* Dates & Client row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Bill To */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Facturé à</p>
                  <div className="space-y-2">
                    <input
                      value={newClientLabel}
                      onChange={(e) => setNewClientLabel(e.target.value)}
                      placeholder="Nom du client ou de l'entreprise"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                    />
                    <input
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="Email"
                      type="email"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                    />
                    <input
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="Téléphone"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                    />
                    <input
                      value={newClientAddress}
                      onChange={(e) => setNewClientAddress(e.target.value)}
                      placeholder="Adresse"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                    />
                    <input
                      value={newOrganizationId}
                      onChange={(e) => setNewOrganizationId(e.target.value)}
                      placeholder="ID organisation *"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition font-mono"
                    />
                  </div>
                </div>

                {/* Invoice meta */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Informations</p>
                  <div className="space-y-2">
                    {[
                      { label: "Date d'émission", value: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }), readonly: true },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span className="text-xs text-slate-500">{label}</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500">Date d'échéance</span>
                      <input
                        type="date"
                        value={newDueAt}
                        onChange={(e) => setNewDueAt(e.target.value)}
                        className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                      />
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500">TVA (%)</span>
                      <input
                        value={newTaxRate}
                        onChange={(e) => setNewTaxRate(e.target.value)}
                        type="number"
                        min={0}
                        max={100}
                        className="h-8 w-20 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-right text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-slate-500">Statut</span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        En attente
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line items */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Détail des prestations</p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#1c2840]">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider w-full">Description</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap">Qté</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap">Prix unit. (DA)</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap">Total (DA)</th>
                        <th className="px-2 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {lineItems.map((item, idx) => {
                        const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)
                        return (
                          <tr key={idx} className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="px-3 py-2">
                              <input
                                value={item.description}
                                onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                                placeholder="Ex: Installation et configuration réseau"
                                className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                              />
                            </td>
                            <td className="px-3 py-2 w-20">
                              <input
                                value={item.qty}
                                onChange={(e) => updateLineItem(idx, "qty", e.target.value)}
                                type="number"
                                min={1}
                                className="w-16 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm text-right text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                              />
                            </td>
                            <td className="px-3 py-2 w-36">
                              <input
                                value={item.unitPrice}
                                onChange={(e) => updateLineItem(idx, "unitPrice", e.target.value)}
                                type="number"
                                min={0}
                                placeholder="0"
                                className="w-32 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm text-right text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap w-32">
                              {lineTotal > 0 ? formatAmount(lineTotal) : "—"}
                            </td>
                            <td className="px-2 py-2">
                              {lineItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLineItem(idx)}
                                  className="size-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#db143c] hover:opacity-80 transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      Ajouter une ligne
                    </button>
                  </div>
                </div>
              </div>

              {/* Totals + notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Notes</p>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={4}
                    placeholder="Conditions de paiement, remarques particulières…"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#db143c]/30 transition"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {[
                    { label: "Sous-total HT", value: formatAmount(invoiceSubtotal) },
                    { label: `TVA (${newTaxRate || 0}%)`, value: formatAmount(invoiceTax) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-4 bg-[#1c2840]">
                    <span className="text-sm font-bold text-white uppercase tracking-wide">Total TTC</span>
                    <span className="text-xl font-extrabold text-white">{formatAmount(invoiceTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Footer bar */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                {createError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {createError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowInvoiceForm(false)}
                  className="ml-auto px-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={() => void createInvoice()}
                  disabled={creating || invoiceTotal <= 0 || !newTitle.trim() || !newOrganizationId.trim()}
                  className="flex items-center gap-2 px-5 h-10 rounded-lg bg-[#db143c] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition"
                >
                  {creating ? (
                    <>
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      Créer la facture
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {(["Tous", ...STATUS_FLOW] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === s ? "bg-[#db143c] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
            >
              {s}
            </button>
          ))}
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Rechercher facture / org / client / orderId"
            className="ml-auto h-9 min-w-[280px] px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {["Réf.", "Titre", "Client", "Montant", "Statut", "Émission", "PDF", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">Chargement…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">Aucune facture.</td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{inv.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{inv.title}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {inv.clientLabel || "—"}
                      <p className="text-xs text-slate-400">{inv.clientEmail || inv.organizationId}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{formatAmount(inv.amount ?? 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {formatFirestoreDate(inv.issuedAt ?? inv.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {inv.pdfUrl ? (
                        <button
                          onClick={() => downloadInvoicePdf(inv.pdfUrl!, `facture-${inv.id.slice(0, 8)}.pdf`)}
                          className="text-[#db143c] font-semibold hover:opacity-80"
                        >
                          Télécharger
                        </button>
                      ) : (
                        <span className="text-slate-400">Non généré</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => void sendInvoice(inv)}
                          disabled={sendingId === inv.id}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {sendingId === inv.id ? "Envoi…" : "Envoyer PDF"}
                        </button>
                        {STATUS_FLOW.filter((s) => s !== inv.status).map((s) => (
                          <button
                            key={s}
                            onClick={() => void setInvoiceStatus(inv.id, s)}
                            disabled={updatingId === inv.id}
                            className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
