import type { FirestoreOrder } from "@/data/schema"

export const STATUS_PROGRESS: Record<string, number> = {
  "En attente": 10,
  "Validée": 25,
  "En cours": 60,
  "Livré": 100,
}

export const MILESTONES = [
  { status: "En attente", label: "Demande reçue", icon: "inbox" },
  { status: "Validée", label: "Demande validée", icon: "task_alt" },
  { status: "En cours", label: "Développement actif", icon: "code" },
  { status: "Livré", label: "Livraison effectuée", icon: "rocket_launch" },
] as const

const ASSIGNED_STATUSES = new Set(["Validée", "En cours", "Livré"])

/** Progress band floor/ceiling per status when features drive incremental % */
const STATUS_BAND: Record<string, { floor: number; ceiling: number }> = {
  "En attente": { floor: 10, ceiling: 25 },
  Validée: { floor: 25, ceiling: 60 },
  "En cours": { floor: 60, ceiling: 100 },
}

export interface OrderProgress {
  percent: number
  stepIndex: number
  isRejected: boolean
}

export interface FeatureProgressItem {
  label: string
  done: boolean
}

export interface FeatureProgress {
  done: number
  total: number
  items: FeatureProgressItem[]
}

export function getCombinedProgress(
  status: string,
  features?: string[],
  completedFeatures?: string[],
): number {
  if (status === "Rejetée") return 0
  if (status === "Livré") return 100

  const featureProgress = getFeatureProgress(features, completedFeatures)
  if (featureProgress.total === 0) {
    return STATUS_PROGRESS[status] ?? 10
  }

  const band = STATUS_BAND[status]
  if (!band) {
    return STATUS_PROGRESS[status] ?? 10
  }

  const { floor, ceiling } = band
  const range = ceiling - floor
  return Math.round(floor + (featureProgress.done / featureProgress.total) * range)
}

export function getPerFeatureProgressIncrement(
  status: string,
  featureCount: number,
): number | null {
  if (featureCount <= 0 || status === "Livré" || status === "Rejetée") return null
  const band = STATUS_BAND[status]
  if (!band) return null
  return Math.round((band.ceiling - band.floor) / featureCount)
}

export function getOrderProgress(
  status: string,
  features?: string[],
  completedFeatures?: string[],
): OrderProgress {
  if (status === "Rejetée") {
    return { percent: 0, stepIndex: -1, isRejected: true }
  }
  const stepIndex = MILESTONES.findIndex((m) => m.status === status)
  const percent = getCombinedProgress(status, features, completedFeatures)
  return { percent, stepIndex, isRejected: false }
}

export function shouldShowAssignedEngineer(status: string): boolean {
  return ASSIGNED_STATUSES.has(status)
}

const PROJECT_STATUS_TO_ORDER: Record<string, string> = {
  pending: "Validée",
  active: "En cours",
  delivered: "Livré",
  cancelled: "Rejetée",
}

/** Resolves the French order-status string for a project, preferring the live joined order
 *  over the project's last-synced status, over a best-effort mapping of its own status. */
export function resolveOrderStatusForProject(
  project: { status: string; lastOrderStatus?: string },
  order?: Pick<FirestoreOrder, "status"> | null,
): string {
  if (order?.status) return order.status
  if (project.lastOrderStatus) return project.lastOrderStatus
  return PROJECT_STATUS_TO_ORDER[project.status] ?? "En attente"
}

export function getFeatureProgress(
  features: string[] | undefined,
  completedFeatures: string[] | undefined,
): FeatureProgress {
  const list = Array.isArray(features) ? features.filter(Boolean) : []
  const completed = new Set(Array.isArray(completedFeatures) ? completedFeatures : [])
  const items = list.map((label) => ({ label, done: completed.has(label) }))
  const done = items.filter((i) => i.done).length
  return { done, total: list.length, items }
}
