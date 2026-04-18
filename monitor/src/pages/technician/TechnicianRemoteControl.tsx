import { useEffect, useRef, useState } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { technicianNav } from "@/lib/nav"
import { db } from "@/config/firebase"
import { COLLECTIONS } from "@/data/schema"
import { collection, onSnapshot } from "@/lib/firebase-firestore"

type Device = { id: string; label: string; ip: string; type: string }
type ActionState = "idle" | "loading" | "done" | "error"
const SIMULATION_MODE = true

function mapDeploymentToDevice(id: string, data: Record<string, unknown>): Device {
  const label =
    (typeof data.name === "string" && data.name) ||
    (typeof data.clientListName === "string" && data.clientListName) ||
    (typeof data.productSlug === "string" && data.productSlug) ||
    `Déploiement ${id.slice(0, 6)}`

  const ip =
    (typeof data.ip === "string" && data.ip) ||
    (typeof data.host === "string" && data.host) ||
    (typeof data.address === "string" && data.address) ||
    "N/A"

  const env = typeof data.environment === "string" ? data.environment : "Production"
  return { id, label, ip, type: env }
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-colors">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TechnicianRemoteControl() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [deviceIdx, setDeviceIdx] = useState(0)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({})
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [log, setLog] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    const unsub = onSnapshot(collection(db, COLLECTIONS.deployments), (snap) => {
      const rows = snap.docs
        .map((d) => mapDeploymentToDevice(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.label.localeCompare(b.label, "fr"))
      setDevices(rows)
      setLoading(false)
      setDeviceIdx((prev) => (rows.length === 0 ? 0 : Math.min(prev, rows.length - 1)))
    })
    return unsub
  }, [])

  const device = devices[deviceIdx]

  function addLog(msg: string) {
    setLog((prev) => [...prev.slice(-19), `[${new Date().toLocaleTimeString("fr-DZ")}] ${msg}`])
  }

  function handleConnect() {
    if (!device) return
    if (connected) {
      setConnected(false)
      addLog(`Déconnecté de ${device.label}`)
      return
    }
    setConnecting(true)
    addLog(`Connexion à ${device.ip}…`)
    setTimeout(() => {
      setConnecting(false)
      setConnected(true)
      addLog(`Connecté — ${device.label} (${device.type})`)
    }, 900)
  }

  function runAction(key: string, label: string, delay = 700) {
    setActionStates((s) => ({ ...s, [key]: "loading" }))
    addLog(`${label}…`)
    setTimeout(() => {
      setActionStates((s) => ({ ...s, [key]: "done" }))
      addLog(`${label} — OK`)
      setTimeout(() => setActionStates((s) => ({ ...s, [key]: "idle" })), 1500)
    }, delay)
  }

  function handleAction(key: string, label: string, needsConfirm = false) {
    if (!connected || !device) return
    if (needsConfirm) {
      setConfirm({
        title: label,
        message: `Confirmer l'action "${label}" sur ${device.label} ?`,
        onConfirm: () => {
          setConfirm(null)
          runAction(key, label)
        },
      })
      return
    }
    runAction(key, label)
  }

  function handleFileUpload() {
    if (!connected) return
    fileRef.current?.click()
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    addLog(`Envoi fichier : ${file.name} (${(file.size / 1024).toFixed(1)} Ko)…`)
    setActionStates((s) => ({ ...s, upload: "loading" }))
    setTimeout(() => {
      setActionStates((s) => ({ ...s, upload: "done" }))
      addLog(`Fichier ${file.name} envoyé avec succès`)
      setTimeout(() => setActionStates((s) => ({ ...s, upload: "idle" })), 1500)
    }, 1000)
    e.target.value = ""
  }

  const quickActions = [
    { key: "restart", icon: "restart_alt", label: "Redémarrer", needsConfirm: true },
    { key: "shutdown", icon: "power_settings_new", label: "Éteindre", needsConfirm: true },
    { key: "screenshot", icon: "screenshot", label: "Capture", needsConfirm: false },
    { key: "upload", icon: "file_upload", label: "Envoyer fichier", needsConfirm: false },
  ]

  if (loading) {
    return (
      <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Contrôle à Distance">
        <div className="p-6 text-slate-500 dark:text-slate-400 text-sm">Chargement des équipements…</div>
      </DashboardLayout>
    )
  }

  if (devices.length === 0) {
    return (
      <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Contrôle à Distance">
        <div className="p-6 text-slate-500 dark:text-slate-400 text-sm">Aucun équipement disponible. Ajoutez des déploiements dans Firestore (`deployments`).</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="technician" navItems={technicianNav} pageTitle="Contrôle à Distance">
      <div className="p-6 w-full space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <span className="material-symbols-outlined text-amber-500 text-[24px] shrink-0">devices</span>
          <select
            value={deviceIdx}
            onChange={(e) => {
              setDeviceIdx(Number(e.target.value))
              setConnected(false)
              setLog([])
            }}
            className="flex-1 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {devices.map((d, i) => (
              <option key={d.id} value={i}>{d.label}</option>
            ))}
          </select>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors shrink-0 ${
              connected ? "bg-rose-500 hover:bg-rose-600" : "bg-amber-500 hover:bg-amber-600 disabled:opacity-60"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {connecting ? "hourglass_empty" : connected ? "link_off" : "settings_remote"}
            </span>
            {connecting ? "Connexion…" : connected ? "Déconnecter" : "Connecter"}
          </button>
        </div>

        {SIMULATION_MODE && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
            Mode simulation: les actions de contrôle à distance sont démonstratives (pas d’exécution réseau réelle).
          </div>
        )}

        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-rose-500" />
              <div className="size-3 rounded-full bg-amber-500" />
              <div className="size-3 rounded-full bg-emerald-500" />
            </div>
            <span className="text-slate-400 text-xs font-mono">RDP — {device.label} — {device.ip}</span>
            <span className={`text-xs flex items-center gap-1.5 ${connected ? "text-emerald-400" : "text-slate-500"}`}>
              <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              {connected ? "Connecté" : "Déconnecté"}
            </span>
          </div>
          <div className="h-64 flex items-center justify-center">
            {connected ? (
              <div className="text-center">
                <span className="material-symbols-outlined text-slate-400 text-[48px] block mb-2">desktop_windows</span>
                <p className="text-slate-400 text-sm">Session bureau à distance active</p>
                <p className="text-slate-600 text-xs mt-1">{device.type} · {device.ip}</p>
              </div>
            ) : (
              <div className="text-center">
                <span className="material-symbols-outlined text-slate-700 text-[48px] block mb-2">power_off</span>
                <p className="text-slate-600 text-sm">Aucune session active</p>
                <p className="text-slate-700 text-xs mt-1">Sélectionnez un appareil et cliquez sur Connecter</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => {
            const state = actionStates[a.key] ?? "idle"
            return (
              <button
                key={a.key}
                onClick={() => (a.key === "upload" ? handleFileUpload() : handleAction(a.key, a.label, a.needsConfirm))}
                disabled={!connected || state === "loading"}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  state === "done"
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className={`material-symbols-outlined text-[24px] ${state === "done" ? "text-emerald-500" : "text-amber-500"}`}>
                  {state === "loading" ? "hourglass_empty" : state === "done" ? "check_circle" : a.icon}
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
              </button>
            )
          })}
        </div>

        {log.length > 0 && (
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Journal d'activité</p>
              <button onClick={() => setLog([])} className="text-xs text-slate-500 hover:text-slate-300">Effacer</button>
            </div>
            <div className="space-y-1 font-mono text-xs max-h-40 overflow-y-auto">
              {log.map((l, i) => (
                <p key={i} className="text-emerald-400">{l}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" className="hidden" onChange={onFileSelected} />
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </DashboardLayout>
  )
}
