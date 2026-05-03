import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreSupportTicket } from "@/data/schema"
import { doc, getDoc, serverTimestamp, updateDoc } from "@/lib/firebase-firestore"
import { canTechnicianAccessTicket } from "@/lib/access-control"
import { notifyClientOfTicketStatusChanged } from "@/lib/notifications"

function parseMaterialUsage(value: string): Array<{ label: string; quantity?: number }> {
  return value
    .split(/\n|,/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*[x×-]?\s*(.+)$/i)
      if (!match) return { label: raw }
      return {
        quantity: Number(match[1]!.replace(",", ".")),
        label: match[2]!.trim(),
      }
    })
}

export default function TechnicianTicketValidate() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [duration, setDuration] = useState("")
  const [materials, setMaterials] = useState("")
  const [finalReport, setFinalReport] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [subject, setSubject] = useState("Intervention")
  const [ticket, setTicket] = useState<FirestoreSupportTicket | null>(null)

  useEffect(() => {
    async function load() {
      if (!db || !id) {
        setLoading(false)
        return
      }
      const snap = await getDoc(doc(db, COLLECTIONS.supportTickets, id))
      if (snap.exists()) {
        const data = snap.data() as FirestoreSupportTicket
        if (canTechnicianAccessTicket(data, user?.id)) {
          setTicket(data)
          setDuration(typeof data.duration === "string" ? data.duration : "")
          setMaterials(typeof data.materialsUsed === "string" ? data.materialsUsed : "")
          setFinalReport(typeof data.report === "string" ? data.report : "")
          setSubject(data.subject || "Intervention")
        } else {
          navigate("/technician/tickets", { replace: true })
          return
        }
      }
      setLoading(false)
    }
    void load()
  }, [id, navigate, user?.id])

  async function handleConfirm() {
    if (!db || !id) return
    setSubmitting(true)
    const materialUsageItems = parseMaterialUsage(materials)
    await updateDoc(doc(db, COLLECTIONS.supportTickets, id), {
      status: "Résolu",
      checkOutAt: serverTimestamp(),
      duration: duration.trim() || undefined,
      materialsUsed: materials.trim() || undefined,
      materialUsageItems,
      inventoryAdjustmentStatus: materialUsageItems.length > 0 ? "pending_review" : "none",
      report: finalReport.trim(),
      updatedAt: serverTimestamp(),
    })
    if (ticket) await notifyClientOfTicketStatusChanged(id, ticket, "Résolu")
    setSubmitting(false)
    setDone(true)
  }

  if (loading) {
    return (
      <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Validation de l'intervention">
        <div className="p-6 text-sm text-slate-500">Chargement…</div>
      </DashboardLayout>
    )
  }

  if (done) {
    return (
      <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Intervention clôturée">
        <div className="p-6 w-full">
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-5">
            <div className="size-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600 text-[48px]">check_circle</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Intervention clôturée</h2>
              <p className="text-slate-500">Le ticket {id} a été marqué comme résolu.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Link to="/technician/tickets" className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[18px]">home_repair_service</span>
                Retour aux interventions
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Validation de l'intervention">
      <div className="p-6 w-full space-y-6 bg-[#f8f8f6] min-h-[calc(100vh-64px)]">
        <Link to={`/technician/tickets/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour au ticket
        </Link>

        <div className="bg-[#ecb613]/10 border border-[#ecb613]/30 rounded-xl p-5 flex items-center gap-4">
          <span className="material-symbols-outlined text-[#ecb613] text-[40px]">fact_check</span>
          <div>
            <p className="font-bold text-slate-900">Valider la clôture: {subject}</p>
            <p className="text-sm text-slate-600 mt-0.5">Cette action marquera l'intervention comme terminée.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Résumé de l'intervention</h3>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Durée de l'intervention</label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ecb613]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Matériels utilisés</label>
            <input
              type="text"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              placeholder="Ex: Switch Cisco SG350, 2 câbles RJ45…"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ecb613]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Rapport final</label>
            <textarea
              rows={4}
              value={finalReport}
              onChange={(e) => setFinalReport(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ecb613] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => navigate(`/technician/tickets/${id}`)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 text-center transition-colors">
              Annuler
            </button>
            <button
              onClick={() => void handleConfirm()}
              disabled={submitting || !finalReport.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#ecb613] hover:bg-[#d9a50f] disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 text-sm font-bold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">{submitting ? "hourglass_empty" : "check_circle"}</span>
              {submitting ? "Clôture en cours…" : "Confirmer la clôture"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
