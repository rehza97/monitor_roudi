import { db } from "@/config/firebase"
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "@/lib/firebase-firestore"
import { COLLECTIONS, ORDER_KIND, type FirestoreOrder, type FirestoreSupportTicket } from "@/data/schema"

type NotificationPayload = {
  title: string
  message: string
  icon: string
  color: string
  link: string
}

type AdminUser = {
  id: string
}

function orderTitle(order: FirestoreOrder): string {
  if (order.kind === ORDER_KIND.materialSupply) return order.materialName || "Commande matériel"
  return order.requestType || "Demande client"
}

async function createNotification(
  payload: NotificationPayload & { userId: string; organizationId?: string },
): Promise<void> {
  if (!db) return
  await addDoc(collection(db, COLLECTIONS.notifications), {
    ...payload,
    body: payload.message,
    read: false,
    createdAt: serverTimestamp(),
  })
}

async function getAdminUsers(): Promise<AdminUser[]> {
  if (!db) return []
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.users), where("role", "==", "admin")))
    return snap.docs.map((d) => ({ id: d.id }))
  } catch {
    return []
  }
}

async function notifyAdmins(payload: NotificationPayload): Promise<void> {
  const admins = await getAdminUsers()
  await Promise.all(admins.map((admin) => createNotification({ ...payload, userId: admin.id })))
}

export async function notifyAdminsOfOrderCreated(orderId: string, order: FirestoreOrder): Promise<void> {
  await notifyAdmins({
    title: "Nouvelle commande reçue",
    message: `${order.clientLabel || "Un client"} a créé: ${orderTitle(order)}.`,
    icon: order.kind === ORDER_KIND.materialSupply ? "inventory_2" : "description",
    color: "bg-rose-50 text-rose-600",
    link: `/admin/requests/${orderId}`,
  })
}

export async function notifyClientOfOrderStatusChanged(
  orderId: string,
  order: FirestoreOrder,
  nextStatus: string,
): Promise<void> {
  if (!order.createdByUserId || order.status === nextStatus) return
  await createNotification({
    userId: order.createdByUserId,
    title: "Statut de commande mis à jour",
    message: `${orderTitle(order)} est maintenant: ${nextStatus}.`,
    icon: nextStatus === "Rejetée" ? "cancel" : nextStatus === "Livré" ? "rocket_launch" : "task_alt",
    color: nextStatus === "Rejetée" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600",
    link: `/client/requests/${orderId}`,
  })
}

export async function notifyAdminsOfTicketCreated(
  ticketId: string,
  ticket: FirestoreSupportTicket,
): Promise<void> {
  await notifyAdmins({
    title: "Nouveau ticket de maintenance",
    message: `${ticket.subject} · Priorité ${ticket.priority}.`,
    icon: "support_agent",
    color: "bg-amber-50 text-amber-600",
    link: "/admin/dashboard",
  })
  void ticketId
}

export async function notifyClientOfTicketStatusChanged(
  ticketId: string,
  ticket: FirestoreSupportTicket,
  nextStatus: FirestoreSupportTicket["status"],
): Promise<void> {
  if (!ticket.createdByUserId || ticket.status === nextStatus) return
  await createNotification({
    userId: ticket.createdByUserId,
    title: "Statut du ticket mis à jour",
    message: `${ticket.subject} est maintenant: ${nextStatus}.`,
    icon: nextStatus === "Résolu" || nextStatus === "Fermé" ? "check_circle" : "home_repair_service",
    color: nextStatus === "Résolu" || nextStatus === "Fermé" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600",
    link: "/client/support",
  })
  void ticketId
}
