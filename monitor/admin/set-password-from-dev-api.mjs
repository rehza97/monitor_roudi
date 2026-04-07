/**
 * Dev-only helper: update Firebase Auth user password.
 * Input: JSON on stdin { uid, password }
 * Output: JSON on stdout.
 */
process.env.FIREBASE_ADMIN_QUIET = "1"
const { default: admin } = await import("./init.mjs")

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
  const uid = typeof parsed.uid === "string" ? parsed.uid.trim() : ""
  const password = typeof parsed.password === "string" ? parsed.password.trim() : ""

  if (!uid) {
    out({ ok: false, error: "uid is required" })
    process.exit(1)
  }
  if (!password) {
    out({ ok: false, error: "password is required" })
    process.exit(1)
  }

  await admin.auth().updateUser(uid, { password })
  out({ ok: true })
} catch (err) {
  out({
    ok: false,
    error: err instanceof Error ? err.message : String(err),
  })
  process.exit(1)
}
