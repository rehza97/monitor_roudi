/**
 * Seed Algeria dataset for MVP.
 *
 * What it does:
 * - Creates/updates Firebase Auth users.
 * - Creates/updates Firestore users/{uid} profiles.
 * - Seeds core dashboard collections with Algerian data.
 *
 * Usage:
 *   cd monitor
 *   npm run admin:seed:dz
 *
 * Optional:
 *   SEED_RESET=true npm run admin:seed:dz
 *     -> deletes known seeded docs first, then reseeds.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { randomBytes } from "node:crypto"

process.env.FIREBASE_ADMIN_QUIET = "1"
const { default: admin } = await import("./init.mjs")

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = admin.firestore()
const auth = admin.auth()
const { FieldValue, Timestamp } = admin.firestore

const RESET = String(process.env.SEED_RESET || "").toLowerCase() === "true"
const CREDENTIALS_FILE = path.join(__dirname, ".seed-algeria-credentials.json")

function daysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return Timestamp.fromDate(d)
}

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return Timestamp.fromDate(d)
}

function deriveInitials(name, email) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function pickAvatarColor(seed) {
  const colors = ["#db143c", "#0ea5e9", "#2563eb", "#0891b2", "#f59e0b", "#0f766e"]
  const value = seed.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return colors[value % colors.length]
}

function randomPassword() {
  return randomBytes(14).toString("base64url")
}

async function ensureAuthUser(seedUser) {
  const email = seedUser.email.trim().toLowerCase()
  let created = false
  let password = null
  let userRecord

  try {
    userRecord = await auth.getUserByEmail(email)
    await auth.updateUser(userRecord.uid, {
      displayName: seedUser.name,
      email,
    })
  } catch (err) {
    if (err?.code !== "auth/user-not-found") throw err
    password = seedUser.password || randomPassword()
    userRecord = await auth.createUser({
      email,
      password,
      displayName: seedUser.name,
      emailVerified: true,
    })
    created = true
  }

  return {
    uid: userRecord.uid,
    email,
    created,
    password,
  }
}

async function setDoc(collectionName, id, data) {
  await db.collection(collectionName).doc(id).set(data, { merge: true })
}

async function deleteDocSafe(collectionName, id) {
  try {
    await db.collection(collectionName).doc(id).delete()
  } catch {}
}

async function deleteSubDocSafe(collectionName, docId, subcollectionName, subId) {
  try {
    await db.collection(collectionName).doc(docId).collection(subcollectionName).doc(subId).delete()
  } catch {}
}

async function main() {
  const seededAt = new Date().toISOString()
  const createdCredentials = []
  console.log(`[seed-dz] start ${seededAt} (reset=${RESET})`)

  const organizations = [
    {
      id: "org-sonatrach",
      displayName: "Sonatrach",
      status: "active",
      city: "Alger",
      wilaya: "Alger",
      address: "Hydra, Alger",
      country: "Algérie",
      createdAt: daysAgo(220),
    },
    {
      id: "org-cevital",
      displayName: "Cevital",
      status: "active",
      city: "Béjaïa",
      wilaya: "Béjaïa",
      address: "Zone industrielle, Béjaïa",
      country: "Algérie",
      createdAt: daysAgo(200),
    },
    {
      id: "org-condor",
      displayName: "Condor Electronics",
      status: "active",
      city: "Bordj Bou Arréridj",
      wilaya: "Bordj Bou Arréridj",
      address: "El Hamadia, BBA",
      country: "Algérie",
      createdAt: daysAgo(180),
    },
    {
      id: "org-biopharm",
      displayName: "Biopharm",
      status: "active",
      city: "Blida",
      wilaya: "Blida",
      address: "Zone industrielle, Blida",
      country: "Algérie",
      createdAt: daysAgo(170),
    },
  ]

  const seedUsers = [
    {
      key: "admin-main",
      name: "Amine Bensalem",
      email: "admin@roudi.dz",
      role: "admin",
      organizationId: null,
      accountType: "other",
      city: "Alger",
      phone: "+213550100101",
      password: "DzMvp2026!",
    },
    {
      key: "admin-ops",
      name: "Sonia Benali",
      email: "ops.admin@roudi.dz",
      role: "admin",
      organizationId: null,
      accountType: "other",
      city: "Oran",
      phone: "+213550100102",
      password: "DzMvp2026!",
    },
    {
      key: "client-sonatrach",
      name: "Nadia Khelifa",
      email: "nadia.khelifa@sonatrach.dz",
      role: "client",
      organizationId: "org-sonatrach",
      accountType: "other",
      city: "Alger",
      phone: "+213550200101",
      password: "DzMvp2026!",
    },
    {
      key: "client-cevital",
      name: "Yacine Merabet",
      email: "yacine.merabet@cevital.dz",
      role: "client",
      organizationId: "org-cevital",
      accountType: "other",
      city: "Béjaïa",
      phone: "+213550200102",
      password: "DzMvp2026!",
    },
    {
      key: "client-condor",
      name: "Lila Bouzid",
      email: "lila.bouzid@condor.dz",
      role: "client",
      organizationId: "org-condor",
      accountType: "other",
      city: "Bordj Bou Arréridj",
      phone: "+213550200103",
      password: "DzMvp2026!",
    },
    {
      key: "engineer-1",
      name: "Karim Touati",
      email: "karim.touati@roudi.dz",
      role: "engineer",
      organizationId: null,
      accountType: "other",
      city: "Constantine",
      phone: "+213550300101",
      password: "DzMvp2026!",
    },
    {
      key: "engineer-2",
      name: "Meriem Ait Ouali",
      email: "meriem.aitouali@roudi.dz",
      role: "engineer",
      organizationId: null,
      accountType: "other",
      city: "Tizi Ouzou",
      phone: "+213550300102",
      password: "DzMvp2026!",
    },
    {
      key: "technician-1",
      name: "Samir Charef",
      email: "samir.charef@roudi.dz",
      role: "technician",
      organizationId: null,
      accountType: "other",
      city: "Sétif",
      phone: "+213550400101",
      password: "DzMvp2026!",
    },
    {
      key: "technician-2",
      name: "Ines Boulahbel",
      email: "ines.boulahbel@roudi.dz",
      role: "technician",
      organizationId: null,
      accountType: "other",
      city: "Oran",
      phone: "+213550400102",
      password: "DzMvp2026!",
    },
  ]

  const seedDocIds = {
    deployments: ["dep-sona-securegate", "dep-cevital-logiops", "dep-condor-observe", "dep-biopharm-helpdesk"],
    invoices: ["inv-sona-2026-001", "inv-cevital-2026-001", "inv-condor-2026-001", "inv-biopharm-2026-001"],
    inventoryItems: [
      "invitem-router-cisco",
      "invitem-switch-fs",
      "invitem-server-dell",
      "invitem-camera-hik",
      "invitem-ups-apc",
      "invitem-firewall-forti",
    ],
    orders: [
      "ord-client-sona-001",
      "ord-client-cevital-001",
      "ord-client-condor-001",
      "ord-supply-001",
      "ord-supply-002",
    ],
    supportTickets: ["ticket-001", "ticket-002", "ticket-003", "ticket-004"],
    notifications: [
      "notif-admin-1",
      "notif-admin-2",
      "notif-client-1",
      "notif-engineer-1",
      "notif-tech-1",
    ],
    activityEvents: [
      "event-001",
      "event-002",
      "event-003",
      "event-004",
      "event-005",
      "event-006",
    ],
    tasks: ["task-001", "task-002", "task-003", "task-004", "task-005"],
    conversations: ["conv-admin-client-sona", "conv-admin-engineer-1", "conv-admin-tech-1"],
    engineers: ["eng-roster-1", "eng-roster-2"],
    stackServices: ["stack-auth", "stack-firestore", "stack-notify"],
    fieldServiceClients: ["fsc-sona", "fsc-cevital", "fsc-condor"],
    catalogProducts: ["securegate", "logiops", "observe360", "helpdesk-pro"],
  }

  if (RESET) {
    console.log("[seed-dz] reset mode: deleting previous seeded docs")
    for (const org of organizations) await deleteDocSafe("organizations", org.id)
    for (const id of Object.values(seedDocIds).flat()) {
      await deleteDocSafe("deployments", id)
      await deleteDocSafe("invoices", id)
      await deleteDocSafe("inventory_items", id)
      await deleteDocSafe("orders", id)
      await deleteDocSafe("support_tickets", id)
      await deleteDocSafe("notifications", id)
      await deleteDocSafe("activity_events", id)
      await deleteDocSafe("tasks", id)
      await deleteDocSafe("conversations", id)
      await deleteDocSafe("engineers", id)
      await deleteDocSafe("stack_services", id)
      await deleteDocSafe("field_service_clients", id)
      await deleteDocSafe("catalog_products", id)
    }
    await deleteDocSafe("platform_config", "main")
    await deleteSubDocSafe("conversations", "conv-admin-client-sona", "messages", "msg-001")
    await deleteSubDocSafe("conversations", "conv-admin-client-sona", "messages", "msg-002")
    await deleteSubDocSafe("conversations", "conv-admin-engineer-1", "messages", "msg-003")
    await deleteSubDocSafe("conversations", "conv-admin-engineer-1", "messages", "msg-004")
    await deleteSubDocSafe("conversations", "conv-admin-tech-1", "messages", "msg-005")
    await deleteSubDocSafe("conversations", "conv-admin-tech-1", "messages", "msg-006")
    for (const id of ["role-super-admin", "role-support", "role-analyst"]) {
      await deleteDocSafe("permission_role_templates", id)
    }
  }

  for (const org of organizations) {
    await setDoc("organizations", org.id, {
      ...org,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
  console.log("[seed-dz] organizations seeded")

  const uidByKey = new Map()
  for (const su of seedUsers) {
    const authRes = await ensureAuthUser(su)
    uidByKey.set(su.key, authRes.uid)

    await setDoc("users", authRes.uid, {
      name: su.name,
      email: authRes.email,
      role: su.role,
      organizationId: su.organizationId,
      accountType: su.accountType,
      city: su.city,
      country: "Algérie",
      phone: su.phone,
      initials: deriveInitials(su.name, authRes.email),
      avatarColor: pickAvatarColor(authRes.uid),
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (authRes.created && authRes.password) {
      createdCredentials.push({
        key: su.key,
        email: authRes.email,
        password: authRes.password,
      })
    }
  }
  console.log("[seed-dz] auth + users seeded")

  const adminMain = uidByKey.get("admin-main")
  const adminOps = uidByKey.get("admin-ops")
  const clientSona = uidByKey.get("client-sonatrach")
  const clientCevital = uidByKey.get("client-cevital")
  const clientCondor = uidByKey.get("client-condor")
  const engineer1 = uidByKey.get("engineer-1")
  const engineer2 = uidByKey.get("engineer-2")
  const tech1 = uidByKey.get("technician-1")
  const tech2 = uidByKey.get("technician-2")

  const required = [adminMain, adminOps, clientSona, clientCevital, clientCondor, engineer1, engineer2, tech1, tech2]
  if (required.some((v) => !v)) {
    throw new Error("Missing seeded user UID mapping.")
  }

  await setDoc("catalog_products", "securegate", {
    slug: "securegate",
    name: "SecureGate",
    category: "Sécurité",
    version: "3.2.1",
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("catalog_products", "logiops", {
    slug: "logiops",
    name: "LogiOps",
    category: "Opérations",
    version: "2.9.0",
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("catalog_products", "observe360", {
    slug: "observe360",
    name: "Observe360",
    category: "Monitoring",
    version: "1.18.4",
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("catalog_products", "helpdesk-pro", {
    slug: "helpdesk-pro",
    name: "HelpDesk Pro",
    category: "Support",
    version: "4.0.2",
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await setDoc("deployments", "dep-sona-securegate", {
    name: "SecureGate SIEGE",
    productSlug: "securegate",
    organizationId: "org-sonatrach",
    environment: "Production",
    health: "ok",
    cpu: 34,
    ram: 48,
    requests: 6200,
    clientLabel: "Sonatrach",
    createdAt: daysAgo(90),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("deployments", "dep-cevital-logiops", {
    name: "LogiOps Distribution",
    productSlug: "logiops",
    organizationId: "org-cevital",
    environment: "Production",
    health: "degraded",
    cpu: 71,
    ram: 66,
    requests: 4100,
    clientLabel: "Cevital",
    createdAt: daysAgo(70),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("deployments", "dep-condor-observe", {
    name: "Observe360 Factory",
    productSlug: "observe360",
    organizationId: "org-condor",
    environment: "Staging",
    health: "ok",
    cpu: 43,
    ram: 50,
    requests: 2300,
    clientLabel: "Condor Electronics",
    createdAt: daysAgo(60),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("deployments", "dep-biopharm-helpdesk", {
    name: "HelpDesk Pro Pharma",
    productSlug: "helpdesk-pro",
    organizationId: "org-biopharm",
    environment: "Production",
    health: "down",
    cpu: 0,
    ram: 0,
    requests: 0,
    clientLabel: "Biopharm",
    createdAt: daysAgo(30),
    updatedAt: FieldValue.serverTimestamp(),
  })

  await setDoc("invoices", "inv-sona-2026-001", {
    title: "Abonnement Plateforme - Avril 2026",
    amount: 480000,
    status: "Payée",
    organizationId: "org-sonatrach",
    createdByUserId: adminMain,
    issuedAt: daysAgo(12),
    dueAt: daysFromNow(18),
    createdAt: daysAgo(12),
  })
  await setDoc("invoices", "inv-cevital-2026-001", {
    title: "Abonnement Plateforme - Avril 2026",
    amount: 320000,
    status: "En attente",
    organizationId: "org-cevital",
    createdByUserId: adminOps,
    issuedAt: daysAgo(11),
    dueAt: daysFromNow(14),
    createdAt: daysAgo(11),
  })
  await setDoc("invoices", "inv-condor-2026-001", {
    title: "Maintenance premium - Avril 2026",
    amount: 290000,
    status: "En retard",
    organizationId: "org-condor",
    createdByUserId: adminMain,
    issuedAt: daysAgo(40),
    dueAt: daysAgo(10),
    createdAt: daysAgo(40),
  })
  await setDoc("invoices", "inv-biopharm-2026-001", {
    title: "Déploiement initial",
    amount: 550000,
    status: "En attente",
    organizationId: "org-biopharm",
    createdByUserId: adminOps,
    issuedAt: daysAgo(6),
    dueAt: daysFromNow(24),
    createdAt: daysAgo(6),
  })

  const inventoryRows = [
    {
      id: "invitem-router-cisco",
      sku: "DZ-RT-001",
      name: "Routeur Cisco ISR",
      category: "Réseau",
      stock: 18,
      threshold: 6,
      location: "Entrepôt Alger",
      priceDisplay: "185 000 DA",
    },
    {
      id: "invitem-switch-fs",
      sku: "DZ-SW-007",
      name: "Switch 24 ports",
      category: "Réseau",
      stock: 9,
      threshold: 8,
      location: "Entrepôt Oran",
      priceDisplay: "72 000 DA",
    },
    {
      id: "invitem-server-dell",
      sku: "DZ-SRV-022",
      name: "Serveur Rack Dell",
      category: "Serveurs",
      stock: 4,
      threshold: 2,
      location: "Datacenter Alger",
      priceDisplay: "1 200 000 DA",
    },
    {
      id: "invitem-camera-hik",
      sku: "DZ-CAM-110",
      name: "Caméra IP Hikvision",
      category: "Sécurité",
      stock: 35,
      threshold: 10,
      location: "Entrepôt Constantine",
      priceDisplay: "28 500 DA",
    },
    {
      id: "invitem-ups-apc",
      sku: "DZ-UPS-050",
      name: "Onduleur APC 3KVA",
      category: "Énergie",
      stock: 6,
      threshold: 5,
      location: "Datacenter Alger",
      priceDisplay: "165 000 DA",
    },
    {
      id: "invitem-firewall-forti",
      sku: "DZ-FW-015",
      name: "Firewall FortiGate",
      category: "Sécurité",
      stock: 0,
      threshold: 2,
      location: "Entrepôt Blida",
      priceDisplay: "310 000 DA",
    },
  ]
  for (const item of inventoryRows) {
    await setDoc("inventory_items", item.id, {
      ...item,
      createdAt: daysAgo(40),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  await setDoc("orders", "ord-client-sona-001", {
    organizationId: "org-sonatrach",
    kind: "client_request",
    createdByUserId: clientSona,
    status: "En cours",
    clientLabel: "Sonatrach",
    clientEmail: "nadia.khelifa@sonatrach.dz",
    requestType: "Portail incidents terrain",
    budgetLabel: "2 800 000 DA",
    description: "Application web pour suivi incidents et intervention multi-sites.",
    timelineLabel: "8 semaines",
    priority: "Haute",
    adminComment: "Développement backend validé. Front en cours.",
    createdAt: daysAgo(21),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("orders", "ord-client-cevital-001", {
    organizationId: "org-cevital",
    kind: "client_request",
    createdByUserId: clientCevital,
    status: "Validée",
    clientLabel: "Cevital",
    clientEmail: "yacine.merabet@cevital.dz",
    requestType: "Dashboard logistique",
    budgetLabel: "1 450 000 DA",
    description: "Suivi des flux logistiques et performances entrepôts.",
    timelineLabel: "6 semaines",
    priority: "Normale",
    adminComment: "Prête pour planification sprint 2.",
    createdAt: daysAgo(14),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("orders", "ord-client-condor-001", {
    organizationId: "org-condor",
    kind: "client_request",
    createdByUserId: clientCondor,
    status: "En attente",
    clientLabel: "Condor Electronics",
    clientEmail: "lila.bouzid@condor.dz",
    requestType: "Application SAV mobile",
    budgetLabel: "1 200 000 DA",
    description: "Suivi SAV avec pièces et notifications client en temps réel.",
    timelineLabel: "5 semaines",
    priority: "Urgente",
    adminComment: "À valider par équipe produit.",
    createdAt: daysAgo(5),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("orders", "ord-supply-001", {
    organizationId: "platform",
    kind: "material_supply",
    createdByUserId: adminMain,
    status: "En attente",
    materialName: "Firewall FortiGate",
    quantity: 4,
    supplier: "Sarl Tech Distribution Alger",
    notes: "Besoin urgent pour sites Alger et Oran.",
    createdAt: daysAgo(3),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("orders", "ord-supply-002", {
    organizationId: "platform",
    kind: "material_supply",
    createdByUserId: adminOps,
    status: "Validée",
    materialName: "Switch 24 ports",
    quantity: 12,
    supplier: "Eurl Network Plus Constantine",
    notes: "Réapprovisionnement préventif T2.",
    createdAt: daysAgo(9),
    updatedAt: FieldValue.serverTimestamp(),
  })

  await setDoc("support_tickets", "ticket-001", {
    subject: "Panne accès VPN site Alger",
    description: "Interruption intermittente depuis 09:20.",
    priority: "Urgente",
    status: "En cours",
    createdByUserId: clientSona,
    assignedToId: tech1,
    organizationId: "org-sonatrach",
    createdAt: daysAgo(1),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("support_tickets", "ticket-002", {
    subject: "Latence élevée dashboard logistique",
    description: "Temps de chargement supérieur à 8 secondes.",
    priority: "Haute",
    status: "Ouvert",
    createdByUserId: clientCevital,
    assignedToId: null,
    organizationId: "org-cevital",
    createdAt: daysAgo(2),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("support_tickets", "ticket-003", {
    subject: "Erreur synchronisation stock",
    description: "Échec de synchronisation des quantités sur mobile.",
    priority: "Normale",
    status: "Résolu",
    createdByUserId: clientCondor,
    assignedToId: tech2,
    organizationId: "org-condor",
    createdAt: daysAgo(7),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("support_tickets", "ticket-004", {
    subject: "Demande installation agent monitoring",
    description: "Nouveau serveur pharmacie centrale.",
    priority: "Basse",
    status: "Fermé",
    createdByUserId: clientSona,
    assignedToId: tech1,
    organizationId: "org-biopharm",
    createdAt: daysAgo(16),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const taskRows = [
    {
      id: "task-001",
      label: "Finaliser API incidents",
      project: "Portail incidents terrain",
      priority: "Haute",
      dueDate: "2026-04-11",
      dueAt: daysFromNow(4),
      done: false,
      assignedToId: engineer1,
      organizationId: "org-sonatrach",
      createdAt: daysAgo(4),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      id: "task-002",
      label: "Optimiser requêtes reporting",
      project: "Dashboard logistique",
      priority: "Normale",
      dueDate: "2026-04-14",
      dueAt: daysFromNow(7),
      done: false,
      assignedToId: engineer2,
      organizationId: "org-cevital",
      createdAt: daysAgo(3),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      id: "task-003",
      label: "Corriger bug upload photos SAV",
      project: "Application SAV mobile",
      priority: "Haute",
      dueDate: "2026-04-09",
      dueAt: daysFromNow(2),
      done: false,
      assignedToId: engineer1,
      organizationId: "org-condor",
      createdAt: daysAgo(2),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      id: "task-004",
      label: "Vérifier lien fibre POP Oran",
      project: "Support réseau",
      priority: "Normale",
      dueDate: "2026-04-08",
      dueAt: daysFromNow(1),
      done: false,
      assignedToId: tech1,
      organizationId: "org-sonatrach",
      createdAt: daysAgo(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    {
      id: "task-005",
      label: "Maintenance préventive onduleurs",
      project: "Datacenter Alger",
      priority: "Basse",
      dueDate: "2026-04-18",
      dueAt: daysFromNow(11),
      done: true,
      assignedToId: tech2,
      organizationId: "platform",
      createdAt: daysAgo(10),
      updatedAt: FieldValue.serverTimestamp(),
    },
  ]
  for (const task of taskRows) {
    await setDoc("tasks", task.id, task)
  }

  const eventRows = [
    {
      id: "event-001",
      title: "Demande Sonatrach passée en En cours",
      actorUserId: adminMain,
      actorName: "Amine Bensalem",
      category: "Demandes",
      createdAt: daysAgo(1),
    },
    {
      id: "event-002",
      title: "Nouveau technicien ajouté (Ines Boulahbel)",
      actorUserId: adminOps,
      actorName: "Sonia Benali",
      category: "Utilisateurs",
      createdAt: daysAgo(2),
    },
    {
      id: "event-003",
      title: "Réapprovisionnement réseau validé",
      actorUserId: adminMain,
      actorName: "Amine Bensalem",
      category: "Matériels",
      createdAt: daysAgo(3),
    },
    {
      id: "event-004",
      title: "Déploiement Observe360 mis à jour",
      actorUserId: engineer2,
      actorName: "Meriem Ait Ouali",
      category: "Applications",
      createdAt: daysAgo(4),
    },
    {
      id: "event-005",
      title: "Facture Cevital générée",
      actorUserId: adminOps,
      actorName: "Sonia Benali",
      category: "Finance",
      createdAt: daysAgo(5),
    },
    {
      id: "event-006",
      title: "Intervention ticket VPN démarrée",
      actorUserId: tech1,
      actorName: "Samir Charef",
      category: "Autre",
      createdAt: daysAgo(1),
    },
  ]
  for (const e of eventRows) {
    await setDoc("activity_events", e.id, e)
  }

  const notifRows = [
    {
      id: "notif-admin-1",
      userId: adminMain,
      organizationId: "platform",
      kind: "system",
      read: false,
      title: "Alerte stock",
      body: "Firewall FortiGate en rupture (Entrepôt Blida).",
      link: "/admin/materials",
      createdAt: daysAgo(1),
    },
    {
      id: "notif-admin-2",
      userId: adminOps,
      organizationId: "platform",
      kind: "billing",
      read: false,
      title: "Facture en attente",
      body: "Cevital - échéance dans 14 jours.",
      link: "/admin/reports",
      createdAt: daysAgo(2),
    },
    {
      id: "notif-client-1",
      userId: clientSona,
      organizationId: "org-sonatrach",
      kind: "order",
      read: false,
      title: "Mise à jour de votre demande",
      body: "Votre demande est passée au statut En cours.",
      link: "/client/requests",
      createdAt: daysAgo(1),
    },
    {
      id: "notif-engineer-1",
      userId: engineer1,
      organizationId: "platform",
      kind: "task",
      read: false,
      title: "Nouvelle tâche assignée",
      body: "Finaliser API incidents (Portail Sonatrach).",
      link: "/engineer/dashboard",
      createdAt: daysAgo(1),
    },
    {
      id: "notif-tech-1",
      userId: tech1,
      organizationId: "platform",
      kind: "ticket",
      read: false,
      title: "Nouveau ticket urgent",
      body: "Panne accès VPN site Alger.",
      link: "/technician/tickets",
      createdAt: daysAgo(1),
    },
  ]
  for (const n of notifRows) {
    await setDoc("notifications", n.id, n)
  }

  await setDoc("conversations", "conv-admin-client-sona", {
    participantIds: [adminMain, clientSona],
    participantNames: {
      [adminMain]: "Amine Bensalem",
      [clientSona]: "Nadia Khelifa",
    },
    organizationId: "org-sonatrach",
    otherRoleHint: "client",
    lastMessageAt: daysAgo(0),
    lastMessageText: "Parfait, merci pour le retour.",
    lastSenderUserId: adminMain,
    createdAt: daysAgo(12),
  })
  await setDoc("conversations", "conv-admin-engineer-1", {
    participantIds: [adminMain, engineer1],
    participantNames: {
      [adminMain]: "Amine Bensalem",
      [engineer1]: "Karim Touati",
    },
    organizationId: "platform",
    otherRoleHint: "engineer",
    lastMessageAt: daysAgo(0),
    lastMessageText: "Je pousse la correction avant 16h.",
    lastSenderUserId: engineer1,
    createdAt: daysAgo(9),
  })
  await setDoc("conversations", "conv-admin-tech-1", {
    participantIds: [adminOps, tech1],
    participantNames: {
      [adminOps]: "Sonia Benali",
      [tech1]: "Samir Charef",
    },
    organizationId: "platform",
    otherRoleHint: "technician",
    lastMessageAt: daysAgo(0),
    lastMessageText: "Intervention terminée, tests OK.",
    lastSenderUserId: tech1,
    createdAt: daysAgo(6),
  })

  await setDoc("conversations/conv-admin-client-sona/messages", "msg-001", {
    senderUserId: clientSona,
    body: "Bonjour, pouvez-vous confirmer la date de livraison ?",
    createdAt: daysAgo(1),
  })
  await setDoc("conversations/conv-admin-client-sona/messages", "msg-002", {
    senderUserId: adminMain,
    body: "Parfait, merci pour le retour.",
    createdAt: daysAgo(0),
  })
  await setDoc("conversations/conv-admin-engineer-1/messages", "msg-003", {
    senderUserId: adminMain,
    body: "Priorité haute sur le bug d'upload photo SAV.",
    createdAt: daysAgo(1),
  })
  await setDoc("conversations/conv-admin-engineer-1/messages", "msg-004", {
    senderUserId: engineer1,
    body: "Je pousse la correction avant 16h.",
    createdAt: daysAgo(0),
  })
  await setDoc("conversations/conv-admin-tech-1/messages", "msg-005", {
    senderUserId: adminOps,
    body: "Ticket VPN Alger assigné, retour ASAP.",
    createdAt: daysAgo(1),
  })
  await setDoc("conversations/conv-admin-tech-1/messages", "msg-006", {
    senderUserId: tech1,
    body: "Intervention terminée, tests OK.",
    createdAt: daysAgo(0),
  })

  await setDoc("engineers", "eng-roster-1", {
    name: "Karim Touati",
    email: "karim.touati@roudi.dz",
    specialty: "Backend",
    status: "Disponible",
    projects: 3,
    phone: "+213550300101",
    bio: "Ingénieur backend, API et architecture cloud.",
    skills: ["Node.js", "PostgreSQL", "Redis", "Firebase"],
    linkedUserId: engineer1,
    createdAt: daysAgo(140),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("engineers", "eng-roster-2", {
    name: "Meriem Ait Ouali",
    email: "meriem.aitouali@roudi.dz",
    specialty: "Fullstack",
    status: "Occupé",
    projects: 4,
    phone: "+213550300102",
    bio: "Fullstack React/Node, focus UX et performance.",
    skills: ["React", "TypeScript", "Node.js", "Firestore"],
    linkedUserId: engineer2,
    createdAt: daysAgo(120),
    updatedAt: FieldValue.serverTimestamp(),
  })

  await setDoc("stack_services", "stack-auth", {
    name: "Auth Service",
    env: "Production",
    status: "ok",
    uptime: "99.97%",
    latency: "42ms",
    cpu: 36,
    mem: 44,
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("stack_services", "stack-firestore", {
    name: "Firestore Cluster",
    env: "Production",
    status: "ok",
    uptime: "99.99%",
    latency: "31ms",
    cpu: 28,
    mem: 39,
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("stack_services", "stack-notify", {
    name: "Notification Worker",
    env: "Staging",
    status: "degraded",
    uptime: "98.70%",
    latency: "85ms",
    cpu: 71,
    mem: 62,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await setDoc("field_service_clients", "fsc-sona", {
    name: "Sonatrach",
    contact: "Nadia Khelifa",
    email: "nadia.khelifa@sonatrach.dz",
    phone: "+213550200101",
    city: "Alger",
    address: "Hydra, Alger",
    status: "Actif",
    tickets: 12,
    since: "2024-06-01",
    lastIntervention: "2026-04-06",
    createdAt: daysAgo(250),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("field_service_clients", "fsc-cevital", {
    name: "Cevital",
    contact: "Yacine Merabet",
    email: "yacine.merabet@cevital.dz",
    phone: "+213550200102",
    city: "Béjaïa",
    address: "Zone industrielle, Béjaïa",
    status: "Actif",
    tickets: 7,
    since: "2024-09-10",
    lastIntervention: "2026-04-03",
    createdAt: daysAgo(210),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await setDoc("field_service_clients", "fsc-condor", {
    name: "Condor Electronics",
    contact: "Lila Bouzid",
    email: "lila.bouzid@condor.dz",
    phone: "+213550200103",
    city: "Bordj Bou Arréridj",
    address: "El Hamadia, BBA",
    status: "Actif",
    tickets: 9,
    since: "2025-01-15",
    lastIntervention: "2026-04-05",
    createdAt: daysAgo(140),
    updatedAt: FieldValue.serverTimestamp(),
  })

  await setDoc("platform_config", "main", {
    name: "Roudi Monitor DZ",
    email: "contact@roudi.dz",
    url: "https://roudi.dz",
    security: {
      twofa: true,
      multiSession: true,
      connLogs: true,
      ipWhitelist: false,
    },
    updatedAt: FieldValue.serverTimestamp(),
  })

  const output = {
    project: "roudi-monitor-app",
    seededAt,
    resetMode: RESET,
    note: "All seeded fixtures are Algeria-localized (companies, names, cities, phones, currency).",
    createdAuthUsers: createdCredentials,
    defaultPasswordForPresetUsers: "DzMvp2026!",
  }

  fs.writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8")
  console.log(`Seed completed for roudi-monitor-app.`)
  console.log(`Credentials report: ${CREDENTIALS_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
