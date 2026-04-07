/**
 * Dev-only helper: create/update Firebase Auth user + Firestore users/{uid} profile.
 * Input: JSON on stdin { email, name, role, organizationId? }
 * Output: JSON on stdout.
 */
import { randomBytes } from "node:crypto"

process.env.FIREBASE_ADMIN_QUIET = "1"
const { default: admin } = await import("./init.mjs")

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

function generatePassword() {
  return randomBytes(18).toString("base64url")
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => {
      data += chunk
    })
    process.stdin.on("end", () => resolve(data))
    process.stdin.on("error", reject)
  })
}

function out(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

try {
  const raw = await readStdin()
  const parsed = JSON.parse(raw || "{}")

  const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : ""
  const name = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "Utilisateur"
  const role = typeof parsed.role === "string" ? parsed.role.trim() : ""
  const organizationId =
    typeof parsed.organizationId === "string" && parsed.organizationId.trim()
      ? parsed.organizationId.trim()
      : null

  if (!email) {
    out({ ok: false, error: "email is required" })
    process.exit(1)
  }
  if (!role || !["admin", "engineer", "technician", "client"].includes(role)) {
    out({ ok: false, error: "invalid role" })
    process.exit(1)
  }

  const auth = admin.auth()
  const db = admin.firestore()

  let uid
  let created = false
  let password = null

  try {
    const existing = await auth.getUserByEmail(email)
    uid = existing.uid
    await auth.updateUser(uid, { displayName: name })
  } catch (err) {
    if (err?.code === "auth/user-not-found") {
      password = generatePassword()
      const createdUser = await auth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: false,
      })
      uid = createdUser.uid
      created = true
    } else {
      throw err
    }
  }

  const profile = {
    name,
    email,
    role,
    initials: deriveInitials(name, email),
    avatarColor: pickAvatarColor(uid),
    accountType: "other",
    organizationId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  await db.collection("users").doc(uid).set(
    {
      ...profile,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  out({
    ok: true,
    uid,
    role,
    email,
    created,
    password,
  })
} catch (err) {
  out({
    ok: false,
    error: err instanceof Error ? err.message : String(err),
  })
  process.exit(1)
}
