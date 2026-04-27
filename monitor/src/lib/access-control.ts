import type { FirestoreOrder, FirestoreSupportTicket, UserProfile } from "@/data/schema"

function isUnassigned(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && !value.trim())
}

export function canClientAccessOrder(order: FirestoreOrder, user: UserProfile | null): boolean {
  if (!user) return false
  if (order.kind !== "client_request") return false
  if (!user.organizationId) return false
  return order.organizationId === user.organizationId
}

export function canEngineerAccessOrder(order: FirestoreOrder, userId: string | null | undefined): boolean {
  if (!userId) return false
  if (order.kind !== "client_request") return false
  return order.assignedToId === userId
}

export function canTechnicianAccessTicket(
  ticket: FirestoreSupportTicket,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false
  if (isUnassigned(ticket.assignedToId)) return true
  return ticket.assignedToId === userId
}
