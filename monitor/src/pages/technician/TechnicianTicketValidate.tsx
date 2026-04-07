import { useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useParams, Link, useNavigate } from "react-router-dom"

export default function TechnicianTicketValidate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [duration, setDuration] = useState("2h 30min")
  const [materials, setMaterials] = useState("")
  const [finalReport, setFinalReport] = useState("Switch principal remplacé par Cisco SG350. Tests de connectivité OK. Réseau opérationnel à 100%.")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function handleConfirm() {
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setDone(true)
    }, 1000)
  }

  if (done) {
    return (
      <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Intervention clôturée">
        <div className="p-6 w-full">
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-5">
            <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600 text-[48px]">check_circle</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Intervention clôturée !</h2>
              <p className="text-slate-500 dark:text-slate-400">Le ticket {id} a été marqué comme résolu.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Link
                to="/technician/tickets"
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors"
              >
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
      <div className="p-6 w-full space-y-6">
        <Link to={`/technician/tickets/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour au ticket
        </Link>

        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 flex items-center gap-4">
          <span className="material-symbols-outlined text-emerald-600 text-[40px]">check_circle</span>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Valider la clôture du ticket {id}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Cette action marquera l'intervention comme terminée.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Résumé de l'intervention</h3>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Durée de l'intervention</label>
            <input
              type="text"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Matériels utilisés</label>
            <input
              type="text"
              value={materials}
              onChange={e => setMaterials(e.target.value)}
              placeholder="Ex: Switch Cisco SG350, 2 câbles RJ45…"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rapport final</label>
            <textarea
              rows={4}
              value={finalReport}
              onChange={e => setFinalReport(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate(`/technician/tickets/${id}`)}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || !finalReport.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                {submitting ? "hourglass_empty" : "check_circle"}
              </span>
              {submitting ? "Clôture en cours…" : "Confirmer la clôture"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
