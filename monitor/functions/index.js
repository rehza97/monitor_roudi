const { randomBytes } = require("node:crypto")
const { onCall, HttpsError } = require("firebase-functions/v2/https")
const { onRequest } = require("firebase-functions/v2/https")
const { onDocumentWritten } = require("firebase-functions/v2/firestore")
const { initializeApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { getFirestore, FieldValue } = require("firebase-admin/firestore")

initializeApp()

function deriveInitials(name, email) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function pickAvatarColor(seed) {
  const colors = ["#0891b2", "#db143c", "#2463eb", "#f9bc06", "#7c3aed", "#0f766e"]
  const value = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return colors[value % colors.length]
}

function ensureRole(role) {
  return ["admin", "engineer", "technician", "client"].includes(role)
}

function isStaffRole(role) {
  return ["admin", "engineer", "technician"].includes(role)
}

async function loadCaller(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.")
  }

  const tokenRole = ensureRole(request.auth.token?.role) ? request.auth.token.role : null
  const tokenOrganizationId =
    typeof request.auth.token?.organizationId === "string" ? request.auth.token.organizationId : null
  if (tokenRole) {
    return {
      uid: request.auth.uid,
      role: tokenRole,
      organizationId: tokenOrganizationId,
    }
  }

  const snap = await getFirestore().collection("users").doc(request.auth.uid).get()
  const data = snap.exists ? snap.data() : null
  const role = ensureRole(data?.role) ? data.role : null
  return {
    uid: request.auth.uid,
    role,
    organizationId: typeof data?.organizationId === "string" ? data.organizationId : null,
  }
}

async function requireAdmin(request) {
  const caller = await loadCaller(request)
  if (caller.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin role required.")
  }
  return caller
}

function sanitizeClaims(data) {
  const role = ensureRole(data?.role) ? data.role : null
  const organizationId =
    typeof data?.organizationId === "string" && data.organizationId.trim() ? data.organizationId.trim() : null
  if (!role) return null
  return organizationId ? { role, organizationId } : { role }
}

function normalizeNumber(value, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, normalizeNumber(value)))
}

function mapMetricHealth(metrics) {
  const raw = typeof metrics.health === "string" ? metrics.health.toLowerCase() : ""
  if (["ok", "degraded", "down", "stopped"].includes(raw)) return raw
  const cpu = clampPercent(metrics.cpu)
  const ram = clampPercent(metrics.ram)
  if (cpu >= 95 || ram >= 95) return "down"
  if (cpu >= 80 || ram >= 85) return "degraded"
  return "ok"
}

function prioritySlaHours(priority) {
  switch (priority) {
    case "Urgente":
      return { responseHours: 1, resolveHours: 8 }
    case "Haute":
      return { responseHours: 4, resolveHours: 24 }
    case "Normale":
      return { responseHours: 12, resolveHours: 72 }
    case "Basse":
      return { responseHours: 24, resolveHours: 120 }
    default:
      return { responseHours: 12, resolveHours: 72 }
  }
}

async function createNotification(db, input) {
  const payload = {
    title: input.title || "Notification",
    message: input.message || "",
    icon: input.icon || "notifications",
    color: input.color || "text-blue-600",
    read: false,
    link: input.link || null,
    userId: input.userId || null,
    organizationId: input.organizationId || null,
    kind: input.kind || "system",
    createdAt: FieldValue.serverTimestamp(),
  }
  await db.collection("notifications").add(payload)
}

exports.createManagedUser = onCall({ cors: true }, async (request) => {
  await requireAdmin(request)

  const email = typeof request.data?.email === "string" ? request.data.email.trim().toLowerCase() : ""
  const name =
    typeof request.data?.name === "string" && request.data.name.trim()
      ? request.data.name.trim()
      : "Utilisateur"
  const role = typeof request.data?.role === "string" ? request.data.role.trim() : ""
  const organizationId =
    typeof request.data?.organizationId === "string" && request.data.organizationId.trim()
      ? request.data.organizationId.trim()
      : null
  const phone =
    typeof request.data?.phone === "string" && request.data.phone.trim()
      ? request.data.phone.trim()
      : null
  const requestedPassword =
    typeof request.data?.password === "string" && request.data.password.trim()
      ? request.data.password.trim()
      : null

  if (!email) throw new HttpsError("invalid-argument", "email is required")
  if (!ensureRole(role)) throw new HttpsError("invalid-argument", "invalid role")

  const db = getFirestore()
  const auth = getAuth()

  let uid
  let created = false
  let password = null

  try {
    const existing = await auth.getUserByEmail(email)
    uid = existing.uid
    await auth.updateUser(uid, { displayName: name, ...(requestedPassword ? { password: requestedPassword } : {}) })
  } catch (err) {
    if (err?.code === "auth/user-not-found") {
      password = requestedPassword || randomBytes(18).toString("base64url")
      const user = await auth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: false,
      })
      uid = user.uid
      created = true
    } else {
      throw new HttpsError("internal", err instanceof Error ? err.message : String(err))
    }
  }

  await db.collection("users").doc(uid).set(
    {
      name,
      email,
      role,
      organizationId,
      initials: deriveInitials(name, email),
      avatarColor: pickAvatarColor(uid),
      accountType: "other",
      phone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  await auth.setCustomUserClaims(uid, sanitizeClaims({ role, organizationId }) || { role })

  return { uid, created, password }
})

exports.setManagedUserPassword = onCall({ cors: true }, async (request) => {
  await requireAdmin(request)

  const uid = typeof request.data?.uid === "string" ? request.data.uid.trim() : ""
  const password = typeof request.data?.password === "string" ? request.data.password.trim() : ""
  if (!uid) throw new HttpsError("invalid-argument", "uid is required")
  if (!password) throw new HttpsError("invalid-argument", "password is required")

  await getAuth().updateUser(uid, { password })
  return { ok: true }
})

exports.deleteManagedUser = onCall({ cors: true }, async (request) => {
  await requireAdmin(request)
  const uid = typeof request.data?.uid === "string" ? request.data.uid.trim() : ""
  if (!uid) throw new HttpsError("invalid-argument", "uid is required")

  const db = getFirestore()
  await db.collection("users").doc(uid).delete()
  await getAuth().deleteUser(uid)
  return { ok: true }
})

exports.createOrganizationInvite = onCall({ cors: true }, async (request) => {
  const caller = await requireAdmin(request)
  const db = getFirestore()

  const email = typeof request.data?.email === "string" ? request.data.email.trim().toLowerCase() : ""
  const organizationId =
    typeof request.data?.organizationId === "string" ? request.data.organizationId.trim() : ""
  const role = typeof request.data?.role === "string" ? request.data.role.trim() : "client"
  if (!email) throw new HttpsError("invalid-argument", "email is required")
  if (!organizationId) throw new HttpsError("invalid-argument", "organizationId is required")
  if (!ensureRole(role)) throw new HttpsError("invalid-argument", "invalid role")

  const code = randomBytes(24).toString("base64url")
  const ref = await db.collection("organization_invites").add({
    email,
    organizationId,
    role,
    code,
    status: "pending",
    createdByUserId: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  })

  return { id: ref.id, code }
})

exports.acceptOrganizationInvite = onCall({ cors: true }, async (request) => {
  const caller = await loadCaller(request)
  const code = typeof request.data?.code === "string" ? request.data.code.trim() : ""
  if (!code) throw new HttpsError("invalid-argument", "code is required")

  const db = getFirestore()
  const snap = await db.collection("organization_invites").where("code", "==", code).limit(1).get()
  if (snap.empty) throw new HttpsError("not-found", "Invite not found.")
  const inviteDoc = snap.docs[0]
  const invite = inviteDoc.data()
  if (invite.status !== "pending") throw new HttpsError("failed-precondition", "Invite is not pending.")
  if (invite.expiresAt?.toDate && invite.expiresAt.toDate().getTime() < Date.now()) {
    throw new HttpsError("deadline-exceeded", "Invite expired.")
  }

  await db.collection("users").doc(caller.uid).set(
    {
      organizationId: invite.organizationId,
      role: invite.role || "client",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  await inviteDoc.ref.update({
    status: "accepted",
    acceptedByUserId: caller.uid,
    acceptedAt: FieldValue.serverTimestamp(),
  })

  await getAuth().setCustomUserClaims(
    caller.uid,
    sanitizeClaims({ role: invite.role || "client", organizationId: invite.organizationId }) || {},
  )

  return { ok: true, organizationId: invite.organizationId }
})

exports.createAttachmentRecord = onCall({ cors: true }, async (request) => {
  const caller = await loadCaller(request)
  const db = getFirestore()
  const ownerType = typeof request.data?.ownerType === "string" ? request.data.ownerType.trim() : ""
  const ownerId = typeof request.data?.ownerId === "string" ? request.data.ownerId.trim() : ""
  const fileName = typeof request.data?.fileName === "string" ? request.data.fileName.trim() : ""
  const contentType = typeof request.data?.contentType === "string" ? request.data.contentType.trim() : ""
  const storagePath = typeof request.data?.storagePath === "string" ? request.data.storagePath.trim() : ""
  const organizationId =
    typeof request.data?.organizationId === "string" ? request.data.organizationId.trim() : caller.organizationId

  if (!ownerType || !ownerId || !fileName || !storagePath) {
    throw new HttpsError("invalid-argument", "ownerType, ownerId, fileName and storagePath are required")
  }
  if (!isStaffRole(caller.role) && organizationId !== caller.organizationId) {
    throw new HttpsError("permission-denied", "Cannot attach files outside your organization.")
  }

  const ref = await db.collection("attachments").add({
    ownerType,
    ownerId,
    fileName,
    contentType,
    storagePath,
    organizationId,
    uploadedByUserId: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  return { id: ref.id }
})

exports.submitBaridiMobPayment = onCall({ cors: true }, async (request) => {
  const caller = await loadCaller(request)
  const invoiceId = typeof request.data?.invoiceId === "string" ? request.data.invoiceId.trim() : ""
  if (!invoiceId) throw new HttpsError("invalid-argument", "invoiceId is required")

  const db = getFirestore()
  const invoiceRef = db.collection("invoices").doc(invoiceId)
  const receiptReference = `BM-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(4).toString("hex").toUpperCase()}`
  const paidAtIso = new Date().toISOString()
  let invoice = null

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(invoiceRef)
    if (!snap.exists) throw new HttpsError("not-found", "Invoice not found.")

    invoice = snap.data()
    const invoiceOrgId = typeof invoice.organizationId === "string" ? invoice.organizationId : null
    const canPayInvoice =
      caller.role === "admin" || (caller.role === "client" && invoiceOrgId && invoiceOrgId === caller.organizationId)
    if (!canPayInvoice) {
      throw new HttpsError("permission-denied", "Cannot pay an invoice outside your organization.")
    }
    if (invoice.status === "Payée") {
      throw new HttpsError("failed-precondition", "Invoice is already paid.")
    }
    if (!["En attente", "En retard"].includes(invoice.status)) {
      throw new HttpsError("failed-precondition", "Invoice is not payable.")
    }

    tx.update(invoiceRef, {
      status: "Payée",
      paymentMethod: "BaridiMob",
      paymentProvider: "BaridiMob",
      paidAt: FieldValue.serverTimestamp(),
      paidByUserId: caller.uid,
      paymentReceipt: {
        provider: "BaridiMob",
        reference: receiptReference,
        amount: normalizeNumber(invoice.amount, 0),
        submittedAt: FieldValue.serverTimestamp(),
        submittedByUserId: caller.uid,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  await createNotification(db, {
    title: "Paiement BaridiMob reçu",
    message: `Facture ${invoiceId.slice(0, 8).toUpperCase()} payée via BaridiMob.`,
    icon: "payments",
    color: "text-emerald-600",
    organizationId: invoice?.organizationId || caller.organizationId || null,
    kind: "payment",
    link: "/admin/invoices",
  })

  return { ok: true, receiptReference, paidAtIso }
})

exports.ingestDeploymentMetrics = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST required" })
    return
  }

  const expected = process.env.ROUDI_INGEST_TOKEN || process.env.VPS_INGEST_TOKEN || ""
  const provided = req.get("x-roudi-agent-token") || req.query.token || ""
  if (!expected || provided !== expected) {
    res.status(401).json({ ok: false, error: "invalid token" })
    return
  }

  const body = typeof req.body === "object" && req.body ? req.body : {}
  const deploymentId = typeof body.deploymentId === "string" ? body.deploymentId.trim() : ""
  if (!deploymentId) {
    res.status(400).json({ ok: false, error: "deploymentId is required" })
    return
  }

  const metrics = body.metrics && typeof body.metrics === "object" ? body.metrics : body
  const now = FieldValue.serverTimestamp()
  const cpu = clampPercent(metrics.cpu)
  const ram = clampPercent(metrics.ram)
  const disk = clampPercent(metrics.disk)
  const requests = normalizeNumber(metrics.requestsPerMinute ?? metrics.requests, 0)
  const health = mapMetricHealth(metrics)

  const runtime = {
    host: typeof body.host === "string" ? body.host : null,
    uptimeSeconds: normalizeNumber(metrics.uptimeSeconds, 0),
    loadAverage: Array.isArray(metrics.loadAverage) ? metrics.loadAverage.slice(0, 3).map(Number) : [],
    disk,
    runningProjects: Array.isArray(body.runningProjects) ? body.runningProjects.slice(0, 50) : [],
    collectedAt: now,
  }

  const db = getFirestore()
  const deploymentRef = db.collection("deployments").doc(deploymentId)
  await deploymentRef.set(
    {
      cpu,
      ram,
      disk,
      requests,
      health,
      runtime,
      agentLastSeenAt: now,
      updatedAt: now,
    },
    { merge: true },
  )
  await deploymentRef.collection("metrics").add({
    cpu,
    ram,
    disk,
    requests,
    health,
    runtime,
    createdAt: now,
  })

  res.status(200).json({ ok: true, health })
})

exports.syncUserClaims = onDocumentWritten("users/{uid}", async (event) => {
  const after = event.data?.after
  if (!after?.exists) {
    await getAuth().setCustomUserClaims(event.params.uid, null)
    return
  }
  const claims = sanitizeClaims(after.data())
  if (!claims) return
  await getAuth().setCustomUserClaims(event.params.uid, claims)
})

exports.applySupportTicketSla = onDocumentWritten("support_tickets/{ticketId}", async (event) => {
  const after = event.data?.after
  if (!after?.exists) return
  const before = event.data?.before
  const ticket = after.data()
  if (!ticket) return

  const priorityChanged = !before?.exists || before.data()?.priority !== ticket.priority
  const missingSla = !ticket.sla || !ticket.firstResponseDueAt || !ticket.resolveDueAt
  if (!priorityChanged && !missingSla) return

  const createdAt = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date()
  const sla = prioritySlaHours(ticket.priority)
  await after.ref.set(
    {
      sla,
      firstResponseDueAt: new Date(createdAt.getTime() + sla.responseHours * 60 * 60 * 1000),
      resolveDueAt: new Date(createdAt.getTime() + sla.resolveHours * 60 * 60 * 1000),
      escalationStatus: "normal",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
})

exports.writeServerAuditLog = onDocumentWritten("{collectionId}/{docId}", async (event) => {
  const { collectionId, docId } = event.params
  const ignored = new Set(["activity_events", "notifications"])
  if (ignored.has(collectionId)) return

  const beforeExists = Boolean(event.data?.before?.exists)
  const afterExists = Boolean(event.data?.after?.exists)
  if (!beforeExists && !afterExists) return

  const action = beforeExists && afterExists ? "update" : afterExists ? "create" : "delete"
  const after = afterExists ? event.data.after.data() : null
  const before = beforeExists ? event.data.before.data() : null
  const organizationId = after?.organizationId || before?.organizationId || null

  await getFirestore().collection("activity_events").add({
    title: `${action} ${collectionId}/${docId}`,
    category: collectionId,
    action,
    path: `${collectionId}/${docId}`,
    organizationId,
    source: "server",
    createdAt: FieldValue.serverTimestamp(),
  })
})
