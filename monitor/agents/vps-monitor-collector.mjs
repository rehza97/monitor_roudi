#!/usr/bin/env node
import os from "node:os"
import fs from "node:fs/promises"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const endpoint = process.env.ROUDI_INGEST_URL
const token = process.env.ROUDI_INGEST_TOKEN
const deploymentId = process.env.ROUDI_DEPLOYMENT_ID
const intervalSeconds = Number(process.env.ROUDI_AGENT_INTERVAL_SECONDS || "30")

if (!endpoint || !token || !deploymentId) {
  console.error("Missing required env: ROUDI_INGEST_URL, ROUDI_INGEST_TOKEN, ROUDI_DEPLOYMENT_ID")
  process.exit(1)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readCpuSnapshot() {
  const stat = await fs.readFile("/proc/stat", "utf8")
  const line = stat.split("\n").find((row) => row.startsWith("cpu "))
  if (!line) return null
  const values = line.trim().split(/\s+/).slice(1).map(Number)
  const idle = values[3] + (values[4] || 0)
  const total = values.reduce((sum, value) => sum + value, 0)
  return { idle, total }
}

async function getCpuPercent() {
  const first = await readCpuSnapshot()
  await sleep(750)
  const second = await readCpuSnapshot()
  if (!first || !second) return 0
  const idle = second.idle - first.idle
  const total = second.total - first.total
  if (total <= 0) return 0
  return Math.round((1 - idle / total) * 1000) / 10
}

async function getDiskPercent() {
  try {
    const { stdout } = await execFileAsync("df", ["-P", "/"])
    const row = stdout.trim().split("\n")[1]
    const used = row?.trim().split(/\s+/)[4]
    return Number(String(used || "0").replace("%", "")) || 0
  } catch {
    return 0
  }
}

async function listDockerProjects() {
  try {
    const { stdout } = await execFileAsync("docker", [
      "ps",
      "--format",
      "{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}",
    ])
    return stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, image, status, ports] = line.split("|")
        return { type: "docker", name, image, status, ports }
      })
  } catch {
    return []
  }
}

async function listPm2Projects() {
  try {
    const { stdout } = await execFileAsync("pm2", ["jlist"])
    const rows = JSON.parse(stdout)
    if (!Array.isArray(rows)) return []
    return rows.map((row) => ({
      type: "pm2",
      name: row.name,
      status: row.pm2_env?.status,
      restarts: row.pm2_env?.restart_time,
      cpu: row.monit?.cpu,
      memoryBytes: row.monit?.memory,
    }))
  } catch {
    return []
  }
}

async function collectPayload() {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const ram = totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10 : 0
  const [cpu, disk, dockerProjects, pm2Projects] = await Promise.all([
    getCpuPercent(),
    getDiskPercent(),
    listDockerProjects(),
    listPm2Projects(),
  ])

  return {
    deploymentId,
    host: os.hostname(),
    metrics: {
      cpu,
      ram,
      disk,
      uptimeSeconds: os.uptime(),
      loadAverage: os.loadavg(),
      requestsPerMinute: Number(process.env.ROUDI_REQUESTS_PER_MINUTE || "0"),
    },
    runningProjects: [...dockerProjects, ...pm2Projects],
  }
}

async function pushOnce() {
  const payload = await collectPayload()
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-roudi-agent-token": token,
    },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`ingest failed ${res.status}: ${text}`)
  }
  console.log(`[roudi-agent] pushed ${payload.deploymentId} cpu=${payload.metrics.cpu}% ram=${payload.metrics.ram}%`)
}

if (process.argv.includes("--once")) {
  await pushOnce()
} else {
  while (true) {
    try {
      await pushOnce()
    } catch (error) {
      console.error("[roudi-agent]", error instanceof Error ? error.message : String(error))
    }
    await sleep(Math.max(5, intervalSeconds) * 1000)
  }
}
