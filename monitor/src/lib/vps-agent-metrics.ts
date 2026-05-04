import { IS_VITE_DEV } from "@/config/devMode"

export type VpsHealth = {
  ok: boolean
  uptime_seconds: number
}

export type VpsContainer = {
  id: string
  full_id: string
  name: string
  image: string
  status: string
  state?: {
    running?: boolean
    healthy?: string | null
    started_at?: string
    finished_at?: string
  }
  ports?: Record<string, unknown>
  cpu_percent: number
  memory?: {
    percent?: number
    usage_mb?: number
    limit_mb?: number
  }
  network?: {
    bytes_sent?: number
    bytes_recv?: number
  }
  block_io?: {
    read_mb?: number
    write_mb?: number
  }
  restart_count?: number
  created?: string
}

export type OllamaModel = {
  name: string
  model: string
  size: number
  loaded: boolean
  modified_at?: string
  details?: {
    family?: string
    parameter_size?: string
    quantization_level?: string
  }
}

export type VpsMetrics = {
  timestamp: number
  api_uptime_seconds: number
  host: {
    cpu: {
      percent: number
      cores_logical: number
      cores_physical: number
      load_1m: number
      load_5m: number
      load_15m: number
    }
    memory: {
      percent: number
      used_gb: number
      available_gb: number
      total_gb: number
    }
    swap?: {
      percent: number
      used_gb: number
      total_gb: number
    }
    disk: {
      path: string
      percent: number
      used_gb: number
      free_gb: number
      total_gb: number
    }
    network: {
      bytes_sent: number
      bytes_recv: number
      mb_sent: number
      mb_recv: number
    }
    uptime_seconds: number
  }
  containers: VpsContainer[]
  container_summary: {
    total: number
    running: number
    healthy: number
  }
  ollama: {
    models: OllamaModel[]
    running_models: OllamaModel[]
    model_summary: {
      installed: number
      running: number
    }
  }
}

export type VpsAgentSnapshot = {
  health: VpsHealth
  metrics: VpsMetrics
}

const VPS_AGENT_PROXY = "https://us-central1-roudi-monitor-app.cloudfunctions.net/vpsAgentProxy"
const VPS_AGENT_DIRECT = "http://194.146.13.22:18002"

function pageIsHttps(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:"
}

function getProdVpsAgentBases(): string[] {
  if (pageIsHttps()) return [VPS_AGENT_PROXY]
  return [VPS_AGENT_DIRECT, VPS_AGENT_PROXY]
}

/** Build absolute URL for fetch (handles same-origin `/path` bases). */
function joinAgentUrl(base: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  if (base.startsWith("/")) {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const b = base.endsWith("/") ? base.slice(0, -1) : base
    return `${origin}${b}${p}`
  }
  const b = base.endsWith("/") ? base.slice(0, -1) : base
  return `${b}${p}`
}

function vpsFetchHeaders(extra?: Record<string, string>): HeadersInit {
  return { accept: "application/json", ...extra }
}

let cachedProdVpsBase: string | null = null

function invalidateProdVpsBase() {
  cachedProdVpsBase = null
}

async function resolveProdVpsBase(): Promise<string> {
  if (cachedProdVpsBase) return cachedProdVpsBase
  const bases = getProdVpsAgentBases()
  for (const base of bases) {
    try {
      const res = await fetch(joinAgentUrl(base, "/health"), { headers: vpsFetchHeaders() })
      if (res.ok) {
        cachedProdVpsBase = base
        return base
      }
    } catch {
      /* try next */
    }
  }
  throw new Error("VPS agent unreachable. Check that the VPS is online and the Firebase proxy is deployed.")
}

async function getVpsAgentBase(): Promise<string> {
  if (IS_VITE_DEV) return "/__vps-agent"
  return resolveProdVpsBase()
}

function numberField(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function recordField(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function parseContainer(raw: unknown): VpsContainer {
  const data = recordField(raw)
  const memory = recordField(data.memory)
  const network = recordField(data.network)
  const blockIo = recordField(data.block_io)
  const state = recordField(data.state)
  return {
    id: String(data.id ?? ""),
    full_id: String(data.full_id ?? ""),
    name: String(data.name ?? "container"),
    image: String(data.image ?? "—"),
    status: String(data.status ?? "unknown"),
    state: {
      running: Boolean(state.running),
      healthy: typeof state.healthy === "string" ? state.healthy : null,
      started_at: typeof state.started_at === "string" ? state.started_at : undefined,
      finished_at: typeof state.finished_at === "string" ? state.finished_at : undefined,
    },
    ports: recordField(data.ports),
    cpu_percent: numberField(data.cpu_percent),
    memory: {
      percent: numberField(memory.percent),
      usage_mb: numberField(memory.usage_mb),
      limit_mb: numberField(memory.limit_mb),
    },
    network: {
      bytes_sent: numberField(network.bytes_sent),
      bytes_recv: numberField(network.bytes_recv),
    },
    block_io: {
      read_mb: numberField(blockIo.read_mb),
      write_mb: numberField(blockIo.write_mb),
    },
    restart_count: numberField(data.restart_count),
    created: typeof data.created === "string" ? data.created : undefined,
  }
}

function parseOllamaModel(raw: unknown): OllamaModel {
  const data = recordField(raw)
  const details = recordField(data.details)
  return {
    name: String(data.name ?? data.model ?? "model"),
    model: String(data.model ?? data.name ?? "model"),
    size: numberField(data.size),
    loaded: Boolean(data.loaded),
    modified_at: typeof data.modified_at === "string" ? data.modified_at : undefined,
    details: {
      family: typeof details.family === "string" ? details.family : undefined,
      parameter_size: typeof details.parameter_size === "string" ? details.parameter_size : undefined,
      quantization_level: typeof details.quantization_level === "string" ? details.quantization_level : undefined,
    },
  }
}

function parseMetrics(raw: unknown): VpsMetrics {
  const data = recordField(raw)
  const host = recordField(data.host)
  const cpu = recordField(host.cpu)
  const memory = recordField(host.memory)
  const swap = recordField(host.swap)
  const disk = recordField(host.disk)
  const network = recordField(host.network)
  const summary = recordField(data.container_summary)
  const ollama = recordField(data.ollama)
  const ollamaSummary = recordField(ollama.model_summary)
  const containers = Array.isArray(data.containers) ? data.containers.map(parseContainer) : []
  const ollamaModels = Array.isArray(ollama.models) ? ollama.models.map(parseOllamaModel) : []
  const runningModels = Array.isArray(ollama.running_models) ? ollama.running_models.map(parseOllamaModel) : []

  return {
    timestamp: numberField(data.timestamp),
    api_uptime_seconds: numberField(data.api_uptime_seconds),
    host: {
      cpu: {
        percent: numberField(cpu.percent),
        cores_logical: numberField(cpu.cores_logical),
        cores_physical: numberField(cpu.cores_physical),
        load_1m: numberField(cpu.load_1m),
        load_5m: numberField(cpu.load_5m),
        load_15m: numberField(cpu.load_15m),
      },
      memory: {
        percent: numberField(memory.percent),
        used_gb: numberField(memory.used_gb),
        available_gb: numberField(memory.available_gb),
        total_gb: numberField(memory.total_gb),
      },
      swap: {
        percent: numberField(swap.percent),
        used_gb: numberField(swap.used_gb),
        total_gb: numberField(swap.total_gb),
      },
      disk: {
        path: String(disk.path ?? "/"),
        percent: numberField(disk.percent),
        used_gb: numberField(disk.used_gb),
        free_gb: numberField(disk.free_gb),
        total_gb: numberField(disk.total_gb),
      },
      network: {
        bytes_sent: numberField(network.bytes_sent),
        bytes_recv: numberField(network.bytes_recv),
        mb_sent: numberField(network.mb_sent),
        mb_recv: numberField(network.mb_recv),
      },
      uptime_seconds: numberField(host.uptime_seconds),
    },
    containers,
    container_summary: {
      total: numberField(summary.total) || containers.length,
      running: numberField(summary.running) || containers.filter((c) => c.state?.running).length,
      healthy: numberField(summary.healthy) || containers.filter((c) => c.state?.healthy === "healthy").length,
    },
    ollama: {
      models: ollamaModels,
      running_models: runningModels,
      model_summary: {
        installed: numberField(ollamaSummary.installed) || ollamaModels.length,
        running: numberField(ollamaSummary.running) || runningModels.length,
      },
    },
  }
}

function parseHealth(raw: unknown): VpsHealth {
  const data = recordField(raw)
  return {
    ok: Boolean(data.ok),
    uptime_seconds: numberField(data.uptime_seconds),
  }
}

async function fetchJson(base: string, path: string): Promise<unknown> {
  const res = await fetch(joinAgentUrl(base, path), { headers: vpsFetchHeaders() })
  if (!res.ok) throw new Error(`VPS agent ${path} failed (${res.status})`)
  return res.json()
}

export async function fetchVpsAgentSnapshot(): Promise<VpsAgentSnapshot> {
  const run = async (): Promise<VpsAgentSnapshot> => {
    const base = await getVpsAgentBase()
    const [health, metrics] = await Promise.all([
      fetchJson(base, "/health").then(parseHealth),
      fetchJson(base, "/metrics").then(parseMetrics),
    ])
    return { health, metrics }
  }
  try {
    return await run()
  } catch (first) {
    if (IS_VITE_DEV) throw first
    invalidateProdVpsBase()
    return await run()
  }
}

export async function loadOllamaModel(model: string, keepAlive = "30m"): Promise<void> {
  const base = await getVpsAgentBase()
  const res = await fetch(joinAgentUrl(base, "/ollama/load"), {
    method: "POST",
    headers: vpsFetchHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ model, keep_alive: keepAlive }),
  })
  if (!res.ok) throw new Error(`Ollama load failed (${res.status})`)
}

export async function unloadOllamaModel(model: string): Promise<void> {
  const base = await getVpsAgentBase()
  const res = await fetch(joinAgentUrl(base, "/ollama/unload"), {
    method: "POST",
    headers: vpsFetchHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ model }),
  })
  if (!res.ok) throw new Error(`Ollama unload failed (${res.status})`)
}
