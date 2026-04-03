import { useState, useRef } from "react"
import DashboardLayout from "@/components/layouts/DashboardLayout"
import { engineerNav } from "@/lib/nav"

/* MOCK servers — disabled */
const servers: { label: string; host: string; ip: string }[] = []

/* MOCK terminal boot output — disabled (used when servers non-empty)
const BOOT_LINES: Record<string, string[]> = {
  "prod-server-01": [
    "Last login: Sun Mar 22 08:14:02 2026 from 192.168.1.5",
    "alice@prod-server-01:~$ docker ps",
    "CONTAINER ID   IMAGE              STATUS         PORTS",
    "a3f2d1e4b5c6   ecotrack:v2.0      Up 14 days     0.0.0.0:80->8080/tcp",
    "9b8c7d6e5f4a   nginx:alpine       Up 14 days     0.0.0.0:443->443/tcp",
  ],
  "prod-server-02": [
    "Last login: Sat Mar 21 22:01:11 2026 from 192.168.1.5",
    "alice@prod-server-02:~$ uptime",
    " 08:12:01 up 8 days, 14:22,  1 user,  load average: 0.41, 0.38, 0.35",
  ],
  "staging-01": [
    "Last login: Fri Mar 20 16:45:30 2026 from 192.168.1.5",
    "alice@staging-01:~$ systemctl status nginx",
    "● nginx.service - A high performance web server",
    "   Loaded: loaded (/lib/systemd/system/nginx.service)",
    "   Active: active (running) since Fri 2026-03-20 14:00:00 CET",
  ],
}

const CANNED_RESPONSES: Record<string, string[]> = {
  ls:      ["bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  srv  sys  tmp  usr  var"],
  pwd:     ["/home/alice"],
  whoami:  ["alice"],
  date:    ["Sun Mar 22 08:17:44 CET 2026"],
  uptime:  [" 08:17:44 up 14 days,  2:03,  1 user,  load average: 0.22, 0.28, 0.31"],
  df:      ["Filesystem      Size  Used Avail Use% Mounted on", "/dev/sda1        50G   18G   30G  38% /"],
  free:    ["               total       used       free", "Mem:          16384       4812      11572", "Swap:          2048        128       1920"],
  "docker ps": [
    "CONTAINER ID   IMAGE              STATUS         PORTS",
    "a3f2d1e4b5c6   ecotrack:v2.0      Up 14 days     0.0.0.0:80->8080/tcp",
    "9b8c7d6e5f4a   nginx:alpine       Up 14 days     0.0.0.0:443->443/tcp",
  ],
  clear:   ["__clear__"],
}
*/

const BOOT_LINES: Record<string, string[]> = {}
const CANNED_RESPONSES: Record<string, string[]> = {}

type TermLine = { text: string; cls: string }

export default function EngineerRemoteControl() {
  const [serverIdx, setServerIdx] = useState(0)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [lines, setLines] = useState<TermLine[]>([])
  const [cmd, setCmd] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const server = servers[serverIdx]

  function appendLines(newLines: TermLine[]) {
    setLines(prev => {
      const next = [...prev, ...newLines]
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
      return next
    })
  }

  function handleConnect() {
    if (connected) {
      setConnected(false)
      appendLines([{ text: `Connection to ${server.host} closed.`, cls: "text-slate-400" }])
      return
    }
    setConnecting(true)
    appendLines([{ text: `Connecting to ${server.ip}…`, cls: "text-slate-400" }])
    setTimeout(() => {
      setConnecting(false)
      setConnected(true)
      const boot = (BOOT_LINES[server.host] ?? []).map(t => ({ text: t, cls: "text-slate-300" }))
      appendLines(boot)
      setTimeout(() => {
        appendLines([{ text: `alice@${server.host}:~$ _`, cls: "text-emerald-400" }])
      }, 300)
    }, 1400)
  }

  function handleServerChange(idx: number) {
    setServerIdx(idx)
    setConnected(false)
    setConnecting(false)
    setLines([])
    setHistory([])
    setHistIdx(-1)
  }

  function runCmd(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    setHistory(h => [trimmed, ...h])
    setHistIdx(-1)

    // Remove trailing cursor line
    setLines(prev => prev.filter(l => !l.text.endsWith("$ _")))

    appendLines([{ text: `alice@${server.host}:~$ ${trimmed}`, cls: "text-emerald-400" }])

    const lower = trimmed.toLowerCase()
    const response = CANNED_RESPONSES[lower] ?? CANNED_RESPONSES[trimmed] ?? [`${trimmed}: command not found`]

    if (response[0] === "__clear__") {
      setTimeout(() => {
        setLines([])
        appendLines([{ text: `alice@${server.host}:~$ _`, cls: "text-emerald-400" }])
      }, 100)
      return
    }

    setTimeout(() => {
      appendLines(response.map(t => ({ text: t, cls: "text-slate-300" })))
      appendLines([{ text: `alice@${server.host}:~$ _`, cls: "text-emerald-400" }])
    }, 200)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      runCmd(cmd)
      setCmd("")
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setCmd(history[next] ?? "")
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setCmd(next === -1 ? "" : (history[next] ?? ""))
    }
  }

  const quickCmds = ["docker ps", "df", "free", "uptime", "ls", "clear"]

  if (servers.length === 0) {
    return (
      <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Contrôle à Distance">
        <div className="p-6 text-slate-500 dark:text-slate-400 text-sm">Aucun serveur mock — branchez une source de données réelle.</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="engineer" navItems={engineerNav} pageTitle="Contrôle à Distance">
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Server selector */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
          <span className="material-symbols-outlined text-blue-600 text-[24px] shrink-0">dns</span>
          <select
            value={serverIdx}
            onChange={e => handleServerChange(Number(e.target.value))}
            className="flex-1 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {servers.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
          </select>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors shrink-0 disabled:opacity-60 ${
              connected ? "bg-rose-500 hover:bg-rose-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {connecting ? "hourglass_empty" : connected ? "link_off" : "link"}
            </span>
            {connecting ? "Connexion…" : connected ? "Déconnecter" : "Connecter"}
          </button>
        </div>

        {/* Terminal */}
        <div
          className="bg-slate-900 dark:bg-black rounded-xl border border-slate-700 overflow-hidden"
          onClick={() => connected && inputRef.current?.focus()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-rose-500" />
              <div className="size-3 rounded-full bg-amber-500" />
              <div className="size-3 rounded-full bg-emerald-500" />
            </div>
            <span className="text-slate-400 text-xs font-mono">
              ssh alice@{server.host}
            </span>
            <span className={`text-xs flex items-center gap-1.5 ${connected ? "text-emerald-400" : "text-slate-500"}`}>
              <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              {connected ? "Connecté" : "Déconnecté"}
            </span>
          </div>

          <div className="p-5 min-h-[280px] font-mono text-sm space-y-0.5 max-h-80 overflow-y-auto">
            {lines.length === 0 && !connected && (
              <p className="text-slate-600 text-xs">Sélectionnez un serveur et cliquez sur Connecter.</p>
            )}
            {lines.map((l, i) => (
              <p key={i} className={l.cls}>{l.text}</p>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-700">
            <span className="text-emerald-400 font-mono text-sm shrink-0">$</span>
            <input
              ref={inputRef}
              value={cmd}
              onChange={e => setCmd(e.target.value)}
              onKeyDown={handleKey}
              disabled={!connected}
              className="flex-1 bg-transparent font-mono text-sm text-white focus:outline-none disabled:cursor-not-allowed placeholder:text-slate-600"
              placeholder={connected ? "Entrez une commande…" : "Non connecté"}
            />
            <button
              onClick={() => { if (connected) { runCmd(cmd); setCmd("") } }}
              disabled={!connected}
              className="size-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
            </button>
          </div>
        </div>

        {/* Quick commands */}
        {connected && (
          <div className="flex flex-wrap gap-2">
            {quickCmds.map(c => (
              <button
                key={c}
                onClick={() => { runCmd(c) }}
                className="px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
