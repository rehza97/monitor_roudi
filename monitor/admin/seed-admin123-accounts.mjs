import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

process.env.FIREBASE_ADMIN_QUIET = "1"
const { default: admin } = await import("./init.mjs")

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CREDENTIALS_FILE = path.join(__dirname, ".seed-admin123-credentials.json")
const PASSWORD = "admin123"

const seedUsers = [
  { name: "Amine Bensalem", email: "admin@roudi.dz", role: "admin", organizationId: null, phone: "+213550100101" },
  { name: "Sonia Benali", email: "ops.admin@roudi.dz", role: "admin", organizationId: null, phone: "+213550100102" },
  { name: "Nadia Khelifa", email: "nadia.khelifa@sonatrach.dz", role: "client", organizationId: "org-sonatrach", phone: "+213550200101" },
  { name: "Yacine Merabet", email: "yacine.merabet@cevital.dz", role: "client", organizationId: "org-cevital", phone: "+213550200102" },
  { name: "Lila Bouzid", email: "lila.bouzid@condor.dz", role: "client", organizationId: "org-condor", phone: "+213550200103" },
  { name: "Karim Touati", email: "karim.touati@roudi.dz", role: "engineer", organizationId: null, phone: "+213550300101" },
  { name: "Meriem Ait Ouali", email: "meriem.aitouali@roudi.dz", role: "engineer", organizationId: null, phone: "+213550300102" },
  { name: "Samir Charef", email: "samir.charef@roudi.dz", role: "technician", organizationId: null, phone: "+213550400101" },
  { name: "Ines Boulahbel", email: "ines.boulahbel@roudi.dz", role: "technician", organizationId: null, phone: "+213550400102" },
]

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

function splitEmail(email) {
  const at = email.indexOf("@")
  return [email.slice(0, at), email.slice(at + 1)]
}

async function resolveAvailableEmail(auth, preferredEmail) {
  try {
    await auth.getUserByEmail(preferredEmail)
  } catch (err) {
    if (err?.code === "auth/user-not-found") {
      return { email: preferredEmail, usedAlternative: false }
    }
    throw err
  }

  const [local, domain] = splitEmail(preferredEmail)
  let i = 1
  while (i <= 1000) {
    const candidate = `${local}.new${i}@${domain}`
    try {
      await auth.getUserByEmail(candidate)
      i += 1
    } catch (err) {
      if (err?.code === "auth/user-not-found") {
        return { email: candidate, usedAlternative: true }
      }
      throw err
    }
  }

  throw new Error(`Could not find available email variant for ${preferredEmail}`)
}

async function main() {
  const auth = admin.auth()
  const db = admin.firestore()
  const created = []

  for (const user of seedUsers) {
    const { email, usedAlternative } = await resolveAvailableEmail(auth, user.email.trim().toLowerCase())

    const createdUser = await auth.createUser({
      email,
      password: PASSWORD,
      displayName: user.name,
      emailVerified: true,
    })

    await db.collection("users").doc(createdUser.uid).set(
      {
        name: user.name,
        email,
        role: user.role,
        organizationId: user.organizationId,
        accountType: "other",
        phone: user.phone,
        initials: deriveInitials(user.name, email),
        avatarColor: pickAvatarColor(createdUser.uid),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    created.push({
      name: user.name,
      role: user.role,
      email,
      password: PASSWORD,
      preferredEmail: user.email,
      usedAlternative,
      uid: createdUser.uid,
    })
  }

  const out = {
    createdAt: new Date().toISOString(),
    count: created.length,
    passwordPolicy: "All seeded users in this run use admin123",
    users: created,
  }

  fs.writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(out, null, 2)}\n`, "utf8")
  console.log(`Created ${created.length} users`) 
  console.log(`Credentials written to ${CREDENTIALS_FILE}`)
  console.log(JSON.stringify(out, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
