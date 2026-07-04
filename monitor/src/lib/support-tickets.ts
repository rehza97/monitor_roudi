import { db } from "@/config/firebase"
import { addDoc, collection, serverTimestamp } from "@/lib/firebase-firestore"
import { COLLECTIONS, type FirestoreSupportTicket } from "@/data/schema"
import {
  notifyAdminsOfTicketCreated,
  notifyTechniciansOfTicketCreated,
} from "@/lib/notifications"

export type CreateSupportTicketInput = {
  subject: string
  description?: string
  topic?: FirestoreSupportTicket["topic"]
  priority: FirestoreSupportTicket["priority"]
  createdByUserId: string
  organizationId?: string
  clientLabel?: string
  deploymentId?: string
}

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<string> {
  if (!db) throw new Error("Firestore indisponible.")

  const payload = {
    subject: input.subject.trim(),
    description: input.description?.trim() || undefined,
    topic: input.topic,
    priority: input.priority,
    status: "Ouvert",
    createdByUserId: input.createdByUserId,
    organizationId: input.organizationId ?? "",
    clientLabel: input.clientLabel?.trim() || undefined,
    assignedToId: null,
    deploymentId: input.deploymentId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as FirestoreSupportTicket

  const ref = await addDoc(collection(db, COLLECTIONS.supportTickets), payload)
  await Promise.all([
    notifyTechniciansOfTicketCreated(ref.id, payload),
    notifyAdminsOfTicketCreated(ref.id, payload),
  ])
  return ref.id
}
