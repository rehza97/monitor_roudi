import { useEffect, useMemo, useState } from "react"
import DashboardLayout, { type NavItem, type Role } from "@/components/layouts/DashboardLayout"
import {
  runTogetherChat,
  TOGETHER_MODELS,
  type TogetherChatMessage,
  type TogetherModelId,
} from "@/lib/together-ai"
import {
  fetchVpsAgentSnapshot,
  loadOllamaModel,
  unloadOllamaModel,
  type OllamaModel,
  type VpsAgentSnapshot,
} from "@/lib/vps-agent-metrics"

type AgentsShowcasePageProps = {
  role: Role
  navItems: NavItem[]
}

type ModelType = "local" | "paid"

type ModelRow = {
  id: TogetherModelId
  name: string
  provider: string
  type: ModelType
  contextWindow: number
  inputPer1M: number
  outputPer1M: number
  avgInputTokens: number
  avgOutputTokens: number
}

type AgentRow = {
  id: string
  name: string
  purpose: string
  status: "active" | "idle" | "draft"
  canSearchOnline: boolean
  canCreateCode: boolean
  modelId: TogetherModelId
  requests24h: number
}

type LocalStationUsageRow = {
  role: "engineer" | "technician"
  useCase: string
  endpoint: string
  requests24h: number
  localInputTokens: number
  localOutputTokens: number
}

const MODELS: ModelRow[] = TOGETHER_MODELS

const AGENTS: AgentRow[] = [
  {
    id: "ai-dev-assistant",
    name: "AI Developer Assistant",
    purpose: "Scans codebase, searches online for docs, and creates implementation PR-ready patches.",
    status: "active",
    canSearchOnline: true,
    canCreateCode: true,
    modelId: "MiniMaxAI/MiniMax-M2.7",
    requests24h: 148,
  },
  {
    id: "sre-runbook-agent",
    name: "SRE Runbook Agent",
    purpose: "Converts incidents into runbooks and proposes remediation scripts.",
    status: "active",
    canSearchOnline: true,
    canCreateCode: true,
    modelId: "moonshotai/Kimi-K2.5",
    requests24h: 63,
  },
  {
    id: "local-code-reviewer",
    name: "Local Code Reviewer",
    purpose: "On-prem static review and architecture checks with no external traffic.",
    status: "idle",
    canSearchOnline: false,
    canCreateCode: true,
    modelId: "openai/gpt-oss-120b",
    requests24h: 31,
  },
  {
    id: "proposal-writer",
    name: "Proposal Writer Agent",
    purpose: "Drafts client proposals, sprint scopes, and delivery plans.",
    status: "draft",
    canSearchOnline: true,
    canCreateCode: false,
    modelId: "Qwen/Qwen3.5-397B-A17B",
    requests24h: 9,
  },
]

const LOCAL_STATION = {
  node: "ai-local-station-01",
  host: "http://127.0.0.1:11434/v1",
  provider: "Ollama + OpenClaw Edge Runtime",
  privacy: "On-prem processing, no external token billing",
}

const LOCAL_USAGE: LocalStationUsageRow[] = [
  {
    role: "engineer",
    useCase: "Code refactor suggestions and offline architecture checks",
    endpoint: "/chat/completions",
    requests24h: 84,
    localInputTokens: 2_460_000,
    localOutputTokens: 790_000,
  },
  {
    role: "engineer",
    useCase: "Log triage and incident summary generation",
    endpoint: "/responses",
    requests24h: 46,
    localInputTokens: 1_720_000,
    localOutputTokens: 510_000,
  },
  {
    role: "technician",
    useCase: "Field intervention assistant and troubleshooting steps",
    endpoint: "/chat/completions",
    requests24h: 59,
    localInputTokens: 1_180_000,
    localOutputTokens: 360_000,
  },
  {
    role: "technician",
    useCase: "Device diagnostics command generation",
    endpoint: "/responses",
    requests24h: 33,
    localInputTokens: 840_000,
    localOutputTokens: 240_000,
  },
]

function modelTypeTone(type: ModelType): string {
  return type === "local"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-blue-100 text-blue-700"
}

function agentStatusTone(status: AgentRow["status"]): string {
  if (status === "active") return "bg-emerald-100 text-emerald-700"
  if (status === "idle") return "bg-amber-100 text-amber-700"
  return "bg-slate-100 text-slate-700"
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatModelSize(bytes: number): string {
  if (!bytes) return "—"
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function AgentsShowcasePage({ role, navItems }: AgentsShowcasePageProps) {
  const modelsById = useMemo(() => new Map(MODELS.map((m) => [m.id, m])), [])
  const [selectedModel, setSelectedModel] = useState<TogetherModelId>("MiniMaxAI/MiniMax-M2.7")
  const [prompt, setPrompt] = useState("What are some fun things to do in New York?")
  const [chatRows, setChatRows] = useState<TogetherChatMessage[]>([
    {
      role: "assistant",
      content: "Choose a Together model, enter a prompt, and run a live chat completion.",
    },
  ])
  const [usage, setUsage] = useState<{ prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null>(null)
  const [running, setRunning] = useState(false)
  const [chatError, setChatError] = useState("")
  const [vpsSnapshot, setVpsSnapshot] = useState<VpsAgentSnapshot | null>(null)
  const [ollamaLoading, setOllamaLoading] = useState(true)
  const [ollamaError, setOllamaError] = useState("")
  const [modelAction, setModelAction] = useState<string | null>(null)

  async function refreshOllama() {
    setOllamaLoading(true)
    setOllamaError("")
    try {
      setVpsSnapshot(await fetchVpsAgentSnapshot())
    } catch (err) {
      setOllamaError(err instanceof Error ? err.message : "Impossible de charger Ollama.")
    } finally {
      setOllamaLoading(false)
    }
  }

  useEffect(() => {
    void refreshOllama()
  }, [])

  async function handleOllamaAction(model: OllamaModel, action: "load" | "unload") {
    setModelAction(model.model)
    setOllamaError("")
    try {
      if (action === "load") await loadOllamaModel(model.model, "30m")
      else await unloadOllamaModel(model.model)
      await refreshOllama()
    } catch (err) {
      setOllamaError(err instanceof Error ? err.message : `Impossible de ${action} ${model.model}.`)
    } finally {
      setModelAction(null)
    }
  }

  async function handleRunChat(e: React.FormEvent) {
    e.preventDefault()
    const text = prompt.trim()
    if (!text || running) return

    const nextRows: TogetherChatMessage[] = [
      ...chatRows,
      { role: "user", content: text },
    ]
    setChatRows(nextRows)
    setPrompt("")
    setChatError("")
    setRunning(true)
    setUsage(null)
    try {
      const result = await runTogetherChat(selectedModel, [
        {
          role: "system",
          content: "You are Rodaina AI Agent. Answer clearly and practically for a software agency dashboard.",
        },
        ...nextRows.filter((row) => row.role !== "system"),
      ])
      setChatRows((prev) => [...prev, { role: "assistant", content: result.content }])
      setUsage(result.usage ?? null)
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Together request failed.")
    } finally {
      setRunning(false)
    }
  }

  const metrics = useMemo(() => {
    let totalRequests = 0
    let totalInput = 0
    let totalOutput = 0
    let totalCost = 0
    let localModelCount = 0
    let paidModelCount = 0

    for (const agent of AGENTS) {
      const model = modelsById.get(agent.modelId)
      if (!model) continue

      const req = agent.requests24h
      totalRequests += req
      const inTok = model.avgInputTokens * req
      const outTok = model.avgOutputTokens * req
      totalInput += inTok
      totalOutput += outTok

      const inCost = (inTok / 1_000_000) * model.inputPer1M
      const outCost = (outTok / 1_000_000) * model.outputPer1M
      totalCost += inCost + outCost
    }

    for (const model of MODELS) {
      if (model.type === "local") localModelCount += 1
      else paidModelCount += 1
    }

    return {
      totalRequests,
      totalInput,
      totalOutput,
      totalCost,
      localModelCount,
      paidModelCount,
    }
  }, [modelsById])

  const localMetrics = useMemo(() => {
    let requests24h = 0
    let input = 0
    let output = 0
    for (const row of LOCAL_USAGE) {
      requests24h += row.requests24h
      input += row.localInputTokens
      output += row.localOutputTokens
    }
    return { requests24h, input, output }
  }, [])

  const ollamaModels = vpsSnapshot?.metrics.ollama.models ?? []
  const runningOllamaModels = vpsSnapshot?.metrics.ollama.running_models ?? []
  const ollamaSummary = vpsSnapshot?.metrics.ollama.model_summary ?? { installed: 0, running: 0 }

  return (
    <DashboardLayout role={role} navItems={navItems} pageTitle="AI Agents">
      <div className="p-6 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Developer Agency AI Layer</h2>
              <p className="text-sm text-slate-500 mt-1">
                Showroom view with mock agents and synthetic telemetry for demos.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                OpenClaw Ready
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Ollama Ready
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Requests (24h)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatK(metrics.totalRequests)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Input Tokens</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatK(metrics.totalInput)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Output Tokens</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatK(metrics.totalOutput)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Estimated Cost (24h)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${metrics.totalCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">AI Local Station</h3>
              <p className="text-xs text-slate-500 mt-1">
                {LOCAL_STATION.node} · {LOCAL_STATION.provider}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
              Local Endpoint Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-slate-500">Endpoint</p>
              <p className="font-semibold text-slate-900 mt-1 break-all">{LOCAL_STATION.host}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-slate-500">Local Requests (24h)</p>
              <p className="font-semibold text-slate-900 mt-1">{formatK(localMetrics.requests24h)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-slate-500">Local Input Tokens</p>
              <p className="font-semibold text-slate-900 mt-1">{formatK(localMetrics.input)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-slate-500">Local Output Tokens</p>
              <p className="font-semibold text-slate-900 mt-1">{formatK(localMetrics.output)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500">{LOCAL_STATION.privacy}</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Use Case</th>
                  <th className="py-2 pr-3">Endpoint</th>
                  <th className="py-2 pr-3">Req/24h</th>
                  <th className="py-2 pr-3">Input</th>
                  <th className="py-2">Output</th>
                </tr>
              </thead>
              <tbody>
                {LOCAL_USAGE.map((row, idx) => (
                  <tr key={`${row.role}-${idx}`} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {row.role}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-700">{row.useCase}</td>
                    <td className="py-2 pr-3 text-slate-500">{row.endpoint}</td>
                    <td className="py-2 pr-3 text-slate-900 font-medium">{row.requests24h}</td>
                    <td className="py-2 pr-3 text-slate-900 font-medium">{formatK(row.localInputTokens)}</td>
                    <td className="py-2 text-slate-900 font-medium">{formatK(row.localOutputTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h3 className="font-semibold text-slate-900">Local VPS Ollama Models</h3>
              <p className="mt-1 text-xs text-slate-500">
                Runs on the VPS through `194.146.13.22:18002/ollama`; separate from paid Together API models.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Installed {ollamaSummary.installed}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                Running {ollamaSummary.running}
              </span>
              <button
                type="button"
                onClick={() => void refreshOllama()}
                disabled={ollamaLoading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {ollamaLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {ollamaError ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {ollamaError}
            </div>
          ) : null}

          {runningOllamaModels.length > 0 ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">Currently loaded</p>
              <div className="flex flex-wrap gap-2">
                {runningOllamaModels.map((model) => (
                  <span key={model.model} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                    {model.model}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No local model is loaded right now. Load only what you need because the VPS has limited free disk/RAM.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Family</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Quant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ollamaLoading && ollamaModels.length === 0 ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  ollamaModels.map((model) => {
                    const isRunning = runningOllamaModels.some((row) => row.model === model.model) || model.loaded
                    const busy = modelAction === model.model
                    return (
                      <tr key={model.model} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{model.name}</p>
                          <p className="font-mono text-[11px] text-slate-400">{model.model}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {model.details?.family || "—"}
                          {model.details?.parameter_size ? (
                            <span className="ml-1 text-xs text-slate-400">· {model.details.parameter_size}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatModelSize(model.size)}</td>
                        <td className="px-4 py-3 text-slate-600">{model.details?.quantization_level || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isRunning ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {isRunning ? "Running" : "Installed"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void handleOllamaAction(model, isRunning ? "unload" : "load")}
                            disabled={busy}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 ${
                              isRunning ? "bg-slate-700 hover:bg-slate-800" : "bg-[#d23b4c] hover:bg-[#bd2f42]"
                            }`}
                          >
                            {busy ? "Working..." : isRunning ? "Unload" : "Load"}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h3 className="font-semibold text-slate-900">Together AI Playground</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Live completions through Together Chat Completions API.
                </p>
              </div>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                Hardcoded Together key
              </span>
            </div>

            <div className="mb-4 h-[360px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-3">
                {chatRows.map((row, index) => (
                  <div
                    key={`${row.role}-${index}`}
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      row.role === "user"
                        ? "ml-auto bg-[#d23b4c] text-white"
                        : "bg-white text-slate-700 border border-slate-200"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
                      {row.role === "user" ? "You" : "Agent"}
                    </p>
                    <p className="whitespace-pre-wrap">{row.content}</p>
                  </div>
                ))}
                {running ? (
                  <div className="w-fit rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                    Thinking...
                  </div>
                ) : null}
              </div>
            </div>

            {chatError ? (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {chatError}
              </div>
            ) : null}

            <form onSubmit={(e) => void handleRunChat(e)} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as TogetherModelId)}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#d23b4c]/30"
                >
                  {MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask the agent..."
                    className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#d23b4c]/30"
                  />
                  <button
                    type="submit"
                    disabled={running || !prompt.trim()}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#d23b4c] px-5 text-sm font-bold text-white hover:bg-[#bd2f42] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    Run
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Current Model</h3>
            {(() => {
              const model = modelsById.get(selectedModel)
              if (!model) return null
              return (
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Model ID</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-900">{model.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Provider</p>
                    <p className="mt-1 font-medium text-slate-900">{model.provider}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Context</p>
                    <p className="mt-1 font-medium text-slate-900">{formatK(model.contextWindow)} tokens</p>
                  </div>
                  {usage ? (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last Usage</p>
                      <p className="mt-1 text-slate-900">Input: {usage.prompt_tokens ?? "—"}</p>
                      <p className="text-slate-900">Output: {usage.completion_tokens ?? "—"}</p>
                      <p className="font-semibold text-slate-900">Total: {usage.total_tokens ?? "—"}</p>
                    </div>
                  ) : null}
                </div>
              )
            })()}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Agents</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {AGENTS.map((agent) => {
                const model = modelsById.get(agent.modelId)
                return (
                  <div key={agent.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${agentStatusTone(agent.status)}`}>
                        {agent.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{agent.purpose}</p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        Online Search: {agent.canSearchOnline ? "Yes" : "No"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        Code Creation: {agent.canCreateCode ? "Yes" : "No"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        Requests: {agent.requests24h}
                      </span>
                      {model ? (
                        <span className={`px-2 py-0.5 rounded-full ${modelTypeTone(model.type)}`}>
                          {model.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Model Inventory</h3>
              <p className="text-xs text-slate-500">
                Local: {metrics.localModelCount} · Paid: {metrics.paidModelCount}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {MODELS.map((m) => (
                <div key={m.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {m.provider} · Context {formatK(m.contextWindow)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${modelTypeTone(m.type)}`}>
                      {m.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Input / 1M</p>
                      <p className="font-semibold text-slate-900">${m.inputPer1M.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Output / 1M</p>
                      <p className="font-semibold text-slate-900">${m.outputPer1M.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-slate-500">Avg Tokens / Req</p>
                      <p className="font-semibold text-slate-900">
                        {formatK(m.avgInputTokens + m.avgOutputTokens)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
