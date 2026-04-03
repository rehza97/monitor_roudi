import DashboardLayout from "@/components/layouts/DashboardLayout"
import { adminNav } from "@/lib/nav"
import { Link } from "react-router-dom"

/* MOCK inventory — disabled */
const items: { name: string; category: string; stock: number; price: string; status: string }[] = []
const statusStyle: Record<string, string> = {
  "En stock":  "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Stock bas": "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
  "Rupture":   "text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400",
}

export default function AdminMaterials() {
  return (
    <DashboardLayout role="admin" navItems={adminNav} pageTitle="Gestion des Matériels">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            {[
              { label: "En stock", value: items.filter(i => i.status === "En stock").length, color: "text-emerald-600" },
              { label: "Stock bas", value: items.filter(i => i.status === "Stock bas").length, color: "text-amber-600" },
              { label: "Rupture", value: items.filter(i => i.status === "Rupture").length, color: "text-rose-600" },
            ].map(s => (
              <div key={s.label} className="text-sm"><span className={`font-bold ${s.color}`}>{s.value}</span> <span className="text-slate-500">{s.label}</span></div>
            ))}
          </div>
          <Link to="/admin/materials/order" className="flex items-center gap-2 px-4 py-2 bg-[#db143c] text-white text-sm font-semibold rounded-lg hover:opacity-90">
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>Commander
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.name} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.category}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[item.status]}`}>{item.status}</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">{item.name}</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Stock : <span className="font-semibold text-slate-700 dark:text-slate-300">{item.stock} unités</span></span>
                <span className="font-bold text-slate-900 dark:text-white">{item.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
