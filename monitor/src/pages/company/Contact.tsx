import PublicLayout from "@/components/layouts/PublicLayout"
import { useState } from "react"

const contacts = [
  { icon: "mail",       title: "Email général",    value: "hello@rodaina.fr",      link: "mailto:hello@rodaina.fr" },
  { icon: "support_agent",title:"Support technique",value: "support@rodaina.fr",  link: "mailto:support@rodaina.fr" },
  { icon: "work",       title: "Partenariats",      value: "partners@rodaina.fr",  link: "mailto:partners@rodaina.fr" },
  { icon: "location_on",title: "Siège social",      value: "12 Rue Didouche Mourad, 16000 Alger", link: "#" },
]

export default function Contact() {
  const [sent, setSent] = useState(false)
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-white dark:bg-slate-900 py-16 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Contactez-nous</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">Une question, un projet, un partenariat ? On vous répond sous 24h.</p>
        </div>
      </section>

      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 mb-4">
                  <span className="material-symbols-outlined text-[40px]">check_circle</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Message envoyé !</h3>
                <p className="text-slate-500 dark:text-slate-400">Nous vous répondrons sous 24h ouvrées.</p>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Envoyez-nous un message</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[{ label: "Prénom", ph: "Jean" }, { label: "Nom", ph: "Dupont" }].map(f => (
                    <div key={f.label} className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
                      <input className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder={f.ph} required />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input type="email" className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="jean@exemple.fr" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sujet</label>
                  <select className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                    <option>Question commerciale</option>
                    <option>Support technique</option>
                    <option>Partenariat</option>
                    <option>Presse</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                  <textarea rows={5} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" placeholder="Comment pouvons-nous vous aider ?" required />
                </div>
                <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[18px]">send</span>Envoyer le message
                </button>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Nos coordonnées</h2>
              <div className="space-y-4">
                {contacts.map(c => (
                  <a key={c.title} href={c.link} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-sm hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                    <div className="size-10 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{c.title}</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{c.value}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Support en ligne</p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Lun – Ven : 9h – 18h (CET (UTC+1))</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Temps de réponse moyen : <strong className="text-blue-600">2h</strong></p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
