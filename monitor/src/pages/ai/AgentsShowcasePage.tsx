import { useMemo } from "react"
import DashboardLayout, { type NavItem, type Role } from "@/components/layouts/DashboardLayout"

type AgentsShowcasePageProps = {
  role: Role
  navItems: NavItem[]
}

type ModelType = "local" | "paid"

type ModelRow = {
  id: string
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
  modelId: string
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

const MODELS: ModelRow[] = [
  {
    id: "openclaw-dev-2",
    name: "OpenClaw Dev-2",
    provider: "OpenClaw Cloud",
    type: "paid",
    contextWindow: 256_000,
    inputPer1M: 2.4,
    outputPer1M: 9.6,
    avgInputTokens: 185_000,
    avgOutputTokens: 62_000,
  },
  {
    id: "gpt-5.4",
    name: "GPT-5.4",
    provider: "OpenAI",
    type: "paid",
    contextWindow: 400_000,
    inputPer1M: 3.2,
    outputPer1M: 12.8,
    avgInputTokens: 128_000,
    avgOutputTokens: 54_000,
  },
  {
    id: "llama3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Ollama",
    type: "local",
    contextWindow: 128_000,
    inputPer1M: 0,
    outputPer1M: 0,
    avgInputTokens: 96_000,
    avgOutputTokens: 33_000,
  },
  {
    id: "qwen2.5-coder",
    name: "Qwen2.5 Coder 32B",
    provider: "Ollama",
    type: "local",
    contextWindow: 64_000,
    inputPer1M: 0,
    outputPer1M: 0,
    avgInputTokens: 74_000,
    avgOutputTokens: 28_000,
  },
]

const AGENTS: AgentRow[] = [
  {
    id: "ai-dev-assistant",
    name: "AI Developer Assistant",
    purpose: "Scans codebase, searches online for docs, and creates implementation PR-ready patches.",
    status: "active",
    canSearchOnline: true,
    canCreateCode: true,
    modelId: "openclaw-dev-2",
    requests24h: 148,
  },
  {
    id: "sre-runbook-agent",
    name: "SRE Runbook Agent",
    purpose: "Converts incidents into runbooks and proposes remediation scripts.",
    status: "active",
    canSearchOnline: true,
    canCreateCode: true,
    modelId: "gpt-5.4",
    requests24h: 63,
  },
  {
    id: "local-code-reviewer",
    name: "Local Code Reviewer",
    purpose: "On-prem static review and architecture checks with no external traffic.",
    status: "idle",
    canSearchOnline: false,
    canCreateCode: true,
    modelId: "qwen2.5-coder",
    requests24h: 31,
  },
  {
    id: "proposal-writer",
    name: "Proposal Writer Agent",
    purpose: "Drafts client proposals, sprint scopes, and delivery plans.",
    status: "draft",
    canSearchOnline: true,
    canCreateCode: false,
    modelId: "llama3.3-70b",
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
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
}

function agentStatusTone(status: AgentRow["status"]): string {
  if (status === "active") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
  if (status === "idle") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function AgentsShowcasePage({ role, navItems }: AgentsShowcasePageProps) {
  const modelsById = useMemo(() => new Map(MODELS.map((m) => [m.id, m])), [])

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

  return (
    <DashboardLayout role={role} navItems={navItems} pageTitle="AI Agents">
      <div className="p-6 space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Developer Agency AI Layer</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Showroom view with mock agents and synthetic telemetry for demos.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                OpenClaw Ready
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Ollama Ready
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500">Requests (24h)</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatK(metrics.totalRequests)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500">Input Tokens</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatK(metrics.totalInput)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500">Output Tokens</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatK(metrics.totalOutput)}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500">Estimated Cost (24h)</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">${metrics.totalCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">AI Local Station</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {LOCAL_STATION.node} · {LOCAL_STATION.provider}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Local Endpoint Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-slate-500">Endpoint</p>
              <p className="font-semibold text-slate-900 dark:text-white mt-1 break-all">{LOCAL_STATION.host}</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-slate-500">Local Requests (24h)</p>
              <p className="font-semibold text-slate-900 dark:text-white mt-1">{formatK(localMetrics.requests24h)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-slate-500">Local Input Tokens</p>
              <p className="font-semibold text-slate-900 dark:text-white mt-1">{formatK(localMetrics.input)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-slate-500">Local Output Tokens</p>
              <p className="font-semibold text-slate-900 dark:text-white mt-1">{formatK(localMetrics.output)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">{LOCAL_STATION.privacy}</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
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
                  <tr key={`${row.role}-${idx}`} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {row.role}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{row.useCase}</td>
                    <td className="py-2 pr-3 text-slate-500">{row.endpoint}</td>
                    <td className="py-2 pr-3 text-slate-900 dark:text-white font-medium">{row.requests24h}</td>
                    <td className="py-2 pr-3 text-slate-900 dark:text-white font-medium">{formatK(row.localInputTokens)}</td>
                    <td className="py-2 text-slate-900 dark:text-white font-medium">{formatK(row.localOutputTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Agents</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {AGENTS.map((agent) => {
                const model = modelsById.get(agent.modelId)
                return (
                  <div key={agent.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{agent.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${agentStatusTone(agent.status)}`}>
                        {agent.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{agent.purpose}</p>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Online Search: {agent.canSearchOnline ? "Yes" : "No"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Code Creation: {agent.canCreateCode ? "Yes" : "No"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
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

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">Model Inventory</h3>
              <p className="text-xs text-slate-500">
                Local: {metrics.localModelCount} · Paid: {metrics.paidModelCount}
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {MODELS.map((m) => (
                <div key={m.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {m.provider} · Context {formatK(m.contextWindow)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${modelTypeTone(m.type)}`}>
                      {m.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                      <p className="text-slate-500">Input / 1M</p>
                      <p className="font-semibold text-slate-900 dark:text-white">${m.inputPer1M.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                      <p className="text-slate-500">Output / 1M</p>
                      <p className="font-semibold text-slate-900 dark:text-white">${m.outputPer1M.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                      <p className="text-slate-500">Avg Tokens / Req</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
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
