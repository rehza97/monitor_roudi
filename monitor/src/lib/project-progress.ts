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

export function getOrderProgress(status: string): OrderProgress {
  if (status === "Rejetée") {
    return { percent: 0, stepIndex: -1, isRejected: true }
  }
  const stepIndex = MILESTONES.findIndex((m) => m.status === status)
  const percent = STATUS_PROGRESS[status] ?? 10
  return { percent, stepIndex, isRejected: false }
}

export function shouldShowAssignedEngineer(status: string): boolean {
  return ASSIGNED_STATUSES.has(status)
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
