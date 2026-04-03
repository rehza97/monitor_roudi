import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"

export default function AdminClientDetail() {
  const { id } = useParams()
  return (
    <DashboardLayout role="admin" navItems={adminNav} userName="Admin Rodaina" userEmail="admin@rodaina.fr" userInitials="AR" pageTitle="Fiche Client">
      <div className="p-6 max-w-4xl space-y-6">
        <Link to="/admin/location" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Retour
        </Link>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-start gap-5">
            <div className="size-16 rounded-xl bg-[#db143c] flex items-center justify-center text-white text-2xl font-bold shrink-0">TS</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">TechSolutions SAS</h2>
              <p className="text-slate-500 text-sm mt-1">Client depuis Mars 2023 · ID : {id}</p>
              <div className="flex gap-3 mt-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400">Actif</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400">Premium</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">Informations de contact</h3>
            {[{ icon: "email", label: "Email", value: "contact@techsolutions.fr" }, { icon: "call", label: "Téléphone", value: "+213 21 42 00 00" }, { icon: "location_on", label: "Adresse", value: "12 Rue du Commerce, Alger 16015" }].map(i => (
              <div key={i.label} className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-[#db143c] text-[18px]">{i.icon}</span>
                <span className="text-slate-500">{i.label} :</span>
                <span className="font-medium text-slate-900 dark:text-white">{i.value}</span>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h3 className="font-semibold text-slate-900 dark:text-white">Statistiques</h3>
            {[{ label: "Demandes totales", value: "8" }, { label: "Apps déployées", value: "5" }, { label: "CA généré", value: "78 500 DA" }, { label: "Dernière activité", value: "12 Mar 2025" }].map(s => (
              <div key={s.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{s.label}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
