import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import { COLLECTIONS, type FirestoreSupportTicket } from "@/data/schema"
import { doc, getDoc, serverTimestamp, updateDoc } from "@/lib/firebase-firestore"
import { canTechnicianAccessTicket } from "@/lib/access-control"
import { formatFirestoreDateTime, firestoreToMillis } from "@/lib/utils"
import { notifyClientOfTicketStatusChanged } from "@/lib/notifications"

type ChecklistItem = { label: string; done: boolean }

type TicketDoc = FirestoreSupportTicket & {
  id: string
  checklist?: ChecklistItem[]
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: "Vérifier l'alimentation du switch", done: false },
  { label: "Tester la connectivité réseau", done: false },
  { label: "Remplacer le matériel défaillant", done: false },
  { label: "Mettre à jour la configuration", done: false },
  { label: "Valider avec le client", done: false },
]

function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return DEFAULT_CHECKLIST
  const rows = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const obj = item as Record<string, unknown>
      if (typeof obj.label !== "string" || !obj.label.trim()) return null
      return { label: obj.label.trim(), done: !!obj.done }
    })
    .filter((v): v is ChecklistItem => v !== null)
  return rows.length > 0 ? rows : DEFAULT_CHECKLIST
}

function toLocalInputValue(value: unknown): string {
  const ms = firestoreToMillis(value)
  if (!ms) return ""
  const date = new Date(ms)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function readBrowserLocation(): Promise<{ latitude: number; longitude: number; accuracy?: number | null } | null> {
  if (!navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  })
}

export default function TechnicianTicketDetail() {
  const { user } = useAuth()
  const { id } = useParams()
  const [ticket, setTicket] = useState<TicketDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [siteAddress, setSiteAddress] = useState("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [visitWindow, setVisitWindow] = useState("")
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      if (!db || !id) {
        setLoading(false)
        return
      }
      const snap = await getDoc(doc(db, COLLECTIONS.supportTickets, id))
      if (!snap.exists()) {
        setLoading(false)
        return
      }
      const data = snap.data() as FirestoreSupportTicket & { checklist?: unknown }
      if (!canTechnicianAccessTicket(data, user?.id)) {
        setTicket(null)
      } else {
        setTicket({ id: snap.id, ...data, checklist: parseChecklist(data.checklist) })
        setReport(typeof data.report === "string" ? data.report : "")
        setScheduledAt(toLocalInputValue(data.scheduledAt))
        setSiteAddress(typeof data.siteAddress === "string" ? data.siteAddress : "")
        setEstimatedDuration(typeof data.estimatedDuration === "string" ? data.estimatedDuration : "")
        setVisitWindow(typeof data.visitWindow === "string" ? data.visitWindow : "")
        setChecklist(parseChecklist(data.checklist))
      }
      setLoading(false)
    }
    void load()
  }, [id, user?.id])

  const done = useMemo(() => checklist.filter((i) => i.done).length, [checklist])

  async function persist(patch: Record<string, unknown>) {
    if (!db || !id) return
    await updateDoc(doc(db, COLLECTIONS.supportTickets, id), { ...patch, updatedAt: serverTimestamp() })
  }

  async function toggleChecklistItem(index: number) {
    const next = checklist.map((x, idx) => (idx === index ? { ...x, done: !x.done } : x))
    setChecklist(next)
    try {
      await persist({ checklist: next })
    } catch {
      setError("Impossible de sauvegarder la checklist.")
    }
  }

  async function handleSaveReport() {
    if (!report.trim()) return
    setSaveState("saving")
    setError("")
    try {
      await persist({ report: report.trim() })
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1800)
    } catch {
      setSaveState("idle")
      setError("Impossible de sauvegarder le rapport.")
    }
  }

  async function handleSaveSchedule() {
    if (!db || !id) return
    setSaveState("saving")
    setError("")
    try {
      await persist({
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        siteAddress: siteAddress.trim(),
        estimatedDuration: estimatedDuration.trim(),
        visitWindow: visitWindow.trim(),
      })
      setTicket((prev) => prev ? { ...prev, scheduledAt: scheduledAt ? new Date(scheduledAt) : null, siteAddress: siteAddress.trim(), estimatedDuration: estimatedDuration.trim(), visitWindow: visitWindow.trim() } : prev)
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1800)
    } catch {
      setSaveState("idle")
      setError("Impossible de sauvegarder la planification.")
    }
  }

  async function handlePresence(kind: "checkIn" | "checkOut") {
    if (!db || !id) return
    setError("")
    const location = await readBrowserLocation()
    const patch = kind === "checkIn" ? { checkInAt: serverTimestamp(), checkInLocation: location } : { checkOutAt: serverTimestamp(), checkOutLocation: location }
    try {
      await persist(patch)
      const snap = await getDoc(doc(db, COLLECTIONS.supportTickets, id))
      if (snap.exists()) setTicket({ id: snap.id, ...(snap.data() as FirestoreSupportTicket), checklist })
    } catch {
      setError("Impossible d'enregistrer la présence.")
    }
  }

  async function handleDispatch(action: "accept" | "reject") {
    if (!db || !id || !user?.id || !ticket) return
    const patch: Partial<FirestoreSupportTicket> = action === "accept" ? { assignedToId: user.id, status: "En cours" } : { assignedToId: null, status: "Ouvert", technicianRejectedBy: user.id }
    try {
      await persist(patch)
      if (patch.status) await notifyClientOfTicketStatusChanged(id, ticket, patch.status)
      setTicket((prev) => prev ? { ...prev, ...patch } : prev)
    } catch {
      setError("Impossible de mettre à jour l'assignation.")
    }
  }

  if (loading) return <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Détails du ticket"><div className="p-6 text-sm text-slate-500">Chargement du ticket…</div></DashboardLayout>
  if (!ticket) return <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Détails du ticket"><div className="p-6 text-sm text-slate-500">Ticket introuvable.</div></DashboardLayout>

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Détails du ticket">
      <div className="w-full bg-[#f8f8f5] p-4 text-slate-900 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 flex items-center gap-2 text-sm">
            <Link to="/technician/dashboard" className="text-slate-500 hover:text-amber-600">Tableau de bord</Link>
            <span className="material-symbols-outlined text-base text-slate-400">chevron_right</span>
            <Link to="/technician/tickets" className="text-slate-500 hover:text-amber-600">Tickets</Link>
            <span className="material-symbols-outlined text-base text-slate-400">chevron_right</span>
            <span className="font-medium">Détails</span>
          </div>

          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-bold uppercase tracking-wide text-red-500">Urgent</span>
                <span className="font-mono text-sm text-slate-500">#{ticket.id.slice(0, 12).toUpperCase()}</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">{ticket.subject}</h1>
              <p className="mt-1 text-slate-500">Maintenance corrective • Signalé {formatFirestoreDateTime(ticket.createdAt)}</p>
            </div>
            <div className="flex w-full items-center gap-3 md:w-auto">
              <button onClick={() => void handleDispatch("reject")} className="h-11 flex-1 rounded-lg border border-slate-300 px-6 text-sm font-bold text-slate-700 hover:bg-slate-100 md:flex-none">Refuser</button>
              <button onClick={() => void handleDispatch("accept")} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#f2b90d] px-6 text-sm font-bold text-[#221e10] shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 md:flex-none"><span className="material-symbols-outlined text-lg">check_circle</span>Accepter l'intervention</button>
            </div>
          </div>

          {error ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center gap-3"><span className="material-symbols-outlined text-[#f2b90d]">description</span><h3 className="text-lg font-bold">Description du problème</h3></div>
                <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{ticket.description || "Aucune description."}</p>
                <div className="mt-4 flex flex-wrap gap-2">{["Climatisation", "Électrique", "Aile Nord"].map((t) => <span key={t} className="inline-flex rounded bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{t}</span>)}</div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="p-5"><p className="mb-1 text-sm text-slate-500">Client</p><p className="font-semibold">{ticket.organizationId || "—"}</p></div>
                  <div className="p-5"><p className="mb-1 text-sm text-slate-500">Contact sur place</p><p className="font-semibold">{ticket.assignedToId || "Client"}</p></div>
                </div>
                <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
                  <div className="p-4"><p className="mb-1 text-sm text-slate-500">Priorité</p><p className="font-bold text-red-500">{ticket.priority}</p></div>
                  <div className="p-4"><p className="mb-1 text-sm text-slate-500">Échéance</p><p className="font-medium">{formatFirestoreDateTime(ticket.scheduledAt) || "Aujourd'hui"}</p></div>
                  <div className="p-4"><p className="mb-1 text-sm text-slate-500">Statut</p><p className="font-medium text-amber-600">{ticket.status}</p></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-bold"><span className="material-symbols-outlined text-[#f2b90d]">folder_open</span>Pièces jointes & Documents</h3></div>
                <div className="space-y-3">
                  <div className="group flex cursor-pointer items-center justify-between rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded bg-red-100 text-red-600"><span className="material-symbols-outlined">picture_as_pdf</span></div><div><p className="text-sm font-medium transition-colors group-hover:text-amber-600">Manuel_Unite_HVAC_2022.pdf</p><p className="text-xs text-slate-500">2.4 MB • Ajouté par Admin</p></div></div><span className="material-symbols-outlined text-slate-400">download</span></div>
                  <div className="group flex cursor-pointer items-center justify-between rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded bg-blue-100 text-blue-600"><span className="material-symbols-outlined">image</span></div><div><p className="text-sm font-medium transition-colors group-hover:text-amber-600">Photo_Compresseur_Erreur.jpg</p><p className="text-xs text-slate-500">1.8 MB • Ajouté par Client</p></div></div><span className="material-symbols-outlined text-slate-400">download</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <h3 className="font-semibold">Planification terrain</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
                  <input value={visitWindow} onChange={(e) => setVisitWindow(e.target.value)} placeholder="Fenêtre: 09:00-11:00" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
                  <input value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} placeholder="Durée estimée: 2h" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
                  <input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="Adresse du site" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
                </div>
                <div className="flex flex-wrap gap-2"><button onClick={() => void handleSaveSchedule()} className="rounded-lg bg-[#f2b90d] px-4 py-2 text-sm font-bold text-[#221e10]">Sauvegarder la planification</button><button onClick={() => void handlePresence("checkIn")} className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700">Check-in</button><button onClick={() => void handlePresence("checkOut")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Check-out</button></div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <h3 className="font-semibold">Rapport d'intervention</h3>
                <textarea rows={4} value={report} onChange={(e) => setReport(e.target.value)} className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Décrivez les actions réalisées…" />
                <div className="flex gap-3"><button onClick={() => void handleSaveReport()} className="rounded-lg bg-[#f2b90d] px-4 py-2.5 text-sm font-bold text-[#221e10]">{saveState === "saving" ? "Sauvegarde…" : "Sauvegarder"}</button><Link to={`/technician/tickets/${id}/validate`} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Valider l'intervention</Link></div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
                <div className="flex items-center justify-between"><h3 className="font-semibold">Checklist</h3><span className="text-xs font-bold text-amber-600">{done}/{checklist.length}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#f2b90d]" style={{ width: `${(done / Math.max(1, checklist.length)) * 100}%` }} /></div>
                <div className="space-y-2 pt-1">{checklist.map((item, i) => <label key={item.label + i} className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={item.done} onChange={() => void toggleChecklistItem(i)} className="size-4 rounded accent-yellow-500" /><span className={`text-sm ${item.done ? "line-through text-slate-400" : "text-slate-700"}`}>{item.label}</span></label>)}</div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-black/5">
                <div className="border-b border-slate-200 p-5"><h3 className="flex items-center gap-2 text-lg font-bold"><span className="material-symbols-outlined text-[#f2b90d]">location_on</span>Lieu d'intervention</h3></div>
                <div className="relative h-48 w-full bg-slate-200"><div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1400&q=80)" }} /><div className="absolute inset-0 flex items-center justify-center"><div className="flex h-12 w-12 animate-bounce items-center justify-center rounded-full border-4 border-white bg-[#f2b90d] text-[#221e10] shadow-xl"><span className="material-symbols-outlined text-2xl">location_on</span></div></div></div>
                <div className="p-5">
                  <div className="flex flex-col gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Adresse</p><p className="font-medium leading-snug">{siteAddress || "128 Rue de la République"}<br />3ème, Aile Nord</p></div><div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Code d'accès</p><p className="inline-block rounded bg-slate-100 px-2 py-1 font-mono">7492A</p></div><div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Étage</p><p>3ème, Aile Nord</p></div></div><button className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#f2b90d] text-sm font-bold text-[#b8860b] hover:bg-[#f2b90d] hover:text-[#221e10]"><span className="material-symbols-outlined text-[18px]">directions</span>Itinéraire</button></div>
                </div>
              </div>

              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#b8860b]"><span className="material-symbols-outlined text-[18px]">history</span>Historique Récent</h4>
                <ul className="relative space-y-3 before:absolute before:left-[5px] before:top-2 before:h-full before:w-[2px] before:bg-slate-200">
                  <li className="relative pl-5 text-sm"><div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#f2b90d] bg-white" /><p className="font-medium text-slate-800">Maintenance préventive</p><p className="text-xs text-slate-500">12 Sep 2023 • Terminé</p></li>
                  <li className="relative pl-5 text-sm"><div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-300 bg-white" /><p className="font-medium text-slate-800">Remplacement filtre</p><p className="text-xs text-slate-500">03 Juin 2023 • Terminé</p></li>
                </ul>
                <span className="mt-4 block text-center text-xs font-bold text-slate-500">Voir tout l'historique</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Statut</span><span className="font-medium">{ticket.status}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Priorité</span><span className="font-medium">{ticket.priority}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Créé le</span><span className="font-medium">{formatFirestoreDateTime(ticket.createdAt)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
