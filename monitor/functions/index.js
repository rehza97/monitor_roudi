const { randomBytes } = require("node:crypto")
const { onCall, HttpsError } = require("firebase-functions/v2/https")
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

exports.createManagedUser = onCall({ cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.")
  }

  const db = getFirestore()
  const callerSnap = await db.collection("users").doc(request.auth.uid).get()
  const callerRole = callerSnap.exists ? callerSnap.data()?.role : null
  if (callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Admin role required.")
  }

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

  return { uid, created, password }
})

exports.setManagedUserPassword = onCall({ cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.")
  }

  const uid = typeof request.data?.uid === "string" ? request.data.uid.trim() : ""
  const password = typeof request.data?.password === "string" ? request.data.password.trim() : ""
  if (!uid) throw new HttpsError("invalid-argument", "uid is required")
  if (!password) throw new HttpsError("invalid-argument", "password is required")

  const db = getFirestore()
  const callerSnap = await db.collection("users").doc(request.auth.uid).get()
  const callerRole = callerSnap.exists ? callerSnap.data()?.role : null
  if (callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Admin role required.")
  }

  await getAuth().updateUser(uid, { password })
  return { ok: true }
})

exports.deleteManagedUser = onCall({ cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.")
  }
  const uid = typeof request.data?.uid === "string" ? request.data.uid.trim() : ""
  if (!uid) throw new HttpsError("invalid-argument", "uid is required")

  const db = getFirestore()
  const callerSnap = await db.collection("users").doc(request.auth.uid).get()
  const callerRole = callerSnap.exists ? callerSnap.data()?.role : null
  if (callerRole !== "admin") {
    throw new HttpsError("permission-denied", "Admin role required.")
  }

  await db.collection("users").doc(uid).delete()
  await getAuth().deleteUser(uid)
  return { ok: true }
})
