/**
 * Mock seed datasets are disabled (empty exports). Replace with API / Firestore data.
 * Previous inline mock content is available in git history.
 */
import { appsData, appsList } from "@/lib/appsData"

export { appsData, appsList }
import type {
  ActivityEventRow,
  AdminMapClientRow,
  AdminAppRow,
  AdminConversationRow,
  AdminMessageRow,
  ClientConversationRow,
  ClientMessageRow,
  ClientAppSummaryRow,
  ClientServiceRow,
  Deployment,
  EngineerMessageRow,
  EngineerRosterRow,
  EngineerThreadRow,
  FieldServiceClientRow,
  InventoryItemRow,
  InvoiceRow,
  NotificationRow,
  Organization,
  StackServiceRow,
  SupportTicketRow,
  TaskRow,
  StaffNotificationRow,
  UserProfile,
} from "./schema"

export const adminMapClients: AdminMapClientRow[] = []
export const engineerNotifications: StaffNotificationRow[] = []
export const technicianNotifications: StaffNotificationRow[] = []
export const organizations: Organization[] = []
export const deployments: Deployment[] = []

export const adminMonitoringApps: AdminAppRow[] = []
export const clientAppsSummary: ClientAppSummaryRow[] = []
export const clientMonitoringServices: ClientServiceRow[] = []

export const seedUsers: UserProfile[] = []
export const engineerRoster: EngineerRosterRow[] = []
export const invoices: InvoiceRow[] = []
export const supportTickets: SupportTicketRow[] = []
export const clientNotifications: NotificationRow[] = []
export const activityEvents: ActivityEventRow[] = []
export const engineerTasks: TaskRow[] = []
export const inventoryItems: InventoryItemRow[] = []
export const fieldServiceClients: FieldServiceClientRow[] = []
export const stackServices: StackServiceRow[] = []
export const adminMessengerConversations: AdminConversationRow[] = []
export const adminMessengerThreads: Record<number, AdminMessageRow[]> = {}
export const clientMessengerConversations: ClientConversationRow[] = []
export const clientMessengerThreads: Record<number, ClientMessageRow[]> = {}
export const engineerMessengerThreads: EngineerThreadRow[] = []
export const engineerMessengerMessages: Record<number, EngineerMessageRow[]> = {}

/**
 * Seed grouped by canonical root collections first.
 * Screen-specific projections stay under `views` so they are not mistaken for
 * one-table-per-page Firestore design.
 */
export const seed = {
  organizations,
  deployments,
  users: seedUsers,
  catalogProducts: appsData,
  invoices,
  supportTickets,
  notifications: clientNotifications,
  activityEvents,
  tasks: engineerTasks,
  inventoryItems,
  conversations: {
    admin: { conversations: adminMessengerConversations, threads: adminMessengerThreads },
    client: { conversations: clientMessengerConversations, threads: clientMessengerThreads },
    engineer: { threads: engineerMessengerThreads, messages: engineerMessengerMessages },
  },
  stackServices,
  optional: {
    engineerRoster,
    fieldServiceClients,
  },
  views: {
    adminMonitoringApps,
    clientMonitoringServices,
    clientAppsSummary,
  },
} as const
