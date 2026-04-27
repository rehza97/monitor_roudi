/** Matches dashboard routing / layout roles */
export type UserRole = "client" | "admin" | "engineer" | "technician"

/** Canonical deployment health (Firestore-oriented); map to per-view labels in UI */
export type DeploymentHealth = "ok" | "degraded" | "down" | "stopped"

export type DeploymentEnvironment = "Production" | "Staging" | "Development"

export interface Organization {
  id: string
  displayName: string
}

/** Auth + profile seed (demo login) */
export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  initials: string
  avatarColor: string
  /** Optional link to an organization (e.g. client tenant) */
  organizationId?: string
  zone?: string
}

export interface Deployment {
  id: string
  organizationId: string
  /** Key into catalog (`appsData`) */
  productSlug: string
  environment: DeploymentEnvironment
  health: DeploymentHealth
  cpu: number
  ram: number
  requests: string
  /** Client dashboard row label when it differs from catalog name (e.g. SecureGate API) */
  clientListName?: string
}

/** Admin monitoring table row */
export interface AdminAppRow {
  name: string
  client: string
  env: string
  cpu: number
  ram: number
  requests: string
  status: "healthy" | "warning" | "down"
}

/** Client monitoring service row */
export interface ClientServiceRow {
  name: string
  env: string
  status: "running" | "stopped" | "warning"
  cpu: number
  ram: number
  uptime: string
  version: string
}

/** Engineer infra stack row */
export interface StackServiceRow {
  name: string
  env: string
  status: string
  uptime: string
  latency: string
  cpu: number
  mem: number
}

export interface EngineerRosterRow {
  id: string
  name: string
  email: string
  specialty: string
  projects: number
  status: string
}

/** Internal org id for platform-scoped orders (admin / stock), not a client tenant */
export const PLATFORM_ORGANIZATION_ID = "platform" as const

export const ORDER_KIND = {
  clientRequest: "client_request",
  materialSupply: "material_supply",
} as const

export type OrderKind = (typeof ORDER_KIND)[keyof typeof ORDER_KIND]

/** Firestore `orders/{orderId}` — client “demandes” or material supply orders */
export interface FirestoreOrder {
  organizationId: string
  kind: OrderKind
  createdByUserId: string
  /** Staff owner for triage/processing flows (engineer/technician) */
  assignedToId?: string | null
  assignedEngineerName?: string | null
  status: string
  /** Demande client */
  clientLabel?: string
  clientEmail?: string
  requestType?: string
  budgetLabel?: string
  description?: string
  timelineLabel?: string
  priority?: string
  features?: string[]
  adminComment?: string
  /** Commande matériel */
  materialName?: string
  quantity?: number
  supplier?: string
  notes?: string
  /** Optional link to `invoices/{invoiceId}` once billing is created */
  invoiceId?: string
  createdAt?: unknown
  updatedAt?: unknown
}

/** Firestore `projects/{id}` — engineer execution project created from validated client requests */
export interface FirestoreProject {
  orderId: string
  organizationId: string
  createdByUserId: string
  assignedEngineerId: string
  assignedEngineerName?: string
  title: string
  clientLabel?: string
  clientEmail?: string
  requestType?: string
  priority?: string
  description?: string
  status: "pending" | "active" | "delivered" | "cancelled"
  lastOrderStatus?: string
  startedAt?: unknown
  deliveredAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

/** Firestore `inventory_items/{id}` — Gestion des matériels */
export interface FirestoreInventoryItem {
  sku: string
  name: string
  category: string
  stock: number
  threshold: number
  location: string
  /** Display string e.g. "1 200 DA" */
  priceDisplay: string
  imageUrl?: string
  createdAt?: unknown
  updatedAt?: unknown
}

/** Firestore `engineers/{engineerId}` document (admin roster / Gestion des ingénieurs) */
export interface FirestoreEngineer {
  name: string
  email: string
  specialty: string
  status: string
  projects: number
  phone?: string
  bio?: string
  skills?: string[]
  /** Optional link to `users/{uid}` when the engineer has a login */
  linkedUserId?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface InvoiceRow {
  id: string
  title: string
  amount: string
  date: string
  status: string
}

export interface SupportTicketRow {
  id: string
  subject: string
  priority: string
  status: string
  date: string
}

export interface NotificationRow {
  icon: string
  color: string
  bg: string
  title: string
  desc: string
  time: string
  read: boolean
  group: string
}

export interface ActivityEventRow {
  icon: string
  color: string
  title: string
  actor: string
  time: string
  category: string
}

export interface TaskRow {
  id: string
  label: string
  project: string
  priority: string
  due: string
  done: boolean
}

export interface InventoryItemRow {
  ref: string
  name: string
  category: string
  stock: number
  threshold: number
  location: string
  status: string
}

/** Client “Mes applications” card row */
export interface ClientAppSummaryRow {
  id: string
  /** Route param for `/apps/:slug` */
  slug: string
  name: string
  status: string
  version: string
  category: string
  uptime: string
  icon: string
  iconBg: string
  iconColor: string
}

/** Admin map pins (simplified client locations) */
export interface AdminMapClientRow {
  name: string
  city: string
  status: string
  coords: string
  top: number
  left: number
}

export interface StaffNotificationRow {
  id: number
  icon: string
  color: string
  bg: string
  title: string
  time: string
  read: boolean
  link?: string
}

export interface FieldServiceClientRow {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  city: string
  tickets: number
  status: string
  address: string
  since: string
  lastIntervention: string
}

/** Admin messenger */
export interface AdminConversationRow {
  id: number
  name: string
  role: string
  last: string
  time: string
  unread: number
}

export interface AdminMessageRow {
  id: number
  text: string
  time: string
  mine: boolean
  from: string
  initials: string
}

/** Client messenger */
export interface ClientConversationRow {
  id: number
  name: string
  avatar: string
  lastMsg: string
  time: string
  unread: number
}

export interface ClientMessageRow {
  from: string
  text: string
  time: string
  mine: boolean
}

/** Engineer messenger */
export interface EngineerThreadRow {
  id: number
  name: string
  initials: string
  color: string
  role: string
  last: string
  time: string
  unread: number
}

export interface EngineerMessageRow {
  id: number
  from: string
  initials: string
  color: string
  text: string
  time: string
  mine: boolean
}

/**
 * Canonical Firestore root collections for the product.
 * Keep this surface small and stable so the app does not drift into one
 * collection per screen.
 */
export const ROOT_COLLECTIONS = {
  organizations: "organizations",
  users: "users",
  catalogProducts: "catalog_products",
  deployments: "deployments",
  invoices: "invoices",
  orders: "orders",
  projects: "projects",
  supportTickets: "support_tickets",
  notifications: "notifications",
  activityEvents: "activity_events",
  tasks: "tasks",
  meetings: "meetings",
  inventoryItems: "inventory_items",
  conversations: "conversations",
  stackServices: "stack_services",
  engineers: "engineers",
  organizationInvites: "organization_invites",
  attachments: "attachments",
} as const

/**
 * Child collections under a root document.
 * `messages` belongs under `conversations/{conversationId}`.
 * `deploymentComponents` belongs under `deployments/{deploymentId}` when you
 * need per-deployment infra/service rows instead of the global demo stack.
 */
export const SUBCOLLECTIONS = {
  messages: "messages",
  deploymentComponents: "components",
} as const

/**
 * View-only / admin-config collections that can be added later if the product
 * needs server-side editing. They should not be part of the MVP Firestore
 * contract by default.
 */
export const OPTIONAL_ROOT_COLLECTIONS = {
  fieldServiceClients: "field_service_clients",
  platformConfig: "platform_config",
  contactLeads: "contact_leads",
  contentBlogPosts: "content_blog_posts",
  contentCareersJobs: "content_careers_jobs",
} as const

/** Firestore `platform_config/main` — single-document platform settings */
export interface InvoiceCompanyConfig {
  companyName: string
  companyTagline: string
  companyAddress: string
  companyEmail: string
  companyPhone: string
  bankName: string
  bankIBAN: string
  bankSWIFT: string
  bankNote: string
}

export interface FirestorePlatformConfig {
  name: string
  email: string
  url: string
  security: {
    twofa: boolean
    multiSession: boolean
    connLogs: boolean
    ipWhitelist: boolean
  }
  invoiceConfig?: Partial<InvoiceCompanyConfig>
  updatedAt?: unknown
}

/** Firestore `support_tickets/{id}` */
export interface FirestoreSupportTicket {
  subject: string
  description?: string
  topic?: "software" | "material" | "unknown"
  priority: "Basse" | "Normale" | "Haute" | "Urgente"
  status: "Ouvert" | "En cours" | "Résolu" | "Fermé"
  createdByUserId: string
  organizationId?: string
  assignedToId?: string | null
  technicianRejectedBy?: string
  deploymentId?: string
  scheduledAt?: unknown
  siteAddress?: string
  estimatedDuration?: string
  visitWindow?: string
  checkInAt?: unknown
  checkOutAt?: unknown
  checkInLocation?: { latitude: number; longitude: number; accuracy?: number | null }
  checkOutLocation?: { latitude: number; longitude: number; accuracy?: number | null }
  report?: string
  duration?: string
  materialsUsed?: string
  materialUsageItems?: Array<{ label: string; quantity?: number }>
  inventoryAdjustmentStatus?: "none" | "pending_review" | "approved"
  createdAt?: unknown
  updatedAt?: unknown
}

/** Firestore `tasks/{id}` */
export interface FirestoreTask {
  label: string
  project: string
  priority: string
  dueDate?: string
  done: boolean
  assignedToId?: string
  createdAt?: unknown
  updatedAt?: unknown
}

/** Firestore `meetings/{id}` */
export interface FirestoreMeeting {
  title: string
  description?: string
  platform: "zoom" | "google_meet" | "microsoft_teams" | "other"
  status: "scheduled" | "cancelled" | "postponed"
  meetingLink: string
  meetingCode?: string
  scheduledAt: unknown
  postponedFromAt?: unknown
  statusNote?: string
  targetUserIds: string[]
  targetUserNames?: string[]
  createdByUserId: string
  createdByName?: string
  createdAt?: unknown
  updatedAt?: unknown
}

/** Firestore `notifications/{id}` */
export interface FirestoreNotification {
  title: string
  message?: string
  icon?: string
  color?: string
  read: boolean
  userId?: string
  organizationId?: string
  link?: string
  createdAt?: unknown
}

export interface InvoiceLineItem {
  description: string
  qty: number
  unitPrice: number
  total: number
}

/** Firestore `invoices/{id}` */
export interface FirestoreInvoice {
  title: string
  amount: number
  status: "En attente" | "Payée" | "En retard"
  organizationId: string
  orderId?: string
  clientEmail?: string
  clientLabel?: string
  clientAddress?: string
  clientPhone?: string
  taxRate?: number
  lineItems?: InvoiceLineItem[]
  notes?: string
  pdfUrl?: string
  paymentMethod?: string
  paymentProvider?: string
  paidAt?: unknown
  paidByUserId?: string
  paymentReceipt?: {
    provider: string
    reference: string
    amount: number
    submittedAt?: unknown
    submittedByUserId?: string
  }
  sentAt?: unknown
  sentByUserId?: string
  sentByName?: string
  createdByUserId?: string
  issuedAt?: unknown
  dueAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

/** Firestore `field_service_clients/{id}` */
export interface FirestoreFieldServiceClient {
  name: string
  contact: string
  email: string
  phone: string
  city: string
  address: string
  status: string
  zone?: string
  assignedTechnicianId?: string
  assignedTechnicianIds?: string[]
  tickets?: number
  since?: string
  lastIntervention?: string
  createdAt?: unknown
  updatedAt?: unknown
}

/** Firestore `contact_leads/{id}` */
export interface FirestoreContactLead {
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
  sourcePath?: string
  status?: "new" | "processed"
  createdAt?: unknown
}

/** Firestore `content_blog_posts/{id}` */
export interface FirestoreBlogPost {
  category: string
  title: string
  excerpt: string
  author: string
  authorInitials?: string
  authorColor?: string
  dateLabel?: string
  readTime?: string
  featured?: boolean
  published?: boolean
  createdAt?: unknown
}

/** Firestore `content_careers_jobs/{id}` */
export interface FirestoreCareerJob {
  title: string
  team: string
  location: string
  type: string
  badge?: string | null
  published?: boolean
  order?: number
  createdAt?: unknown
}

/** Firestore `organization_invites/{id}` */
export interface FirestoreOrganizationInvite {
  email: string
  organizationId: string
  role: UserRole
  code: string
  status: "pending" | "accepted" | "expired" | "revoked"
  createdByUserId: string
  acceptedByUserId?: string
  createdAt?: unknown
  acceptedAt?: unknown
  expiresAt?: unknown
}

/** Firestore `attachments/{id}` metadata; binary files live in Firebase Storage. */
export interface FirestoreAttachment {
  /** `order` = `orders/{ownerId}` (demande client) */
  ownerType: "order" | "support_ticket" | "invoice" | "project" | "intervention_report" | string
  ownerId: string
  fileName: string
  contentType?: string
  storagePath: string
  organizationId?: string
  uploadedByUserId: string
  createdAt?: unknown
}

/** Firestore `time_entries/{id}` — engineer billable hour logs */
export interface FirestoreTimeEntry {
  assignedToId: string
  projectId?: string
  projectTitle: string
  date: string
  hours: number
  description: string
  billable: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

/** Firestore `service_logs/{id}` — infra service log lines */
export interface FirestoreServiceLog {
  serviceId: string
  serviceName?: string
  level: "info" | "warning" | "error" | "debug"
  message: string
  source?: string
  createdAt?: unknown
}

/** Backward-compatible aggregate for imports that expect a single constant. */
export const COLLECTIONS = {
  ...ROOT_COLLECTIONS,
  ...SUBCOLLECTIONS,
  ...OPTIONAL_ROOT_COLLECTIONS,
  timeEntries: "time_entries",
  serviceLogs: "service_logs",
} as const
