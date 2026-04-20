import { useEffect, useMemo, useState } from "react"
import DashboardLayout, { type NavItem, type Role } from "@/components/layouts/DashboardLayout"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/config/firebase"
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreMeeting, type UserRole } from "@/data/schema"
import { firestoreToMillis } from "@/lib/utils"

type MeetingsPlannerPageProps = {
  role: Role
  navItems: NavItem[]
  canManage: boolean
}

type TargetUser = {
  id: string
  name: string
  email: string
  role: UserRole
}

type MeetingRow = {
  id: string
  title: string
  description: string
  platform: FirestoreMeeting["platform"]
  status: FirestoreMeeting["status"]
  statusNote: string
  meetingLink: string
  meetingCode: string
  scheduledMs: number
  postponedFromMs: number | null
  targetUserIds: string[]
  targetUserNames: string[]
  createdByName: string
}

const PLATFORM_OPTIONS: Array<{ value: FirestoreMeeting["platform"]; label: string }> = [
  { value: "zoom", label: "Zoom" },
  { value: "google_meet", label: "Google Meet" },
  { value: "microsoft_teams", label: "Microsoft Teams" },
  { value: "other", label: "Autre" },
]

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function platformLabel(v: FirestoreMeeting["platform"]): string {
  return PLATFORM_OPTIONS.find((o) => o.value === v)?.label ?? "Autre"
}

function statusLabel(v: FirestoreMeeting["status"]): string {
  if (v === "cancelled") return "Annulee"
  if (v === "postponed") return "Reportee"
  return "Planifiee"
}

function statusTone(v: FirestoreMeeting["status"]): string {
  if (v === "cancelled") return "bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  if (v === "postponed") return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
  return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
}

function roleLabel(v: UserRole): string {
  switch (v) {
    case "admin":
      return "Admin"
    case "engineer":
      return "Ingenieur"
    case "client":
      return "Client"
    case "technician":
      return "Technicien"
    default:
      return v
  }
}

function eventTone(platform: FirestoreMeeting["platform"], status: FirestoreMeeting["status"]): string {
  if (status === "cancelled") return "bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
  if (platform === "zoom") return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
  if (platform === "google_meet") return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
  if (platform === "microsoft_teams") return "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800"
  return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
}

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function MeetingDetailsModal({
  meeting,
  canManage,
  mutating,
  onClose,
  onCancelMeeting,
  onPostponeMeeting,
}: {
  meeting: MeetingRow
  canManage: boolean
  mutating: boolean
  onClose: () => void
  onCancelMeeting: (meetingId: string, note: string) => Promise<void>
  onPostponeMeeting: (meetingId: string, nextDatetimeLocal: string, note: string, currentScheduledMs: number) => Promise<void>
}) {
  const [postponeDate, setPostponeDate] = useState(() => toDatetimeLocal(meeting.scheduledMs))
  const [statusNote, setStatusNote] = useState("")
  const [localError, setLocalError] = useState("")

  const date = new Date(meeting.scheduledMs)

  async function handleCancel() {
    setLocalError("")
    await onCancelMeeting(meeting.id, statusNote)
  }

  async function handlePostpone() {
    setLocalError("")
    const next = new Date(postponeDate)
    if (Number.isNaN(next.getTime())) {
      setLocalError("La nouvelle date est invalide.")
      return
    }
    await onPostponeMeeting(meeting.id, postponeDate, statusNote, meeting.scheduledMs)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45" />
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{meeting.title}</h3>
            <p className="text-xs text-slate-500">
              {date.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
            <span className={`inline-flex text-[11px] font-semibold px-2 py-1 rounded-full border ${statusTone(meeting.status)}`}>
              {statusLabel(meeting.status)}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-slate-700 dark:text-slate-300">
            <span className="font-semibold">Plateforme:</span> {platformLabel(meeting.platform)}
          </p>
          <p className="text-slate-700 dark:text-slate-300 break-all">
            <span className="font-semibold">Lien:</span>{" "}
            <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              {meeting.meetingLink}
            </a>
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <span className="font-semibold">Code:</span> {meeting.meetingCode || "—"}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <span className="font-semibold">Cree par:</span> {meeting.createdByName || "—"}
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            <span className="font-semibold">Utilisateurs cibles:</span> {meeting.targetUserNames.join(", ") || "—"}
          </p>
          {meeting.postponedFromMs ? (
            <p className="text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Ancienne date:</span>{" "}
              {new Date(meeting.postponedFromMs).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : null}
          {meeting.statusNote ? (
            <p className="text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Note statut:</span> {meeting.statusNote}
            </p>
          ) : null}
          {meeting.description ? (
            <p className="text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Description:</span> {meeting.description}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Actions de planification</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Nouvelle date (report)</label>
                <input
                  type="datetime-local"
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Note (optionnel)</label>
                <input
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  placeholder="Motif / commentaire"
                />
              </div>
            </div>

            {localError ? <p className="text-xs text-rose-600">{localError}</p> : null}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={mutating || meeting.status === "cancelled"}
                onClick={() => void handleCancel()}
                className="flex-1 py-2.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50"
              >
                Annuler la reunion
              </button>
              <button
                type="button"
                disabled={mutating || meeting.status === "cancelled"}
                onClick={() => void handlePostpone()}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Reporter (changer date)
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function MeetingsPlannerPage({ role, navItems, canManage }: MeetingsPlannerPageProps) {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<MeetingRow[]>([])
  const [targetUsers, setTargetUsers] = useState<TargetUser[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingRow | null>(null)
  const [mutating, setMutating] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dateTimeLocal, setDateTimeLocal] = useState("")
  const [platform, setPlatform] = useState<FirestoreMeeting["platform"]>("zoom")
  const [meetingLink, setMeetingLink] = useState("")
  const [meetingCode, setMeetingCode] = useState("")
  const [allUsers, setAllUsers] = useState(false)
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState("")

  useEffect(() => {
    if (!db || !user?.id) {
      setLoading(false)
      return
    }

    const meetingsRef = collection(db, COLLECTIONS.meetings)
    const q = canManage
      ? query(meetingsRef)
      : query(meetingsRef, where("targetUserIds", "array-contains", user.id))

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .map((d) => {
            const data = d.data() as Partial<FirestoreMeeting>
            const ms = firestoreToMillis(data.scheduledAt) ?? 0
            return {
              id: d.id,
              title: typeof data.title === "string" ? data.title : "Reunion",
              description: typeof data.description === "string" ? data.description : "",
              platform: (typeof data.platform === "string" ? data.platform : "other") as FirestoreMeeting["platform"],
              status: (typeof data.status === "string" ? data.status : "scheduled") as FirestoreMeeting["status"],
              statusNote: typeof data.statusNote === "string" ? data.statusNote : "",
              meetingLink: typeof data.meetingLink === "string" ? data.meetingLink : "",
              meetingCode: typeof data.meetingCode === "string" ? data.meetingCode : "",
              scheduledMs: ms,
              postponedFromMs: firestoreToMillis(data.postponedFromAt),
              targetUserIds: Array.isArray(data.targetUserIds)
                ? data.targetUserIds.filter((x): x is string => typeof x === "string")
                : [],
              targetUserNames: Array.isArray(data.targetUserNames)
                ? data.targetUserNames.filter((x): x is string => typeof x === "string")
                : [],
              createdByName: typeof data.createdByName === "string" ? data.createdByName : "",
            } satisfies MeetingRow
          })
          .sort((a, b) => a.scheduledMs - b.scheduledMs)
        setMeetings(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [canManage, user?.id])

  useEffect(() => {
    if (!canManage || !db) return
    const unsub = onSnapshot(collection(db, COLLECTIONS.users), (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>
          const roleValue = typeof data.role === "string" ? data.role : "client"
          if (!["client", "admin", "engineer", "technician"].includes(roleValue)) return null
          return {
            id: d.id,
            name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : d.id,
            email: typeof data.email === "string" ? data.email : "",
            role: roleValue as UserRole,
          } satisfies TargetUser
        })
        .filter((u): u is TargetUser => Boolean(u))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      setTargetUsers(rows)
    })
    return unsub
  }, [canManage])

  const today = new Date()
  const weekStart = useMemo(() => {
    const base = startOfWeek(today)
    base.setDate(base.getDate() + weekOffset * 7)
    return base
  }, [weekOffset, today])

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d
  }, [weekStart])

  const weekLabel = `Semaine du ${weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} au ${weekEnd.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`

  function meetingsForDay(dayIndex: number): MeetingRow[] {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + dayIndex)
    return meetings.filter((m) => {
      const md = new Date(m.scheduledMs)
      return (
        md.getFullYear() === d.getFullYear() &&
        md.getMonth() === d.getMonth() &&
        md.getDate() === d.getDate()
      )
    })
  }

  const upcoming = useMemo(() => {
    const now = Date.now()
    return meetings.filter((m) => m.scheduledMs >= now).slice(0, 10)
  }, [meetings])

  function toggleTarget(id: string) {
    setSelectedTargetIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ))
  }

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage || !db || !user?.id) return
    setCreateError("")

    const trimmedTitle = title.trim()
    const trimmedLink = meetingLink.trim()
    const when = dateTimeLocal ? new Date(dateTimeLocal) : null
    if (!trimmedTitle) return setCreateError("Le titre est requis.")
    if (!when || Number.isNaN(when.getTime())) return setCreateError("La date est invalide.")
    if (!trimmedLink) return setCreateError("Le lien de reunion est requis.")

    const targets = allUsers
      ? targetUsers
      : targetUsers.filter((u) => selectedTargetIds.includes(u.id))
    if (targets.length === 0) return setCreateError("Selectionnez au moins un utilisateur cible.")

    setSaving(true)
    try {
      await addDoc(collection(db, COLLECTIONS.meetings), {
        title: trimmedTitle,
        description: description.trim(),
        platform,
        status: "scheduled",
        statusNote: "",
        meetingLink: trimmedLink,
        meetingCode: meetingCode.trim(),
        scheduledAt: when,
        targetUserIds: targets.map((u) => u.id),
        targetUserNames: targets.map((u) => u.name),
        createdByUserId: user.id,
        createdByName: user.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } satisfies FirestoreMeeting)

      setCreateOpen(false)
      setTitle("")
      setDescription("")
      setDateTimeLocal("")
      setPlatform("zoom")
      setMeetingLink("")
      setMeetingCode("")
      setAllUsers(false)
      setSelectedTargetIds([])
      setCreateError("")
    } finally {
      setSaving(false)
    }
  }

  async function cancelMeeting(meetingId: string, note: string) {
    if (!canManage || !db) return
    setMutating(true)
    try {
      await updateDoc(doc(db, COLLECTIONS.meetings, meetingId), {
        status: "cancelled",
        statusNote: note.trim(),
        updatedAt: serverTimestamp(),
      })
      setSelectedMeeting(null)
    } finally {
      setMutating(false)
    }
  }

  async function postponeMeeting(meetingId: string, nextDatetimeLocal: string, note: string, currentScheduledMs: number) {
    if (!canManage || !db) return
    const next = new Date(nextDatetimeLocal)
    if (Number.isNaN(next.getTime())) return

    setMutating(true)
    try {
      await updateDoc(doc(db, COLLECTIONS.meetings, meetingId), {
        status: "postponed",
        postponedFromAt: new Date(currentScheduledMs),
        scheduledAt: next,
        statusNote: note.trim(),
        updatedAt: serverTimestamp(),
      })
      setSelectedMeeting(null)
    } finally {
      setMutating(false)
    }
  }

  return (
    <DashboardLayout role={role} navItems={navItems} pageTitle="Planification des reunions">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Calendrier des reunions</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                weekOffset === 0
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
            {canManage ? (
              <button
                onClick={() => setCreateOpen(true)}
                className="ml-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
              >
                Nouvelle reunion
              </button>
            ) : null}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
            {DAYS.map((d, i) => {
              const date = new Date(weekStart)
              date.setDate(date.getDate() + i)
              const isToday =
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate()
              return (
                <div key={d} className={`px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-0 ${isToday ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{d}</p>
                  <p className={`text-xl font-bold mt-1 ${isToday ? "text-blue-600" : "text-slate-900 dark:text-white"}`}>{date.getDate()}</p>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[360px]">
            {DAYS.map((_, i) => {
              const dayMeetings = meetingsForDay(i)
              return (
                <div key={i} className="border-r border-slate-200 dark:border-slate-800 last:border-0 p-2 space-y-1.5">
                  {dayMeetings.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMeeting(m)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs hover:opacity-80 transition-opacity ${eventTone(m.platform, m.status)}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold">{new Date(m.scheduledMs).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusTone(m.status)}`}>
                          {statusLabel(m.status)}
                        </span>
                      </div>
                      <p className={`font-medium leading-snug mt-0.5 ${m.status === "cancelled" ? "line-through" : ""}`}>{m.title}</p>
                      <p className="opacity-70 mt-0.5 truncate">{platformLabel(m.platform)}</p>
                    </button>
                  ))}
                  {!loading && dayMeetings.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-slate-300 dark:text-slate-700 text-xs">—</div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Prochaines reunions</h3>
          {loading ? (
            <p className="text-sm text-slate-400">Chargement…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune reunion planifiee.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMeeting(m)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className={`w-1.5 self-stretch rounded-full shrink-0 ${eventTone(m.platform, m.status).split(" ")[0]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold text-slate-900 dark:text-white ${m.status === "cancelled" ? "line-through" : ""}`}>{m.title}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusTone(m.status)}`}>
                        {statusLabel(m.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {platformLabel(m.platform)} · {new Date(m.scheduledMs).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })} · {new Date(m.scheduledMs).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">chevron_right</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedMeeting ? (
        <MeetingDetailsModal
          meeting={selectedMeeting}
          canManage={canManage}
          mutating={mutating}
          onClose={() => setSelectedMeeting(null)}
          onCancelMeeting={cancelMeeting}
          onPostponeMeeting={postponeMeeting}
        />
      ) : null}

      {createOpen && canManage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <div className="absolute inset-0 bg-black/45" />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 dark:text-white">Programmer une reunion</h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form className="space-y-4" onSubmit={(e) => void createMeeting(e)}>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Titre *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  placeholder="Ex: Revue technique sprint"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date et heure *</label>
                  <input
                    type="datetime-local"
                    value={dateTimeLocal}
                    onChange={(e) => setDateTimeLocal(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Plateforme *</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as FirestoreMeeting["platform"])}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  >
                    {PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Lien de reunion *</label>
                  <input
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    placeholder="https://..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Code de reunion</label>
                  <input
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    placeholder="Ex: 123-456-789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-20 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-y"
                  placeholder="Objectif de la reunion..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Utilisateurs cibles *</label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={allUsers}
                      onChange={(e) => setAllUsers(e.target.checked)}
                    />
                    Tous les utilisateurs
                  </label>
                </div>

                {allUsers ? (
                  <p className="text-xs text-slate-500">Cette reunion sera visible par tous les utilisateurs.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-2 space-y-1">
                    {targetUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedTargetIds.includes(u.id)}
                          onChange={() => toggleTarget(u.id)}
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{u.name}</span>
                        <span className="text-xs text-slate-500">{roleLabel(u.role)}</span>
                        <span className="text-xs text-slate-400 truncate">{u.email}</span>
                      </label>
                    ))}
                    {targetUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 px-2 py-2">Aucun utilisateur charge.</p>
                    ) : null}
                  </div>
                )}
              </div>

              {createError ? (
                <p className="text-sm text-rose-600">{createError}</p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-60"
                >
                  {saving ? "Creation..." : "Creer la reunion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  )
}
