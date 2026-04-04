/**
 * Creates a Firebase Auth user + Firestore users/{uid} with role "admin".
 * ADMIN_EMAIL must be @gmail.com.
 *
 * Usage (from monitor/):
 *   ADMIN_EMAIL=you@gmail.com ADMIN_PASSWORD='secure-pass' npm run admin:create-default
 *
 * Credentials: admin/init.mjs uses serviceAccountKey.json if present, else Application
 * Default Credentials (gcloud auth application-default login). If Auth returns 403,
 * either add admin/serviceAccountKey.json from GCP, or grant your Google user
 * Service Usage Consumer on the Firebase project, then:
 *   gcloud auth application-default set-quota-project roudi-monitor-app
 *
 * New user without ADMIN_PASSWORD: random password generated and saved to
 * admin/.default-admin-credentials.json (gitignored).
 *
 * Existing user without ADMIN_PASSWORD: Firestore profile updated only; password unchanged.
 */
import { randomBytes } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

process.env.FIREBASE_ADMIN_QUIET = "1"
const { default: admin } = await import("./init.mjs")

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const USERS_COLLECTION = "users"
const CREDENTIALS_FILE = path.join(__dirname, ".default-admin-credentials.json")

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

async function main() {
  const emailRaw = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const displayName = (process.env.ADMIN_NAME ?? "Administrateur").trim()
  const passwordFromEnv = process.env.ADMIN_PASSWORD?.trim() ?? ""

  if (!emailRaw) {
    console.error("Set ADMIN_EMAIL to your Gmail address, e.g. ADMIN_EMAIL=you@gmail.com")
    process.exit(1)
  }

  if (!emailRaw.endsWith("@gmail.com")) {
    console.error("ADMIN_EMAIL must be a @gmail.com address.")
    process.exit(1)
  }

  const email = emailRaw
  const auth = admin.auth()
  const db = admin.firestore()

  let uid
  let created = false
  /** Plaintext password to record in local file (only when known). */
  let passwordForFile

  try {
    const existing = await auth.getUserByEmail(email)
    uid = existing.uid
    const updates = { displayName }
    if (passwordFromEnv) {
      updates.password = passwordFromEnv
      passwordForFile = passwordFromEnv
      console.log("User already existed; password and display name updated.")
    } else {
      console.log("User already existed; display name updated. Password unchanged (set ADMIN_PASSWORD to rotate).")
    }
    await auth.updateUser(uid, updates)
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      const password = passwordFromEnv || generatePassword()
      if (!passwordFromEnv) {
        console.log("No ADMIN_PASSWORD — generated a random password (saved locally).")
      }
      const user = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      })
      uid = user.uid
      created = true
      passwordForFile = password
      console.log("Created new Firebase Auth user.")
    } else {
      throw e
    }
  }

  const name = displayName
  const profile = {
    name,
    email,
    role: "admin",
    initials: deriveInitials(name, email),
    avatarColor: pickAvatarColor(uid),
    accountType: "other",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  await db.collection(USERS_COLLECTION).doc(uid).set(profile, { merge: true })
  console.log(`Firestore users/${uid} set with role "admin".`)

  const saved = {
    email,
    uid,
    displayName: name,
    role: "admin",
    created,
    savedAt: new Date().toISOString(),
    note: "Keep this file secret. Do not commit. Rotate the password after first login if this file was ever shared.",
  }

  if (passwordForFile) {
    saved.password = passwordForFile
  } else {
    saved.passwordNote =
      "Password not changed or not set in this run. Use Firebase Console or ADMIN_PASSWORD on next run to set one."
  }

  fs.writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(saved, null, 2)}\n`, "utf8")
  console.log(`Credentials written to ${CREDENTIALS_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
